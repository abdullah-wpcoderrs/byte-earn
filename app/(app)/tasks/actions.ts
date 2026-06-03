"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { type TaskProvider } from "@/lib/tasks-data";
import { getPlatformSettings } from "@/lib/platform-settings";
import { headers } from "next/headers";
import { assertRateLimit } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";
import { getTrustedClientIp, getTrustedCountryCode } from "@/lib/request-metadata";
import { getRewardedWatchSecondsToday } from "@/lib/watch-reward-limit";

function createTrustedTaskClient() {
  return createAdminClient();
}

type InternalSessionTask = {
  provider?: string | null;
  task_type?: string | null;
  status?: string | null;
};

function joinedTask(value: unknown): InternalSessionTask | null {
  if (Array.isArray(value)) return (value[0] as InternalSessionTask | undefined) ?? null;
  return (value as InternalSessionTask | null) ?? null;
}

function trackingParamForProvider(provider: TaskProvider, configuredParam?: string | null) {
  if (configuredParam) return configuredParam;
  if (provider === "adsterra") return "psid";
  return "subid";
}

function assertAllowedTaskUrl(provider: TaskProvider, taskUrl: string | null) {
  if (provider === "internal") return;
  if (!taskUrl) throw new Error("Task URL is not configured");

  const url = new URL(taskUrl);
  const hostname = url.hostname.toLowerCase();

  if (provider === "adsterra") {
    const allowed = ["adsterratools.com", "adsterra.com"];
    if (!allowed.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
      throw new Error("Adsterra task URL must use an approved Adsterra domain");
    }
  }

  if (provider === "cpagrip") {
    const allowed = ["cpagrip.com"];
    if (!allowed.some((domain) => hostname === domain || hostname.endsWith(`.${domain}`))) {
      throw new Error("CPAGrip task URL must use an approved CPAGrip domain");
    }
  }
}

function assertDailyWatchRewardLimit({
  currentSessionSeconds = 0,
  limitSeconds,
  watchedTodaySeconds,
}: {
  currentSessionSeconds?: number;
  limitSeconds: number;
  watchedTodaySeconds: number;
}) {
  if (watchedTodaySeconds >= limitSeconds) {
    throw new Error("You have reached today's watch reward limit. Please return tomorrow.");
  }

  if (watchedTodaySeconds + currentSessionSeconds > limitSeconds) {
    throw new Error("Completing this task would exceed today's watch reward limit. Please return tomorrow.");
  }
}

export async function startTask(taskId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const taskDb = createTrustedTaskClient();

  const { data: profile } = await supabase
    .from("profiles")
    .select("id, created_at")
    .eq("id", user.id)
    .single();

  if (!profile) throw new Error("Profile not found");

  const settings = await getPlatformSettings();
  if (!settings.sponsored_tasks_enabled) {
    throw new Error("Sponsored tasks are currently disabled");
  }

  // Fetch only active tasks and trust the database provider.
  const { data: task } = await supabase
    .from("sponsored_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("status", "active")
    .single();

  if (!task) throw new Error("Task not found");

  // Enforce limits
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count } = await taskDb
    .from("task_sessions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .eq("profile_id", profile.id)
    .eq("status", "completed")
    .gte("completed_at", today.toISOString());

  if (count !== null && count >= task.limit_per_user) {
    throw new Error("Daily limit reached for this task");
  }

  if (task.global_cap !== null && (task.completions_count ?? 0) >= task.global_cap) {
    throw new Error("Task limit reached");
  }

  if (task.provider === "internal" && task.task_type === "watch_media") {
    const watchedTodaySeconds = await getRewardedWatchSecondsToday(taskDb, profile.id);
    assertDailyWatchRewardLimit({
      limitSeconds: settings.daily_watch_limit_seconds,
      watchedTodaySeconds,
    });
  }

  assertAllowedTaskUrl(task.provider, task.task_url);

  const requestHeaders = await headers();
  const clientIp = getTrustedClientIp(requestHeaders);
  const countryCode = getTrustedCountryCode(requestHeaders);
  await assertRateLimit(`tasks:start:user:${profile.id}`, 20, 60 * 60 * 1000);
  if (clientIp) await assertRateLimit(`tasks:start:ip:${clientIp}:${taskId}`, 10, 60 * 60 * 1000);

  const accountAgeMs = Date.now() - new Date(profile.created_at).getTime();
  if (accountAgeMs < 24 * 60 * 60 * 1000) {
    const { count: newUserCompletions } = await taskDb
      .from("task_sessions")
      .select("id", { count: "exact", head: true })
      .eq("profile_id", profile.id)
      .eq("status", "completed")
      .gte("completed_at", today.toISOString());

    if (newUserCompletions !== null && newUserCompletions >= 3) {
      throw new Error("New accounts have a temporary sponsored task limit");
    }
  }

  const trackingToken = crypto.randomUUID();
  const pendingExpiresAt = new Date(Date.now() + 2 * 60 * 60 * 1000);

  await taskDb
    .from("task_sessions")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("task_id", taskId)
    .eq("profile_id", profile.id)
    .eq("status", "pending")
    .lt("pending_expires_at", new Date().toISOString());

  const cooldownSince = new Date(Date.now() - 60 * 1000).toISOString();
  const { count: recentStarts } = await taskDb
    .from("task_sessions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .eq("profile_id", profile.id)
    .gte("created_at", cooldownSince);

  if (recentStarts !== null && recentStarts > 0) {
    throw new Error("Please wait before starting this task again");
  }

  const { count: activePending } = await taskDb
    .from("task_sessions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .eq("profile_id", profile.id)
    .eq("status", "pending")
    .gt("pending_expires_at", new Date().toISOString());

  if (activePending !== null && activePending > 0) {
    throw new Error("You already have this task pending verification");
  }

  // Create pending session
  const { data: session, error: sessionErr } = await taskDb
    .from("task_sessions")
    .insert({
      task_id: taskId,
      profile_id: profile.id,
      provider: task.provider,
      status: "pending",
      ip_address: clientIp,
      country_code: countryCode,
      user_agent: requestHeaders.get("user-agent"),
      tracking_token: trackingToken,
      pending_expires_at: pendingExpiresAt.toISOString(),
    })
    .select("id, tracking_token")
    .single();

  if (sessionErr || !session) {
    throw new Error("Failed to start task session");
  }

  // Generate redirect URL based on provider
  let redirectUrl = task.task_url || "";
  
  if (task.provider === "cpagrip" || task.provider === "adsterra") {
    // Provider callbacks and API stats map this ID back to the pending session.
    const urlObj = new URL(redirectUrl);
    urlObj.searchParams.set(trackingParamForProvider(task.provider, task.provider_tracking_param), session.id);
    redirectUrl = urlObj.toString();
  }

  if (task.provider === "internal" && task.task_type === "visit_url") {
    const urlObj = new URL(redirectUrl);
    urlObj.searchParams.set("bt_session", session.id);
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

  const taskDb = createTrustedTaskClient();

  const requestHeaders = await headers();
  const clientIp = getTrustedClientIp(requestHeaders);
  await assertRateLimit(`tasks:internal_submit:user:${user.id}`, 10, 60 * 60 * 1000);
  if (clientIp) await assertRateLimit(`tasks:internal_submit:ip:${clientIp}:${taskId}`, 8, 60 * 60 * 1000);

  // Fetch task
  const { data: task } = await supabase
    .from("sponsored_tasks")
    .select("*")
    .eq("id", taskId)
    .eq("provider", "internal")
    .eq("status", "active")
    .single();

  if (!task) throw new Error("Task not found");

  // Enforce limits
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  
  const { count } = await taskDb
    .from("task_sessions")
    .select("id", { count: "exact", head: true })
    .eq("task_id", taskId)
    .eq("profile_id", user.id)
    .eq("status", "completed")
    .gte("completed_at", today.toISOString());

  if (count !== null && count >= task.limit_per_user) {
    throw new Error("Daily limit reached for this task");
  }

  if (task.task_type === "watch_media") {
    throw new Error("Watch media rewards must be verified by watch milestones");
  }

  if (task.task_type === "visit_url") {
    throw new Error("Visit rewards must be verified through a tracked visit session");
  }

  // Internal tasks require review or tracked validation before credits are issued.
  const { data: session, error: sessionErr } = await taskDb
    .from("task_sessions")
    .insert({
      task_id: taskId,
      profile_id: user.id,
      provider: "internal",
      status: "pending",
      ip_address: clientIp,
      country_code: getTrustedCountryCode(requestHeaders),
      user_agent: requestHeaders.get("user-agent"),
      tracking_token: crypto.randomUUID(),
      pending_expires_at: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000).toISOString(),
    })
    .select("id")
    .single();

  if (sessionErr || !session) throw new Error("Failed to submit task for review");

  await taskDb.from("sponsored_task_provider_events").insert({
    provider: "internal",
    event_type: task.task_type ?? "manual_review",
    session_id: session.id,
    task_id: taskId,
    profile_id: user.id,
    status: "pending_review",
    raw_payload: JSON.stringify({ taskType: task.task_type ?? "manual_review" }),
  });

  revalidatePath("/tasks");
  return { success: true, credits: 0, status: "pending_review" };
}

export async function completeInternalVisitTask(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const taskDb = createTrustedTaskClient();

  const { data: session } = await taskDb
    .from("task_sessions")
    .select("id, profile_id, status, created_at, pending_expires_at, sponsored_tasks(provider, task_type, status)")
    .eq("id", sessionId)
    .eq("profile_id", user.id)
    .eq("status", "pending")
    .single();

  if (!session) throw new Error("Visit session not found");

  const task = joinedTask(session.sponsored_tasks);
  if (task?.provider !== "internal" || task?.task_type !== "visit_url" || task?.status !== "active") {
    throw new Error("Invalid visit task session");
  }

  if (session.pending_expires_at && new Date(session.pending_expires_at).getTime() <= Date.now()) {
    throw new Error("This visit session has expired. Please start the task again.");
  }

  const elapsedMs = Date.now() - new Date(session.created_at).getTime();
  if (elapsedMs < 30_000) {
    throw new Error("Please stay on the campaign page for at least 30 seconds");
  }

  const { data, error } = await taskDb.rpc("complete_sponsored_task_session", {
    session_id_param: sessionId,
    provider_event_id_param: `internal-visit:${sessionId}`,
    raw_payload_param: JSON.stringify({ elapsedSeconds: Math.floor(elapsedMs / 1000) }),
  });

  if (error) throw new Error(error.message);

  revalidatePath("/tasks");
  return { success: true, result: data?.[0] ?? null };
}

export async function completeInternalWatchTask(sessionId: string) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Unauthorized");
  }

  const taskDb = createTrustedTaskClient();

  const { data: session } = await taskDb
    .from("task_sessions")
    .select("id, profile_id, status, created_at, pending_expires_at, sponsored_tasks(provider, task_type, status)")
    .eq("id", sessionId)
    .eq("profile_id", user.id)
    .eq("status", "pending")
    .single();

  if (!session) throw new Error("Watch session not found");

  const task = joinedTask(session.sponsored_tasks);
  if (task?.provider !== "internal" || task?.task_type !== "watch_media" || task?.status !== "active") {
    throw new Error("Invalid watch task session");
  }

  if (session.pending_expires_at && new Date(session.pending_expires_at).getTime() <= Date.now()) {
    throw new Error("This watch session has expired. Please start the task again.");
  }

  const requestHeaders = await headers();
  const clientIp = getTrustedClientIp(requestHeaders);
  await assertRateLimit(`tasks:watch:user:${user.id}`, 10, 60 * 60 * 1000);

  if (clientIp) await assertRateLimit(`tasks:watch:ip:${clientIp}:${sessionId}`, 8, 60 * 60 * 1000);

  const elapsedMs = Date.now() - new Date(session.created_at).getTime();
  if (elapsedMs < 30_000) {
    throw new Error("Please watch for at least 30 seconds before completing this task");
  }

  const settings = await getPlatformSettings();
  const watchedTodaySeconds = await getRewardedWatchSecondsToday(taskDb, user.id);
  assertDailyWatchRewardLimit({
    currentSessionSeconds: Math.floor(elapsedMs / 1000),
    limitSeconds: settings.daily_watch_limit_seconds,
    watchedTodaySeconds,
  });

  const { data, error } = await taskDb.rpc("complete_sponsored_task_session", {
    session_id_param: session.id,
    provider_event_id_param: `internal-watch:${session.id}`,
    raw_payload_param: JSON.stringify({ elapsedSeconds: Math.floor(elapsedMs / 1000) }),
  });

  if (error) throw new Error(error.message);

  revalidatePath("/tasks");
  return { success: true, result: data?.[0] ?? null };
}
