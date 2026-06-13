import "server-only";

import { createClient } from "@/lib/supabase/server";

export type TaskProvider = "monetag" | "adsterra" | "cpagrip" | "internal";

export type SponsoredTask = {
  id: string;
  provider: TaskProvider;
  taskType: string;
  title: string;
  description: string | null;
  mediaUrl: string | null;
  taskUrl: string | null;
  rewardCredits: number;
  limitPerUser: number;
  completionsCount: number;
};

export type TaskProgress = {
  taskId: string;
  completedToday: number;
};

export type TaskSessionSummary = {
  completedToday: number;
  pending: number;
  suspicious: number;
  rejectedToday: number;
  latestPendingSessionId: string | null;
};

export type UserTaskBackendSummary = {
  activeTaskCount: number;
  completedToday: number;
  lifetimeCompleted: number;
  lifetimeSponsoredCredits: number;
  pending: number;
  rejectedToday: number;
  suspicious: number;
  totalAvailableTaskCredits: number;
};

export type UserVisibleRewardRule = {
  action: string;
  credits: number;
  enabled: boolean;
  label: string;
};

export async function getActiveTasks() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("sponsored_tasks")
    .select("*")
    .eq("status", "active")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tasks:", error);
    return [];
  }

  return data.map((t) => ({
    id: t.id,
    provider: t.provider as TaskProvider,
    taskType: t.task_type ?? "smartlink",
    title: t.title,
    description: t.description,
    mediaUrl: t.media_url,
    taskUrl: t.task_url,
    rewardCredits: t.reward_credits,
    limitPerUser: t.limit_per_user,
    completionsCount: t.completions_count,
  })) as SponsoredTask[];
}

export async function getUserTaskProgress(profileId: string) {
  const supabase = await createClient();
  
  // Get today's start at midnight
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("task_sessions")
    .select("task_id")
    .eq("profile_id", profileId)
    .eq("status", "completed")
    .gte("completed_at", today.toISOString());

  if (error) {
    console.error("Error fetching task progress:", error);
    return new Map<string, number>();
  }

  const progress = new Map<string, number>();
  for (const session of data) {
    progress.set(session.task_id, (progress.get(session.task_id) || 0) + 1);
  }

  return progress;
}

export async function getUserTaskSessionSummary(profileId: string) {
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("task_sessions")
    .select("id, task_id, status, completed_at, created_at")
    .eq("profile_id", profileId)
    .or(`status.in.(pending,suspicious),completed_at.gte.${today.toISOString()},created_at.gte.${today.toISOString()}`);

  if (error) {
    console.error("Error fetching task session summary:", error);
    return new Map<string, TaskSessionSummary>();
  }

  const summary = new Map<string, TaskSessionSummary>();
  for (const session of data ?? []) {
    const current = summary.get(session.task_id) ?? { completedToday: 0, latestPendingSessionId: null, pending: 0, suspicious: 0, rejectedToday: 0 };
    if (session.status === "completed" && session.completed_at && new Date(session.completed_at) >= today) {
      current.completedToday += 1;
    }
    if (session.status === "pending") {
      current.pending += 1;
      current.latestPendingSessionId ??= session.id;
    }
    if (session.status === "suspicious") current.suspicious += 1;
    if (session.status === "rejected" && new Date(session.created_at) >= today) current.rejectedToday += 1;
    summary.set(session.task_id, current);
  }

  return summary;
}

export async function getUserTaskBackendSummary(profileId: string, tasks: SponsoredTask[]) {
  const supabase = await createClient();

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const { data, error } = await supabase
    .from("task_sessions")
    .select("status, completed_at, created_at, reward_credits")
    .eq("profile_id", profileId);

  if (error) {
    console.error("Error fetching task backend summary:", error);
    return {
      activeTaskCount: tasks.length,
      completedToday: 0,
      lifetimeCompleted: 0,
      lifetimeSponsoredCredits: 0,
      pending: 0,
      rejectedToday: 0,
      suspicious: 0,
      totalAvailableTaskCredits: tasks.reduce((total, task) => total + task.rewardCredits, 0),
    } satisfies UserTaskBackendSummary;
  }

  return (data ?? []).reduce<UserTaskBackendSummary>(
    (current, session) => {
      if (session.status === "pending") current.pending += 1;
      if (session.status === "suspicious") current.suspicious += 1;
      if (session.status === "rejected" && new Date(session.created_at) >= today) current.rejectedToday += 1;
      if (session.status === "completed") {
        current.lifetimeCompleted += 1;
        current.lifetimeSponsoredCredits += session.reward_credits ?? 0;
        if (session.completed_at && new Date(session.completed_at) >= today) {
          current.completedToday += 1;
        }
      }
      return current;
    },
    {
      activeTaskCount: tasks.length,
      completedToday: 0,
      lifetimeCompleted: 0,
      lifetimeSponsoredCredits: 0,
      pending: 0,
      rejectedToday: 0,
      suspicious: 0,
      totalAvailableTaskCredits: tasks.reduce((total, task) => total + task.rewardCredits, 0),
    },
  );
}

export async function getUserVisibleRewardRules() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reward_rules")
    .select("action, label, credits, enabled")
    .in("action", ["referral_qualified", "sponsored_task_milestone", "watch_time_milestone"])
    .order("action", { ascending: true });

  if (error) {
    console.error("Error fetching visible reward rules:", error);
    return [] satisfies UserVisibleRewardRule[];
  }

  return (data ?? []).map((rule) => ({
    action: rule.action,
    credits: rule.enabled ? rule.credits : 0,
    enabled: rule.enabled,
    label: rule.label,
  })) satisfies UserVisibleRewardRule[];
}
