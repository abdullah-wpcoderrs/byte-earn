import type { ReactNode } from "react";
import { DesktopSidebar, MobileBottomNav } from "./app-navigation";

type AppShellProps = {
  children: ReactNode;
};

export function AppShell({ children }: AppShellProps) {
  return (
    <div className="min-h-screen text-[11px] text-white lg:pl-[264px]">
      <DesktopSidebar />
      <main className="mx-auto w-full max-w-7xl px-4 pb-24 pt-4 sm:px-6 lg:px-8 lg:pb-8">{children}</main>
      <MobileBottomNav />
    </div>
  );
}
