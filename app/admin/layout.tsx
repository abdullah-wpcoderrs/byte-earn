import type { ReactNode } from "react";
import { Bell, Gauge, LayoutDashboard, ShieldCheck, Trophy, UsersRound, WalletCards } from "lucide-react";
import { requireAdmin } from "@/lib/admin";

const adminNav = [
  { href: "/admin", icon: LayoutDashboard, label: "Overview" },
  { href: "/admin/users", icon: UsersRound, label: "Users" },
  { href: "/admin/withdrawals", icon: WalletCards, label: "Withdrawals" },
  { href: "/admin/moderation", icon: ShieldCheck, label: "Moderation" },
  { href: "/admin/leaderboard", icon: Trophy, label: "Leaderboard" },
  { href: "/admin/platform", icon: Gauge, label: "Platform" },
];

export default async function AdminLayout({ children }: { children: ReactNode }) {
  const admin = await requireAdmin();

  return (
    <div className="min-h-screen text-[11px] text-white lg:pl-[284px]">
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-[284px] border-r border-white/10 bg-[#08101d]/92 p-4 backdrop-blur-xl lg:flex lg:flex-col">
        <a className="flex items-center gap-3" href="/admin">
          <div className="flex size-10 items-center justify-center rounded-[5px] border border-cyan-200/20 bg-cyan-300/10">
            <Bell className="size-5 text-cyan-200" />
          </div>
          <div>
            <p className="text-base font-semibold leading-none">byte-earn admin</p>
            <p className="text-muted">{admin.email ?? admin.displayName ?? "Protected console"}</p>
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
        <a className="rounded-[5px] border border-white/10 bg-white/[0.055] px-3 py-3 text-center font-semibold text-cyan-100" href="/feed">
          Return to app
        </a>
      </aside>
      <header className="sticky top-0 z-20 border-b border-white/10 bg-[#08101d]/92 px-4 py-3 backdrop-blur-xl lg:hidden">
        <div className="flex items-center justify-between gap-3">
          <a className="text-base font-semibold" href="/admin">
            byte-earn admin
          </a>
          <a className="rounded-[5px] border border-white/10 px-3 py-2 font-semibold text-cyan-100" href="/feed">
            App
          </a>
        </div>
        <nav className="mt-3 grid grid-cols-5 gap-1">
          {adminNav.map((item) => (
            <a className="flex min-h-11 items-center justify-center rounded-[5px] bg-white/[0.055] text-slate-300" href={item.href} key={item.href} title={item.label}>
              <item.icon className="size-4" />
            </a>
          ))}
        </nav>
      </header>
      <main className="mx-auto w-full max-w-7xl px-4 pb-10 pt-4 sm:px-6 lg:px-8">{children}</main>
    </div>
  );
}
