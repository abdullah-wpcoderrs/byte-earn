import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// For server-to-server callbacks, we need a service role client to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Example CPAGrip Postback URL: 
  // /api/postback/cpagrip?subid={subid}&status=1&secret=YOUR_SECRET
  const subid = searchParams.get("subid"); // This is our task_sessions.id
  const status = searchParams.get("status");
  const secret = searchParams.get("secret");

  if (secret !== process.env.CPAGRIP_POSTBACK_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
  }

  if (status !== "1") {
    // Lead not complete or rejected
    return NextResponse.json({ message: "Status not complete" });
  }

  if (!subid) {
    return NextResponse.json({ error: "Missing subid" }, { status: 400 });
  }

  // 1. Fetch pending session
  const { data: session } = await supabase
    .from("task_sessions")
    .select("*, sponsored_tasks(reward_credits)")
    .eq("id", subid)
    .eq("status", "pending")
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found or already completed" }, { status: 404 });
  }

  const rewardCredits = (session.sponsored_tasks as any).reward_credits || 0;

  // 2. Mark session as completed
  const { error: updateErr } = await supabase
    .from("task_sessions")
    .update({ 
      status: "completed", 
      reward_credits: rewardCredits,
      completed_at: new Date().toISOString()
    })
    .eq("id", subid);

  if (updateErr) {
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }

  // 3. Award credits
  const { error: ledgerErr } = await supabase.from("credit_ledger").insert({
    profile_id: session.profile_id,
    source: "sponsored_task",
    credits: rewardCredits,
    description: `Completed CPAGrip Task`
  });

  if (ledgerErr) {
    console.error("Ledger error for CPAGrip:", ledgerErr);
  }

  return NextResponse.json({ success: true });
}
