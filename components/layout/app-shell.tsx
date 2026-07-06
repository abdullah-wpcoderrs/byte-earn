import type { ReactNode } from "react";
import { DesktopSidebar, MobileBottomNav, MobileHeader } from "./app-navigation";
import { UploadProvider } from "@/components/upload/upload-provider";
import type { NotificationItem } from "@/lib/notifications";

type AppShellProps = {
  children: ReactNode;
  isAdmin?: boolean;
  notifications?: NotificationItem[];
  profileId?: string;
  unreadCount?: number;
};

export function AppShell({ children, isAdmin, notifications = [], profileId, unreadCount = 0 }: AppShellProps) {
  return (
    <UploadProvider>
      <div className="relative isolate min-h-screen text-[11px] text-white lg:pl-[264px]">
        <DesktopSidebar isAdmin={isAdmin} notifications={notifications} profileId={profileId} unreadCount={unreadCount} />
        <MobileHeader notifications={notifications} profileId={profileId} unreadCount={unreadCount} />
        <main className="relative z-10 mx-auto w-full max-w-7xl px-4 pb-36 pt-20 sm:px-6 lg:px-8 lg:pb-8 lg:pt-4">{children}</main>
        <MobileBottomNav isAdmin={isAdmin} />
      </div>
    </UploadProvider>
  );
}
