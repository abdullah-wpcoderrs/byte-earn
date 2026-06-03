import "server-only";

import { createAdminClient } from "@/lib/supabase/admin";

type WatchSessionRow = {
  completed_at: string | null;
  created_at: string;
  sponsored_tasks:
    | {
        task_type?: string | null;
      }
    | Array<{
        task_type?: string | null;
      }>
    | null;
};

function joinedTaskType(value: WatchSessionRow["sponsored_tasks"]) {
  if (Array.isArray(value)) {
    return value[0]?.task_type ?? null;
  }

  return value?.task_type ?? null;
}

function completedSessionSeconds(createdAt: string, completedAt: string | null) {
  if (!completedAt) return 0;
  return Math.max(0, Math.floor((new Date(completedAt).getTime() - new Date(createdAt).getTime()) / 1000));
}

function startOfTodayIso(now = new Date()) {
  const start = new Date(now);
  start.setHours(0, 0, 0, 0);
  return start.toISOString();
}

export async function getRewardedWatchSecondsToday(
  taskDb: ReturnType<typeof createAdminClient>,
  profileId: string,
  now = new Date(),
) {
  const { data, error } = await taskDb
    .from("task_sessions")
    .select("created_at, completed_at, sponsored_tasks(task_type)")
    .eq("profile_id", profileId)
    .eq("provider", "internal")
    .eq("status", "completed")
    .gte("completed_at", startOfTodayIso(now));

  if (error) {
    throw new Error(error.message);
  }

  return ((data ?? []) as WatchSessionRow[])
    .filter((session) => joinedTaskType(session.sponsored_tasks) === "watch_media")
    .reduce((total, session) => total + completedSessionSeconds(session.created_at, session.completed_at), 0);
}
