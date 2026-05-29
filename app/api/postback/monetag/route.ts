import { NextRequest, NextResponse } from "next/server";
import { createClient } from "@supabase/supabase-js";

// For server-to-server callbacks, we need a service role client to bypass RLS
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const supabase = createClient(supabaseUrl, supabaseServiceKey);

export async function GET(request: NextRequest) {
  const searchParams = request.nextUrl.searchParams;
  
  // Example Monetag Postback URL:
  // /api/postback/monetag?subid={clickid}&status=converted&secret=YOUR_SECRET
  const subid = searchParams.get("subid"); // task_sessions.id
  const secret = searchParams.get("secret");

  if (secret !== process.env.MONETAG_POSTBACK_SECRET) {
    return NextResponse.json({ error: "Invalid secret" }, { status: 403 });
  }

  if (!subid) {
    return NextResponse.json({ error: "Missing subid" }, { status: 400 });
  }

  // 1. Fetch pending session
  const { data: session } = await supabase
    .from("task_sessions")
    .select("*, sponsored_tasks(reward_credits, limit_per_user, id)")
    .eq("id", subid)
    .eq("status", "pending")
    .single();

  if (!session) {
    return NextResponse.json({ error: "Session not found or already completed" }, { status: 404 });
  }

  const task = session.sponsored_tasks as any;
  const taskId = task.id;
  const rewardCredits = task.reward_credits || 0;
  const limitPerUser = task.limit_per_user || 10;

  // 2. Mark session as completed
  const { error: updateErr } = await supabase
    .from("task_sessions")
    .update({ 
      status: "completed",
      completed_at: new Date().toISOString()
    })
    .eq("id", subid);

  if (updateErr) {
    return NextResponse.json({ error: "Failed to update session" }, { status: 500 });
  }

  // 3. Monetag logic: progress bar. We need to check if they've reached their limit for today.
  // Count how many completed sessions today
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { count } = await supabase
    .from("task_sessions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .eq("profile_id", session.profile_id)
    .eq("status", "completed")
    .gte("completed_at", today.toISOString());

  // Only award credits if this exact completion hits the limit (10)
  if (count === limitPerUser) {
    const { error: ledgerErr } = await supabase.from("credit_ledger").insert({
      profile_id: session.profile_id,
      source: "sponsored_task",
      credits: rewardCredits,
      description: `Completed Monetag Tasks (${limitPerUser}/${limitPerUser})`
    });
    
    if (ledgerErr) {
      console.error("Ledger error for Monetag:", ledgerErr);
    }
  }

  return NextResponse.json({ success: true, count, limitPerUser });
}
