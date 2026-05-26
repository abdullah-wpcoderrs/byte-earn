"use client";

import {
  Clapperboard,
  Home,
  LayoutDashboard,
  LogOut,
  SquarePlus,
  Trophy,
  UserRound,
  Wallet,
} from "lucide-react";
import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { ComponentType, SVGProps } from "react";
import { useCallback, useEffect, useState } from "react";
import { signOutAction } from "@/app/auth/actions";
import { ByteEarnLogo } from "@/components/brand/byte-earn-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { Modal } from "@/components/ui/modal";
import { UploadPostForm } from "@/components/upload/upload-post-form";
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
  { label: "Upload", href: "/upload", icon: SquarePlus },
  { label: "Wallet", href: "/wallet", icon: Wallet },
  { label: "Leaders", href: "/leaderboard", icon: Trophy },
  { label: "Profile", href: "/profile", icon: UserRound },
  { label: "Admin", href: "/admin", icon: LayoutDashboard, adminOnly: true },
];

function isActive(pathname: string, href: string) {
  const baseHref = href.split("?")[0];
  return pathname === baseHref || pathname.startsWith(`${baseHref}/`);
}

function visibleNavigation(isAdmin?: boolean) {
  return appNavigation.filter((item) => !item.adminOnly || isAdmin);
}

export function AppBrand() {
  return (
    <div className="flex items-center gap-3">
      <ByteEarnLogo className="size-10 shrink-0" />
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
            <Link
              aria-current={active ? "page" : undefined}
              className={`flex items-center gap-3 rounded-[5px] px-3 py-3 font-medium transition ${
                active
                  ? "border border-cyan-200/20 bg-cyan-300/12 text-cyan-100"
                  : "text-slate-300 hover:bg-white/8 hover:text-white"
              }`}
              href={item.href}
              key={item.label}
              prefetch={false}
            >
              <item.icon className="size-5" />
              {item.label}
            </Link>
          );
        })}
      </nav>
      <div className="flex items-center gap-2">
        <NotificationBell notifications={notifications} unreadCount={unreadCount} />
        <form action={signOutAction}>
          <button
            aria-label="Log out"
            className="grid size-10 place-items-center rounded-[5px] border border-rose-300/25 bg-rose-400/10 text-rose-100 transition hover:bg-rose-400/16 hover:text-rose-50"
            title="Log out"
            type="submit"
          >
            <LogOut className="size-4" />
          </button>
        </form>
      </div>
    </aside>
  );
}

export function MobileHeader({ notifications = [], unreadCount = 0 }: NavigationProps) {
  const pathname = usePathname();
  const profileActive = isActive(pathname, "/profile");

  return (
    <header className="fixed inset-x-0 top-0 z-40 border-b border-white/10 bg-[#08101d]/92 px-4 py-3 backdrop-blur-xl lg:hidden">
      <div className="flex items-center justify-between gap-4">
        <Link aria-label="byte-earn home" className="min-w-0" href="/feed" prefetch={false}>
          <AppBrand />
        </Link>
        <div className="flex shrink-0 items-center gap-2">
          <NotificationBell notifications={notifications} panelPlacement="mobile-header" unreadCount={unreadCount} />
          <Link
            aria-current={profileActive ? "page" : undefined}
            aria-label="Open profile"
            className={`grid size-10 place-items-center rounded-[5px] border text-cyan-100 transition ${
              profileActive ? "pointer-events-none border-cyan-200/25 bg-cyan-300/12" : "border-white/10 bg-white/[0.055] hover:bg-white/10"
            }`}
            href="/profile"
            prefetch={false}
          >
            <UserRound className="size-4" />
          </Link>
        </div>
      </div>
    </header>
  );
}

export function MobileBottomNav({ isAdmin }: NavigationProps) {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [uploadOpen, setUploadOpen] = useState(false);
  const openUploadModal = useCallback(() => {
    setUploadOpen(true);
  }, []);
  const items = visibleNavigation(isAdmin)
    .filter((item) => item.href !== "/admin")
    .slice(0, 5);

  useEffect(() => {
    const updated = searchParams.get("updated");
    if (updated === "post_published" || updated === "post_submitted") {
      const timeout = window.setTimeout(() => setUploadOpen(false), 0);
      return () => window.clearTimeout(timeout);
    }
  }, [searchParams]);

  return (
    <>
      <nav
        className="fixed inset-x-0 bottom-0 z-40 border-t border-white/10 bg-[#08101d]/92 px-2 pb-[calc(0.75rem+env(safe-area-inset-bottom))] pt-2 backdrop-blur-xl transform-gpu lg:hidden"
        aria-label="Primary navigation"
      >
        <div className="grid grid-cols-5 gap-1">
          {items.map((item) => {
            const isUpload = item.href === "/upload";
            const active = !isUpload && isActive(pathname, item.href);

            if (isUpload) {
              return (
                <button
                  className="flex min-h-14 flex-col items-center justify-center gap-1 rounded-[5px] font-medium text-slate-400 transition active:bg-white/8 hover:bg-white/8 hover:text-cyan-100 touch-manipulation"
                  key={item.label}
                  onClick={openUploadModal}
                  type="button"
                >
                  <item.icon className="size-5" />
                  {item.label}
                </button>
              );
            }

            return (
              <Link
                aria-current={active ? "page" : undefined}
                className={`flex min-h-14 flex-col items-center justify-center gap-1 rounded-[5px] font-medium ${
                  active ? "bg-cyan-300/12 text-cyan-100" : "text-slate-400"
                }`}
                href={item.href}
                key={item.label}
                prefetch={false}
              >
                <item.icon className="size-5" />
                {item.label}
              </Link>
            );
          })}
        </div>
      </nav>
      <Modal className="max-w-3xl" onClose={() => setUploadOpen(false)} open={uploadOpen} title="Create post">
        <UploadPostForm returnTo="feed" />
      </Modal>
    </>
  );
}
