import { Save } from "lucide-react";
import { updateLeaderboardSettingsAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { getLeaderboardRows, getOrCreatePlatformSettings } from "@/lib/admin";

export const dynamic = "force-dynamic";

const criteria = [
  ["leaderboardUsesReferrals", "Referral counts"],
  ["leaderboardUsesEngagement", "Post engagement"],
  ["leaderboardUsesBookmarks", "Bookmarks"],
  ["leaderboardUsesWatchTime", "Watch-time credits"],
] as const;

export default async function AdminLeaderboardPage() {
  const settings = await getOrCreatePlatformSettings();
  const rows = await getLeaderboardRows();

  return (
    <div className="grid gap-4 xl:grid-cols-[420px_1fr]">
      <section className="glass-strong p-4 sm:p-5 xl:col-span-2">
        <p className="text-muted">Criteria checklist and active scoring mode</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Leaderboard controls</h1>
      </section>

      <form action={updateLeaderboardSettingsAction} className="glass grid content-start gap-4 p-4">
        <input name="settingsId" type="hidden" value={settings.id} />
        <label className="flex items-center justify-between gap-3 rounded-[5px] border border-white/10 bg-white/[0.055] p-3">
          <span>
            <span className="block font-semibold text-slate-100">Strict mode</span>
            <span className="text-muted">Require all enabled criteria to count users as eligible.</span>
          </span>
          <input className="size-4 accent-cyan-300" defaultChecked={settings.leaderboardStrictMode} name="leaderboardStrictMode" type="checkbox" />
        </label>
        <div className="grid gap-2">
          {criteria.map(([name, label]) => (
            <label className="flex min-h-11 items-center justify-between gap-3 rounded-[5px] border border-white/10 px-3" key={name}>
              <span className="font-medium text-slate-200">{label}</span>
              <input
                className="size-4 accent-cyan-300"
                defaultChecked={Boolean(settings[name])}
                name={name}
                type="checkbox"
              />
            </label>
          ))}
        </div>
        <Button icon={<Save className="size-4" />} type="submit">
          Save rules
        </Button>
      </form>

      <section className="glass overflow-hidden">
        <div className="border-b border-white/10 p-4">
          <h2 className="text-base font-semibold">Current ranking preview</h2>
          <p className="mt-1 text-muted">{settings.leaderboardStrictMode ? "Strict" : "Flexible"} mode is active.</p>
        </div>
        <div className="divide-y divide-white/10">
          {rows.map((row, index) => (
            <div className="grid grid-cols-[36px_1fr_90px_90px] items-center gap-2 px-4 py-3" key={row.id}>
              <span className="font-semibold text-cyan-100">#{index + 1}</span>
              <span>
                <span className="block font-semibold text-slate-100">{row.displayName ?? "Unnamed user"}</span>
                <span className="text-muted">{row.status}</span>
              </span>
              <span className="text-slate-300">{row.referralCount} refs</span>
              <span className="text-right font-semibold text-slate-100">{row.creditsBalance}</span>
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}
