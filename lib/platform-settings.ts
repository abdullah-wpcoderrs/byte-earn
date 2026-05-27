import "server-only";

import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PlatformSettings = {
  daily_watch_limit_seconds: number;
  id: string;
  leaderboard_strict_mode: boolean;
  leaderboard_uses_bookmarks: boolean;
  leaderboard_uses_engagement: boolean;
  leaderboard_uses_referrals: boolean;
  leaderboard_uses_watch_time: boolean;
  max_upload_size_mb: number;
  post_approval_required: boolean;
  sponsored_withdrawals_unlocked: boolean;
  under_construction: boolean;
  updated_at: string;
};

export const defaultPlatformSettings: PlatformSettings = {
  daily_watch_limit_seconds: 1800,
  id: "",
  leaderboard_strict_mode: true,
  leaderboard_uses_bookmarks: false,
  leaderboard_uses_engagement: true,
  leaderboard_uses_referrals: true,
  leaderboard_uses_watch_time: false,
  max_upload_size_mb: 50,
  post_approval_required: true,
  sponsored_withdrawals_unlocked: false,
  under_construction: false,
  updated_at: new Date(0).toISOString(),
};

export async function getPlatformSettings(): Promise<PlatformSettings> {
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from("platform_settings")
    .select("*")
    .order("updated_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return defaultPlatformSettings;
  }

  return {
    ...data,
    max_upload_size_mb: Math.max(1, data.max_upload_size_mb ?? defaultPlatformSettings.max_upload_size_mb),
  };
}
