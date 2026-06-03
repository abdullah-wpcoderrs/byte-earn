import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { evaluateProviderSessionRisk, markTaskSessionSuspicious } from "@/lib/task-fraud";

// For server-to-server callbacks, we need a service role client to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

type SessionTask = {
  provider?: string | null;
  provider_placement_id?: string | null;
  status?: string | null;
};

function firstParam(searchParams: URLSearchParams, names: string[]) {
  for (const name of names) {
    const value = searchParams.get(name)?.trim();
    if (value) return value;
  }
  return null;
}

function joinedTask(value: unknown): SessionTask | null {
  if (Array.isArray(value)) return (value[0] as SessionTask | undefined) ?? null;
  return (value as SessionTask | null) ?? null;
}

function valuesMatch(incoming: string | null, expected: string | null | undefined) {
  return Boolean(incoming && expected && incoming.trim() === expected.trim());
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

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Accept common CPAGrip/tracker aliases until dashboard macros are finalized.
  const subid = firstParam(searchParams, ["subid", "tracking_id", "cid"]);
  const status = firstParam(searchParams, ["status"]);
  const secret = firstParam(searchParams, ["secret", "password"]);
  const providerEventId = firstParam(searchParams, ["conversion_id", "lead_id", "transaction_id"]);
  const providerOfferId = firstParam(searchParams, ["offer_id", "campaign_id"]);
  const payoutAmount = firstParam(searchParams, ["payout"]);
  const conversionIp = firstParam(searchParams, ["conversion_ip", "user_ip", "ip_address", "ip"]);
  const conversionCountry = firstParam(searchParams, ["country_code", "country", "geo"]);
  const rawPayload = JSON.stringify(Object.fromEntries(searchParams.entries()));

  if (secret !== process.env.CPAGRIP_POSTBACK_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
  }

  if (!subid) {
    return NextResponse.json({ error: "Missing subid" }, { status: 400 });
  }

  if (providerEventId) {
    const { data: existingEvent } = await supabase
      .from("sponsored_task_provider_events")
      .select("id, status")
      .eq("provider", "cpagrip")
      .eq("provider_event_id", providerEventId)
      .maybeSingle();

    if (existingEvent) {
      await writeSystemAudit("system.cpagrip_postback.duplicate", subid, { providerEventId, status: existingEvent.status });
      return NextResponse.json({ success: true, duplicate: true, status: existingEvent.status });
    }
  }

  const { data: session } = await supabase
    .from("task_sessions")
    .select("id, task_id, profile_id, provider, status, ip_address, country_code, sponsored_tasks(provider, status, provider_placement_id)")
    .eq("id", subid)
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found" }, { status: 404 });
  }

  const sessionRow = session;
  const task = joinedTask(sessionRow.sponsored_tasks);

  async function recordProviderEvent(eventStatus: string) {
    await supabase.from("sponsored_task_provider_events").insert({
      provider: "cpagrip",
      event_type: "postback",
      provider_event_id: providerEventId,
      provider_offer_id: providerOfferId,
      session_id: sessionRow.id,
      task_id: sessionRow.task_id,
      profile_id: sessionRow.profile_id,
      payout_amount: payoutAmount,
      ip_address: conversionIp,
      country_code: conversionCountry?.toUpperCase() ?? null,
      status: eventStatus,
      raw_payload: rawPayload,
      processed_at: new Date().toISOString(),
    });
  }

  async function sendToReview(reason: string, metadata: Record<string, unknown>) {
    await recordProviderEvent("suspicious");
    await markTaskSessionSuspicious(supabase, sessionRow.id, reason, metadata);
    await writeSystemAudit("system.cpagrip_postback.suspicious", sessionRow.id, {
      providerEventId,
      providerOfferId,
      reason,
      ...metadata,
    });
    return NextResponse.json({ success: true, status: "pending_review" });
  }

  if (status !== "1") {
    await recordProviderEvent("rejected");

    await supabase.from("task_sessions").update({ status: "rejected", updated_at: new Date().toISOString() }).eq("id", subid).eq("status", "pending");
    await writeSystemAudit("system.cpagrip_postback.rejected", sessionRow.id, { providerEventId, providerOfferId, status });
    return NextResponse.json({ success: true, status: "rejected" });
  }

  if (sessionRow.provider !== "cpagrip" || task?.provider !== "cpagrip") {
    return sendToReview("provider_session_mismatch", { sessionProvider: sessionRow.provider, taskProvider: task?.provider ?? null });
  }

  if (!providerEventId) {
    return sendToReview("missing_provider_event_id", { providerOfferId });
  }

  if (!valuesMatch(providerOfferId, task.provider_placement_id)) {
    return sendToReview("provider_campaign_mismatch", {
      providerOfferId,
      expectedOfferId: task.provider_placement_id ?? null,
    });
  }

  const risk = await evaluateProviderSessionRisk(supabase, sessionRow, { conversionIp, conversionCountry });
  if (!risk.allowed) {
    await recordProviderEvent("suspicious");
    await markTaskSessionSuspicious(supabase, sessionRow.id, risk.reason ?? "provider_risk", risk.metadata);
    await writeSystemAudit("system.cpagrip_postback.suspicious", sessionRow.id, { providerEventId, providerOfferId, risk });
    return NextResponse.json({ success: true, status: "pending_review" });
  }

  const { data, error } = await supabase.rpc("complete_sponsored_task_session", {
    session_id_param: subid,
    provider_event_id_param: providerEventId,
    raw_payload_param: rawPayload,
  });

  if (error) {
    console.error("CPAGrip completion error:", error);
    await writeSystemAudit("system.cpagrip_postback.failed", subid, { error: error.message, providerEventId });
    return NextResponse.json({ error: error.message }, { status: 500 });
  }

  await writeSystemAudit("system.cpagrip_postback.rewarded", subid, { providerEventId, providerOfferId, result: data?.[0] ?? null });
  return NextResponse.json({ success: true, result: data?.[0] ?? null });
}
