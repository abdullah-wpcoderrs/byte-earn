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

function dateOnly(value: Date) {
  return value.toISOString().slice(0, 10);
}

function reconciliationWindow(request: NextRequest, body: Record<string, unknown>) {
  const configuredDays = Number(process.env.ADSTERRA_RECONCILE_DAYS ?? 2);
  const days = Math.min(7, Math.max(1, Number.isFinite(configuredDays) ? Math.floor(configuredDays) : 2));
  const finishDate = String(body.finish_date ?? request.nextUrl.searchParams.get("finish_date") ?? dateOnly(new Date()));
  const finish = new Date(`${finishDate}T00:00:00.000Z`);
  const startDate = String(
    body.start_date ??
      request.nextUrl.searchParams.get("start_date") ??
      dateOnly(new Date(finish.getTime() - (days - 1) * 24 * 60 * 60 * 1000)),
  );
  return { startDate, finishDate };
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
  const body = (await request.json().catch(() => ({}))) as Record<string, unknown>;
  if (Array.isArray(body.stats)) {
    return { rows: body.stats as AdsterraStatsRow[], window: null };
  }

  const endpoint = process.env.ADSTERRA_STATS_ENDPOINT;
  const apiKey = process.env.ADSTERRA_API_KEY;

  if (!endpoint || !apiKey) {
    throw new Error("Adsterra stats endpoint or API key is not configured");
  }

  const window = reconciliationWindow(request, body);
  const endpointUrl = new URL(endpoint);
  endpointUrl.searchParams.set("start_date", window.startDate);
  endpointUrl.searchParams.set("finish_date", window.finishDate);

  const response = await fetch(endpointUrl, {
    headers: {
      Accept: "application/json",
      "X-API-Key": apiKey,
    },
    cache: "no-store",
  });

  if (!response.ok) {
    throw new Error(`Adsterra stats request failed with ${response.status}`);
  }

  return { rows: normalizeStatsRows(await response.json()), window };
}

export async function POST(request: NextRequest) {
  const authorization = request.headers.get("authorization");
  const bearerSecret = authorization?.startsWith("Bearer ") ? authorization.slice(7) : null;
  const secret = request.headers.get("x-reconcile-secret") ?? bearerSecret ?? request.nextUrl.searchParams.get("secret");
  const expectedSecret = process.env.ADSTERRA_RECONCILE_SECRET ?? process.env.CRON_SECRET;
  if (!expectedSecret || secret !== expectedSecret) {
    return NextResponse.json({ error: "Invalid reconcile secret" }, { status: 403 });
  }

  let statsRows: AdsterraStatsRow[];
  let window: { startDate: string; finishDate: string } | null = null;
  try {
    const loaded = await loadAdsterraStats(request);
    statsRows = loaded.rows;
    window = loaded.window;
  } catch (error) {
    const message = error instanceof Error ? error.message : "Failed to load Adsterra stats";
    await supabase.from("system_failures").insert({
      category: "adsterra_reconciliation",
      message,
      metadata: JSON.stringify({ retryable: true }),
    });
    await writeSystemAudit("system.adsterra_reconciliation.failed", null, { error: message, retryable: true });
    return NextResponse.json({ error: message, retryable: true }, { status: 500 });
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
    const risk = hasActivity && session.status === "pending" ? await evaluateProviderSessionRisk(supabase, session, { conversionIp, conversionCountry }) : { allowed: true };
    const eventStatus = !risk.allowed ? "suspicious" : hasActivity ? "confirmed" : "no_activity";

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

  const errors = results.filter((result) => result.status === "error").length;
  return NextResponse.json({ success: errors === 0, processed: results.length, errors, window, results });
}
