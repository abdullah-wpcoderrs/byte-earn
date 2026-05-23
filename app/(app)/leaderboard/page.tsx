import { Trophy } from "lucide-react";
import { getLeaderboardRows, getOrCreatePlatformSettings } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function LeaderboardPage() {
  const [settings, rows] = await Promise.all([getOrCreatePlatformSettings(), getLeaderboardRows()]);
  const enabled = [
    settings.leaderboardUsesReferrals ? "referrals" : null,
    settings.leaderboardUsesEngagement ? "engagement" : null,
    settings.leaderboardUsesBookmarks ? "bookmarks" : null,
    settings.leaderboardUsesWatchTime ? "watch-time" : null,
  ].filter(Boolean);

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4 sm:p-5">
        <div className="flex items-center gap-3">
          <Trophy className="size-5 text-cyan-200" />
          <p className="text-muted">{settings.leaderboardStrictMode ? "Strict" : "Flexible"} leaderboard mode</p>
        </div>
        <h1 className="mt-2 text-[28px] font-semibold leading-tight">Creator leaderboard</h1>
        <p className="mt-2 max-w-2xl leading-5 text-muted">Ranking currently weighs {enabled.join(", ") || "platform activity"}.</p>
      </section>

      <section className="glass overflow-hidden">
        <div className="hidden grid-cols-[64px_1fr_110px_120px] border-b border-white/10 px-4 py-3 font-semibold text-slate-300 md:grid">
          <span>Rank</span>
          <span>Creator</span>
          <span>Referrals</span>
          <span className="text-right">Credits</span>
        </div>
        <div className="divide-y divide-white/10">
          {rows.map((row, index) => (
            <a className="grid gap-3 px-4 py-4 transition hover:bg-white/[0.035] md:grid-cols-[64px_1fr_110px_120px] md:items-center" href={`/u/${row.id}`} key={row.id}>
              <span className="text-base font-semibold text-cyan-100">#{index + 1}</span>
              <span>
                <span className="block font-semibold text-slate-100">{row.displayName ?? "Creator"}</span>
                <span className="text-muted">{row.status}</span>
              </span>
              <span className="text-slate-300">{row.referralCount}</span>
              <span className="font-semibold text-slate-100 md:text-right">{row.creditsBalance.toLocaleString()}</span>
            </a>
          ))}
        </div>
      </section>
    </div>
  );
}
