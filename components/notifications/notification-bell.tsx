"use client";

import { Bell } from "lucide-react";
import { useState } from "react";
import { markNotificationReadAction } from "@/app/notifications/actions";
import type { NotificationItem } from "@/lib/notifications";

type NotificationBellProps = {
  panelPlacement?: "sidebar" | "mobile-header";
  notifications: NotificationItem[];
  unreadCount: number;
};

export function NotificationBell({ notifications, panelPlacement = "sidebar", unreadCount }: NotificationBellProps) {
  const [open, setOpen] = useState(false);
  const panelPosition =
    panelPlacement === "mobile-header"
      ? "fixed left-4 right-4 top-[72px] z-[70] w-auto"
      : "fixed bottom-4 left-[276px] z-50 max-lg:absolute max-lg:bottom-12 max-lg:left-auto max-lg:right-0";
  const panelWidth = panelPlacement === "mobile-header" ? "" : "w-[min(320px,calc(100vw-2rem))]";

  return (
    <div className="relative">
      <button
        aria-label="Notifications"
        className="relative grid size-10 place-items-center rounded-[5px] border border-white/10 bg-white/[0.055] text-cyan-100 transition hover:bg-white/10"
        onClick={() => setOpen((current) => !current)}
        type="button"
      >
        <Bell className="size-4" />
        {unreadCount > 0 ? (
          <span className="absolute -right-1 -top-1 grid min-w-4 place-items-center rounded-full bg-cyan-300 px-1 text-[9px] font-semibold text-slate-950">
            {unreadCount}
          </span>
        ) : null}
      </button>

      {open ? (
        <div className={`${panelPosition} ${panelWidth} grid overflow-hidden rounded-[5px] border border-white/10 bg-[#0d182b] shadow-2xl`}>
          <div className="border-b border-white/10 px-3 py-2 font-semibold text-slate-100">Notifications</div>
          <div className="app-scrollbar max-h-80 overflow-y-auto">
            {notifications.map((notification) => (
              <form action={markNotificationReadAction} className="grid gap-1 border-b border-white/10 p-3 text-left last:border-0" key={notification.id}>
                <input name="notificationId" type="hidden" value={notification.id} />
                <button className="grid gap-1 text-left" type="submit">
                  <span className={notification.read ? "font-semibold text-slate-300" : "font-semibold text-cyan-100"}>{notification.title}</span>
                  <span className="leading-5 text-slate-400">{notification.body}</span>
                  <span className="text-[10px] text-slate-500">{new Date(notification.createdAt).toLocaleString("en-NG")}</span>
                </button>
              </form>
            ))}
            {notifications.length === 0 ? <div className="p-4 text-center text-muted">No notifications yet.</div> : null}
          </div>
        </div>
      ) : null}
    </div>
  );
}
