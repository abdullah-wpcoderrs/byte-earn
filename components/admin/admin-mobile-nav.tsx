"use client";

import { BadgeCheck, Coins, FileClock, Gauge, LayoutDashboard, MailPlus, Menu, ShieldCheck, Trophy, UsersRound, WalletCards, X, ListTodo } from "lucide-react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";
import { ByteEarnLogo } from "@/components/brand/byte-earn-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import type { NotificationItem } from "@/lib/notifications";

const adminNav = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview" },
  { href: "/admin/users", icon: UsersRound, label: "Users" },
  { href: "/admin/withdrawals", icon: WalletCards, label: "Withdrawals" },
  { href: "/admin/moderation", icon: ShieldCheck, label: "Moderation" },
  { href: "/admin/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/admin/rewards", icon: Coins, label: "Rewards" },
  { href: "/admin/tasks", icon: ListTodo, label: "Tasks" },
  { href: "/admin/platform", icon: Gauge, label: "Platform" },
  { href: "/admin/email-blasts", icon: MailPlus, label: "Emails" },
  { href: "/admin/badges", icon: BadgeCheck, label: "Badges" },
  { href: "/admin/audit", icon: FileClock, label: "Audit" },
];

type AdminMobileNavProps = {
  adminLabel: string;
  notifications: NotificationItem[];
  profileId?: string;
  unreadCount: number;
};

function isActive(pathname: string, href: string) {
  return pathname === href || (href !== "/admin" && pathname.startsWith(`${href}/`));
}

export function AdminMobileNav({ adminLabel, notifications, profileId, unreadCount }: AdminMobileNavProps) {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="sticky top-0 z-40 border-b border-white/10 bg-[#08101d]/92 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex min-h-10 items-center justify-between gap-3">
          <button
            aria-expanded={open}
            aria-label="Open admin menu"
            className="grid size-10 place-items-center rounded-[5px] border border-white/10 bg-white/[0.055] text-cyan-100 transition hover:bg-white/10"
            onClick={() => setOpen(true)}
            type="button"
          >
            <Menu className="size-5" />
          </button>

          <Link className="flex min-w-0 items-center gap-3" href="/admin" prefetch={false}>
            <ByteEarnLogo className="size-10 shrink-0" aria-hidden="true" />
            <div className="min-w-0">
              <p className="truncate text-base font-semibold leading-none">byte-earn admin</p>
              <p className="mt-1 truncate text-muted">{adminLabel}</p>
            </div>
          </Link>

          <Link className="rounded-[5px] border border-white/10 px-3 py-2 font-semibold text-cyan-100" href="/feed" prefetch={false}>
            App
          </Link>
        </div>
      </header>

      {open ? (
        <div className="fixed inset-0 z-50 bg-slate-950/68 backdrop-blur-sm lg:hidden" onClick={() => setOpen(false)}>
          <aside
            aria-label="Admin navigation"
            className="fixed inset-y-0 left-0 flex w-[min(320px,86vw)] flex-col border-r border-white/10 bg-[#08101d] p-4 shadow-2xl"
            onClick={(event) => event.stopPropagation()}
          >
            <div className="flex items-center justify-between gap-3">
              <Link className="flex min-w-0 items-center gap-3" href="/admin" onClick={() => setOpen(false)} prefetch={false}>
                <ByteEarnLogo className="size-10 shrink-0" />
                <div className="min-w-0">
                  <p className="text-base font-semibold leading-none">byte-earn admin</p>
                  <p className="mt-1 truncate text-muted">{adminLabel}</p>
                </div>
              </Link>
              <button
                aria-label="Close admin menu"
                className="grid size-10 shrink-0 place-items-center rounded-[5px] border border-white/10 bg-white/[0.055] text-slate-200 transition hover:bg-white/10"
                onClick={() => setOpen(false)}
                type="button"
              >
                <X className="size-5" />
              </button>
            </div>

            <nav className="app-scrollbar mt-6 grid min-h-0 gap-2 overflow-y-auto pr-1" aria-label="Admin navigation">
              {adminNav.map((item) => {
                const active = isActive(pathname, item.href);

                return (
                  <Link
                    aria-current={active ? "page" : undefined}
                    className={`flex min-h-11 items-center gap-3 rounded-[5px] px-3 font-medium transition ${
                      active ? "border border-cyan-200/20 bg-cyan-300/12 text-cyan-100" : "text-slate-300 hover:bg-white/8 hover:text-white"
                    }`}
                    href={item.href}
                    key={item.href}
                    onClick={() => setOpen(false)}
                    prefetch={false}
                  >
                    <item.icon className="size-5" />
                    {item.label}
                  </Link>
                );
              })}
            </nav>

            <div className="mt-auto flex items-center gap-2 pt-5">
              <Link className="flex min-h-10 flex-1 items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.055] px-3 font-semibold text-cyan-100" href="/feed" prefetch={false}>
                Return to app
              </Link>
              <NotificationBell notifications={notifications} panelPlacement="mobile-header" profileId={profileId} unreadCount={unreadCount} />
            </div>
          </aside>
        </div>
      ) : null}
    </>
  );
}
