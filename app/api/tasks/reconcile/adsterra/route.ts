import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { evaluateProviderSessionRisk, markTaskSessionSuspicious } from "@/lib/task-fraud";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type AdsterraStatsRow = {
  placement_sub_id?: string;
  psid?: string;
  clicks?: number | string;
  impressions?: number | string;
  revenue?: number | string;
  money?: number | string;
  currency?: string;
  date?: string;
  stats_date?: string;
  country?: string;
  country_code?: string;
  geo?: string;
  ip?: string;
  ip_address?: string;
  user_ip?: string;
  [key: string]: unknown;
};

function numberValue(value: unknown) {
  const parsed = typeof value === "number" ? value : Number(value ?? 0);
  return Number.isFinite(parsed) ? parsed : 0;
}

function normalizeStatsRows(payload: unknown): AdsterraStatsRow[] {
  if (Array.isArray(payload)) return payload as AdsterraStatsRow[];
  if (payload && typeof payload === "object") {
    const maybeRows = payload as { data?: unknown; items?: unknown; rows?: unknown; stats?: unknown };
    for (const value of [maybeRows.data, maybeRows.items, maybeRows.rows, maybeRows.stats]) {
      if (Array.isArray(value)) return value as AdsterraStatsRow[];
    }
  }
  return [];
}

async function writeSystemAudit(action: string, entityId: string | null, metadata: Record<string, unknown>) {
  await supabase.from("audit_logs").insert({
    action,
    actor_type: "system",
    entity_id: entityId,
    entity_type: "task_session",
    metadata: JSON.stringify(metadata),
  });
}

async function loadAdsterraStats(request: NextRequest) {
  const body = await request.json().catch(() => ({}));
  if (Array.isArray(body?.stats)) {
    return body.stats as AdsterraStatsRow[];
  }

  const endpoint = process.env.ADSTERRA_STATS_ENDPOINT;
  const apiKey = process.env.ADSTERRA_API_KEY;

  if (!endpoint || !apiKey) {
    throw new Error("Adsterra stats endpoint or API key is not configured");
  }

  const response = await fetch(endpoint, {
    headers: {
      "Accept": "application/json",
      "X-API-Key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Adsterra stats request failed with ${response.status}`);
  }

  return normalizeStatsRows(await response.json());
}

export async function POST(request: NextRequest) {
  const secret = request.headers.get("x-reconcile-secret") ?? request.nextUrl.searchParams.get("secret");
  if (secret !== process.env.ADSTERRA_RECONCILE_SECRET) {
    return NextResponse.json({ error: "Invalid reconcile secret" }, { status: 403 });
  }

  let statsRows: AdsterraStatsRow[];
  try {
    statsRows = await loadAdsterraStats(request);
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "Failed to load Adsterra stats" }, { status: 500 });
  }

  const results = [];

  for (const row of statsRows) {
    const placementSubId = row.placement_sub_id ?? row.psid;
    if (!placementSubId) continue;

    const clicks = numberValue(row.clicks);
    const impressions = numberValue(row.impressions);
    const revenue = numberValue(row.revenue ?? row.money);
    const statsDate = row.stats_date ?? row.date ?? new Date().toISOString().slice(0, 10);
    const conversionIp = row.ip_address ?? row.user_ip ?? row.ip ?? null;
    const conversionCountry = row.country_code ?? row.country ?? row.geo ?? null;

    const { data: session } = await supabase
      .from("task_sessions")
      .select("id, task_id, profile_id, provider, status, ip_address, country_code")
      .eq("id", placementSubId)
      .eq("provider", "adsterra")
      .maybeSingle();

    if (!session) {
      await writeSystemAudit("system.adsterra_reconciliation.unmatched", placementSubId, { row });
      results.push({ placementSubId, status: "session_not_found" });
      continue;
    }

    const hasActivity = clicks > 0 || revenue > 0;
    let eventStatus = hasActivity ? "confirmed" : "no_activity";
    const risk = hasActivity && session.status === "pending" ? await evaluateProviderSessionRisk(supabase, session, { conversionIp, conversionCountry }) : { allowed: true };
    if (!risk.allowed) eventStatus = "suspicious";

    await supabase.from("sponsored_task_provider_events").upsert(
      {
        provider: "adsterra",
        event_type: "api_reconciliation",
        session_id: session.id,
        task_id: session.task_id,
        profile_id: session.profile_id,
        placement_sub_id: placementSubId,
        reported_clicks: clicks,
        reported_impressions: impressions,
        reported_revenue: revenue,
        currency: row.currency ?? "USD",
        ip_address: conversionIp,
        country_code: conversionCountry?.toUpperCase() ?? null,
        stats_date: statsDate,
        status: eventStatus,
        raw_payload: JSON.stringify(row),
        processed_at: new Date().toISOString(),
      },
      { onConflict: "provider,session_id,stats_date" },
    );

    if (!risk.allowed) {
      await markTaskSessionSuspicious(supabase, session.id, risk.reason ?? "provider_risk", risk.metadata);
      await writeSystemAudit("system.adsterra_reconciliation.suspicious", session.id, { placementSubId, clicks, revenue, risk });
      results.push({ placementSubId, status: "pending_review", risk });
      continue;
    }

    if (session.status !== "pending") {
      await writeSystemAudit("system.adsterra_reconciliation.skipped", session.id, { placementSubId, status: session.status });
      results.push({ placementSubId, status: session.status });
      continue;
    }

    if (!hasActivity) {
      await writeSystemAudit("system.adsterra_reconciliation.no_activity", session.id, { placementSubId, clicks, revenue });
      results.push({ placementSubId, status: "no_activity" });
      continue;
    }

    const { data, error } = await supabase.rpc("complete_sponsored_task_session", {
      session_id_param: session.id,
      provider_event_id_param: `adsterra:${session.id}:${statsDate}`,
      raw_payload_param: JSON.stringify(row),
    });

    results.push({
      placementSubId,
      status: error ? "error" : "rewarded",
      error: error?.message,
      result: data?.[0] ?? null,
    });

    await writeSystemAudit(error ? "system.adsterra_reconciliation.failed" : "system.adsterra_reconciliation.rewarded", session.id, {
      placementSubId,
      clicks,
      revenue,
      error: error?.message,
      result: data?.[0] ?? null,
    });
  }

  return NextResponse.json({ success: true, processed: results.length, results });
}
