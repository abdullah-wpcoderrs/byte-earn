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
  const { data: notifications, error: notificationError } = await supabase
    .from("platform_notifications")
    .select("id, title, body, audience, created_at")
    .or(audienceFilter)
    .order("created_at", { ascending: false })
    .limit(20);

  if (notificationError) {
    return { notifications: [], unreadCount: 0 };
  }

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
