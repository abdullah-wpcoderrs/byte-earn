import type { ReactNode } from "react";
import { BadgeCheck, Coins, Gauge, LayoutDashboard, MailPlus, ShieldCheck, Trophy, UsersRound, WalletCards } from "lucide-react";
import { AdminMobileNav } from "@/components/admin/admin-mobile-nav";
import { ByteEarnLogo } from "@/components/brand/byte-earn-logo";
import { NotificationBell } from "@/components/notifications/notification-bell";
import { requireAdmin } from "@/lib/admin";
import { getCurrentUserNotifications } from "@/lib/notifications";

const adminNav = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview" },
  { href: "/admin/users", icon: UsersRound, label: "Users" },
  { href: "/admin/withdrawals", icon: WalletCards, label: "Withdrawals" },
  { href: "/admin/moderation", icon: ShieldCheck, label: "Moderation" },
  { href: "/admin/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/admin/rewards", icon: Coins, label: "Rewards" },
  { href: "/admin/platform", icon: Gauge, label: "Platform" },
  { href: "/admin/email-blasts", icon: MailPlus, label: "Emails" },
  { href: "/admin/badges", icon: BadgeCheck, label: "Badges" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();
  const notificationData = await getCurrentUserNotifications();
  const adminLabel = admin.email ?? admin.displayName ?? "Protected console";

  return (
    <div className="min-h-screen text-[11px] text-white lg:pl-[284px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[284px] border-r border-white/10 bg-[#08101d]/92 p-4 backdrop-blur-xl lg:flex lg:flex-col">
        <a className="flex items-center gap-3" href="/admin">
          <ByteEarnLogo className="size-10 shrink-0" />
          <div>
            <p className="text-base font-semibold leading-none">byte-earn admin</p>
            <p className="text-muted">{adminLabel}</p>
          </div>
        </a>
        <nav className="mt-8 flex flex-1 flex-col gap-2">
          {adminNav.map((item) => (
            <a
              className="flex min-h-11 items-center gap-3 rounded-[5px] px-3 font-medium text-slate-300 transition hover:bg-white/8 hover:text-white"
              href={item.href}
              key={item.href}
            >
              <item.icon className="size-5" />
              {item.label}
            </a>
          ))}
        </nav>
        <div className="flex items-center gap-2">
          <a className="flex min-h-10 flex-1 items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.055] px-3 text-center font-semibold text-cyan-100" href="/feed">
            Return to app
          </a>
          <NotificationBell notifications={notificationData.notifications} unreadCount={notificationData.unreadCount} />
        </div>
      </aside>
      <AdminMobileNav adminLabel={adminLabel} notifications={notificationData.notifications} unreadCount={notificationData.unreadCount} />
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
