"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type TaskProvider } from "@/lib/tasks-data";
import { redirect } from "next/navigation";

export async function startTask(taskId: string, provider: TaskProvider) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("id")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  // Fetch task
  const { data: task } = await supabase
    .from("sponsored_tasks")
    .select("*")
    .eq("id", taskId)
    .single();

  if (!task) throw new Error("Task not found");

  // Enforce limits
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count } = await supabase
    .from("task_sessions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .eq("profile_id", profile.id)
    .eq("status", "completed")
    .gte("completed_at", today.toISOString());

  if (count !== null && count >= task.limit_per_user) {
    throw new Error("Daily limit reached for this task");
  }

  // Create pending session
  const { data: session, error: sessionErr } = await supabase
    .from("task_sessions")
    .insert({
      task_id: taskId,
      profile_id: profile.id,
      provider,
      status: "pending",
    })
    .select("id")
    .single();

  if (sessionErr || !session) {
    throw new Error("Failed to start task session");
  }

  // Generate redirect URL based on provider
  let redirectUrl = task.task_url || "";
  
  if (provider === "cpagrip" || provider === "monetag") {
    // Append the tracking session ID to the URL macro (e.g. subid)
    const urlObj = new URL(redirectUrl);
    urlObj.searchParams.set("subid", session.id);
    redirectUrl = urlObj.toString();
  }

  return { sessionId: session.id, url: redirectUrl };
}

export async function completeInternalTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  // Fetch task
  const { data: task } = await supabase
    .from("sponsored_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("provider", "internal")
    .single();

  if (!task) throw new Error("Task not found");

  // Enforce limits
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count } = await supabase
    .from("task_sessions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .eq("profile_id", user.id)
    .eq("status", "completed")
    .gte("completed_at", today.toISOString());

  if (count !== null && count >= task.limit_per_user) {
    throw new Error("Daily limit reached for this task");
  }

  // Complete session immediately
  const { data: session, error: sessionErr } = await supabase
    .from("task_sessions")
    .insert({
      task_id: taskId,
      profile_id: user.id,
      provider: "internal",
      status: "completed",
      reward_credits: task.reward_credits,
      completed_at: new Date().toISOString()
    })
    .select("id")
    .single();

  if (sessionErr) throw new Error("Failed to record completion");

  // Award credits
  const { error: ledgerErr } = await supabase.from("credit_ledger").insert({
    profile_id: user.id,
    source: "sponsored_task",
    credits: task.reward_credits,
    description: `Completed internal task: ${task.title}`
  });
  
  if (!ledgerErr) {
    // Increment global completions counter
    await supabase.rpc("increment_task_completions", { 
      task_id_param: taskId 
    });
  }

  revalidatePath("/tasks");
  return { success: true, credits: task.reward_credits };
}
