"use client";

import {
  Clapperboard,
  Home,
  LayoutDashboard,
  Sparkles,
  SquarePlus,
  Trophy,
  UserRound,
  Wallet,
} from "lucide-react";
import { usePathname } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { NotificationItem } from "@/lib/notifications";

type NavItem = {
  adminOnly?: boolean;
  href: string;
  icon: ComponentType<SVGProps<SVGSVGElement>>;
  label: string;
};

type NavigationProps = {
  isAdmin?: boolean;
  notifications?: NotificationItem[];
  unreadCount?: number;
};

export const appNavigation: NavItem[] = [
  { label: "Feed", href: "/feed", icon: Home },
  { label: "Tasks", href: "/tasks", icon: Clapperboard },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Leaders", href: "/leaderboard", icon: Trophy },
  { label: "Upload", href: "/upload", icon: SquarePlus },
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Admin", href: "/admin", icon: LayoutDashboard, adminOnly: true },
];

function isActive(pathname: string, href: string) {
  return pathname === href || pathname.startsWith(`${href}/`);
}

function visibleNavigation(isAdmin?: boolean) {
  return appNavigation.filter((item) => !item.adminOnly || isAdmin);
}

export function AppBrand() {
  return (
    <div className="flex items-center gap-3">
      <div className="flex size-10 items-center justify-center rounded-[5px] border border-cyan-200/20 bg-cyan-300/10">
        <Sparkles className="size-5 text-cyan-200" />
      </div>
      <div>
        <p className="text-base font-semibold leading-none">byte-earn</p>
        <p className="text-muted">Creator network</p>
      </div>
    </div>
  );
}

export function DesktopSidebar({ isAdmin, notifications = [], unreadCount = 0 }: NavigationProps) {
  const pathname = usePathname();

  return (
    <aside className="fixed inset-y-0 left-0 z-30 hidden w-[264px] border-r border-white/10 bg-[#08101d]/88 p-4 backdrop-blur-xl lg:flex lg:flex-col">
      <AppBrand />
      <nav className="mt-8 flex flex-1 flex-col gap-2" aria-label="Primary navigation">
        {visibleNavigation(isAdmin).map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <a
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[5px] px-3 py-3 font-medium transition ${
                active
                  ? "border border-cyan-200/20 bg-cyan-300/12 text-cyan-100"
                  : "text-slate-300 hover:bg-white/8 hover:text-white"
              }`}
              href={item.href}
              key={item.label}
            >
              <item.icon className="size-5" />
              {item.label}
            </a>
          );
        })}
      </nav>
      <NotificationBell notifications={notifications} unreadCount={unreadCount} />
    </aside>
  );
}

export function MobileHeader({ notifications = [], unreadCount = 0 }: NavigationProps) {
  const pathname = usePathname();
  const profileActive = isActive(pathname, "/profile");

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#08101d]/92 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <a aria-label="byte-earn home" className="min-w-0" href="/feed">
          <AppBrand />
        </a>
        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell notifications={notifications} panelPlacement="mobile-header" unreadCount={unreadCount} />
          <a
            aria-current={profileActive ? "page" : undefined}
            aria-label="Open profile"
            className={`grid size-10 place-items-center rounded-[5px] border text-cyan-100 transition ${
              profileActive ? "pointer-events-none border-cyan-200/25 bg-cyan-300/12" : "border-white/10 bg-white/[0.055] hover:bg-white/10"
            }`}
            href="/profile"
          >
            <UserRound className="size-4" />
          </a>
        </div>
      </div>
    </header>
  );
}

export function MobileBottomNav({ isAdmin }: NavigationProps) {
  const pathname = usePathname();
  const items = visibleNavigation(isAdmin).filter((item) => item.href !== "/admin").slice(0, 5);

  return (
    <nav className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#08101d]/92 px-2 pb-3 pt-2 backdrop-blur-xl lg:hidden" aria-label="Primary navigation">
      <div className="grid grid-cols-5 gap-1">
        {items.map((item) => {
          const active = isActive(pathname, item.href);

          return (
            <a
              aria-current={active ? "page" : undefined}
              className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[5px] font-medium ${
                active ? "bg-cyan-300/12 text-cyan-100" : "text-slate-400"
              }`}
              href={item.href}
              key={item.label}
            >
              <item.icon className="size-5" />
              {item.label}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
