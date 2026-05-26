import { ArrowRight, BadgeCheck, ShieldCheck, UsersRound, WalletCards } from "lucide-react";
import Link from "next/link";
import { getAdminStats } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminPage() {
  const stats = await getAdminStats();
  const cards = [
    { href: "/admin/users", icon: UsersRound, label: "Users", value: stats.users },
    { href: "/admin/moderation?status=pending", icon: ShieldCheck, label: "Pending posts", value: stats.pendingPosts },
    { href: "/admin/withdrawals", icon: WalletCards, label: "Pending withdrawals", value: stats.pendingWithdrawals },
    { href: "/admin/badges", icon: BadgeCheck, label: "Badges", value: stats.badges },
  ];

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4 sm:p-5">
        <p className="text-muted">Protected management platform</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Admin overview</h1>
      </section>
      <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-4">
        {cards.map((card) => (
          <Link className="glass flex min-h-32 flex-col justify-between p-4 transition hover:border-cyan-200/35 focus-visible:outline focus-visible:outline-2 focus-visible:outline-cyan-200" href={card.href} key={card.label}>
            <div className="flex items-center justify-between gap-3">
              <card.icon className="size-5 text-cyan-200" />
              <ArrowRight className="size-4 text-slate-500" />
            </div>
            <div>
              <p className="text-[28px] font-semibold leading-none">{card.value}</p>
              <p className="mt-2 text-muted">{card.label}</p>
            </div>
          </Link>
        ))}
      </section>
    </div>
  );
}
