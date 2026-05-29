import "server-only";

import { createClient } from "@/lib/supabase/server";

export type TaskProvider = "monetag" | "cpagrip" | "internal";

export type SponsoredTask = {
  id: string;
  provider: TaskProvider;
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
