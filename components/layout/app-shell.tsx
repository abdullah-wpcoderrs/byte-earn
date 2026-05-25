import type { ReactNode } from "react";
import { DesktopSidebar, MobileBottomNav } from "./app-navigation";
import type { NotificationItem } from "@/lib/notifications";

type AppShellProps = {
  children: ReactNode;
  isAdmin?: boolean;
  notifications?: NotificationItem[];
  unreadCount?: number;
};

export function AppShell({ children, isAdmin, notifications = [], unreadCount = 0 }: AppShellProps) {
  return (
    <div className="min-h-screen text-[11px] text-white lg:pl-[264px]">
      <DesktopSidebar isAdmin={isAdmin} notifications={notifications} unreadCount={unreadCount} />
      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8">{children}</main>
      <MobileBottomNav isAdmin={isAdmin} />
    </div>
  );
}
