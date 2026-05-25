import "server-only";

import { createClient } from "@/lib/supabase/server";

export type NotificationItem = {
  body: string;
  createdAt: string;
  id: string;
  read: boolean;
  title: string;
};

export async function getCurrentUserNotifications() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { notifications: [], unreadCount: 0 };
  }

  const { data: profile } = await supabase.from("profiles").select("status").eq("id", user.id).maybeSingle();
  const audienceFilter =
    profile?.status === "active" || profile?.status === "suspended"
      ? `audience.eq.all,audience.eq.${profile.status}`
      : "audience.eq.all";
  const audienceQuery = supabase
    .from("platform_notifications")
    .select("id, title, body, audience, created_at")
    .is("recipient_profile_id", null)
    .or(audienceFilter)
    .order("created_at", { ascending: false })
    .limit(20);

  const targetedQuery = supabase
    .from("platform_notifications")
    .select("id, title, body, audience, created_at")
    .eq("recipient_profile_id", user.id)
    .order("created_at", { ascending: false })
    .limit(20);

  const [audienceResult, targetedResult] = await Promise.all([audienceQuery, targetedQuery]);

  if (audienceResult.error || targetedResult.error) {
    return { notifications: [], unreadCount: 0 };
  }

  const notificationsById = new Map(
    [...(audienceResult.data ?? []), ...(targetedResult.data ?? [])]
      .sort((a, b) => Date.parse(b.created_at) - Date.parse(a.created_at))
      .slice(0, 20)
      .map((notification) => [notification.id, notification]),
  );
  const notifications = Array.from(notificationsById.values());
  const ids = (notifications ?? []).map((notification) => notification.id);
  const { data: reads } = ids.length > 0
    ? await supabase.from("notification_reads").select("notification_id").eq("profile_id", user.id).in("notification_id", ids)
    : { data: [] };
  const readIds = new Set((reads ?? []).map((read) => read.notification_id));
  const items: NotificationItem[] = (notifications ?? []).map((notification) => ({
    body: notification.body,
    createdAt: notification.created_at,
    id: notification.id,
    read: readIds.has(notification.id),
    title: notification.title,
  }));

  return {
    notifications: items,
    unreadCount: items.filter((item) => !item.read).length,
  };
}
