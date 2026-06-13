import { getActiveTasks, getUserTaskBackendSummary, getUserTaskProgress, getUserTaskSessionSummary, getUserVisibleRewardRules } from "@/lib/tasks-data";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TaskEngine } from "@/components/tasks/task-engine";
import { getPlatformSettings } from "@/lib/platform-settings";
import { Clock } from "lucide-react";
import { getActiveFinanceSettings } from "@/lib/finance-settings";
import { creditsToNaira, formatNaira, formatUsd } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/auth/sign-in");
  }

  const settings = await getPlatformSettings();

  if (!settings.sponsored_tasks_enabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-16 text-center sm:py-24">
        <div className="glass-strong relative overflow-hidden rounded-2xl p-8 sm:p-12">
          {/* Decorative glowing background blobs */}
          <div className="absolute -left-16 -top-16 size-48 rounded-full bg-cyan-500/10 blur-3xl" />
          <div className="absolute -right-16 -bottom-16 size-48 rounded-full bg-blue-500/10 blur-3xl" />

          <div className="relative z-10 flex flex-col items-center">
            {/* Pulsing visual element */}
            <div className="relative flex size-20 items-center justify-center rounded-2xl bg-cyan-950/40 border border-cyan-500/20 text-cyan-400 shadow-[0_0_20px_rgba(6,182,212,0.15)] animate-pulse">
              <Clock className="size-10" />
            </div>

            <h1 className="mt-8 text-2xl font-bold tracking-tight text-white sm:text-3xl">
              Earning Hub Coming Soon
            </h1>
            
            <p className="mt-4 text-sm leading-6 text-slate-400 max-w-md">
              We are currently preparing the ultimate incentivized earning hub. 
              Soon, you will be able to perform high-paying sponsored tasks and activities, 
              to earn massive rewards!
            </p>

            <div className="mt-8 flex flex-col gap-3 sm:flex-row w-full sm:w-auto">
              <a
                href="/feed"
                className="flex min-h-11 items-center justify-center rounded-[5px] bg-gradient-to-r from-cyan-500 to-blue-600 px-6 font-semibold text-white shadow-md transition hover:from-cyan-400 hover:to-blue-500"
              >
                Back to Feed
              </a>
              <a
                href="/wallet"
                className="flex min-h-11 items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.055] px-6 font-semibold text-slate-200 transition hover:bg-white/10 hover:text-white"
              >
                Check Wallet Balance
              </a>
            </div>
            
            <div className="mt-8 flex items-center gap-2 text-xs text-cyan-400/80 bg-cyan-950/20 border border-cyan-500/10 px-3 py-1.5 rounded-full">
              <span className="relative flex h-2 w-2">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-cyan-400 opacity-75"></span>
                <span className="relative inline-flex rounded-full h-2 w-2 bg-cyan-500"></span>
              </span>
              Engine status: Warming up
            </div>
          </div>
        </div>
      </div>
    );
  }

  const tasks = await getActiveTasks();
  const [progress, sessionSummary, taskBackendSummary, financeSettings, rewardRules] = await Promise.all([
    getUserTaskProgress(user.id),
    getUserTaskSessionSummary(user.id),
    getUserTaskBackendSummary(user.id, tasks),
    getActiveFinanceSettings(),
    getUserVisibleRewardRules(),
  ]);
  
  const { data: profile } = await supabase
    .from("profiles")
    .select("referral_code")
    .eq("id", user.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-4xl space-y-8 p-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Sponsored Tasks</h1>
        <p className="text-muted-foreground mt-2">
          Complete tasks, watch ads, and share sponsored posts to earn credits.
        </p>
      </div>

      <section className="grid gap-3 md:grid-cols-4">
        <TaskStat label="Active tasks" value={taskBackendSummary.activeTaskCount} />
        <TaskStat label="Available credits" value={taskBackendSummary.totalAvailableTaskCredits} />
        <TaskStat label="Completed today" value={taskBackendSummary.completedToday} />
        <TaskStat label="Lifetime completed" value={taskBackendSummary.lifetimeCompleted} />
        <TaskStat label="Pending" value={taskBackendSummary.pending} />
        <TaskStat label="Under review" value={taskBackendSummary.suspicious} />
        <TaskStat label="Rejected today" value={taskBackendSummary.rejectedToday} />
        <TaskStat label="Earned credits" value={taskBackendSummary.lifetimeSponsoredCredits} />
      </section>

      <section className="grid gap-3 rounded-[5px] border border-white/10 bg-white/[0.045] p-4 md:grid-cols-3">
        <div>
          <p className="font-semibold text-slate-100">Sponsored withdrawals</p>
          <p className={settings.sponsored_withdrawals_unlocked ? "mt-1 text-emerald-300" : "mt-1 text-slate-400"}>
            {settings.sponsored_withdrawals_unlocked ? "Withdrawable" : "Locked"}
          </p>
        </div>
        <div>
          <p className="font-semibold text-slate-100">Task credit value</p>
          <p className="mt-1 text-slate-300">
            {taskBackendSummary.totalAvailableTaskCredits.toLocaleString("en-US")} credits = {formatNaira(creditsToNaira(taskBackendSummary.totalAvailableTaskCredits, financeSettings))}
          </p>
        </div>
        <div>
          <p className="font-semibold text-slate-100">Active rate</p>
          <p className="mt-1 text-slate-300">
            {financeSettings.creditsPerUnit.toLocaleString("en-US")} credits = {formatUsd(financeSettings.usdPerUnit)} = {formatNaira(financeSettings.usdPerUnit * financeSettings.ngnPerUsd)}
          </p>
        </div>
      </section>

      {rewardRules.length > 0 ? (
        <section className="grid gap-2 rounded-[5px] border border-white/10 bg-white/[0.035] p-4">
          <p className="font-semibold text-slate-100">Reward rules</p>
          <div className="grid gap-2 md:grid-cols-3">
            {rewardRules.map((rule) => (
              <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3" key={rule.action}>
                <p className="font-semibold text-slate-100">{rule.label}</p>
                <p className={rule.enabled ? "mt-1 text-cyan-100" : "mt-1 text-slate-500"}>
                  {rule.enabled ? `${rule.credits.toLocaleString("en-US")} credits` : "Disabled"}
                </p>
              </div>
            ))}
          </div>
        </section>
      ) : null}

      <TaskEngine
        tasks={tasks}
        progress={progress}
        sessionSummary={sessionSummary}
        profileId={user.id}
        referralCode={profile?.referral_code || ""}
      />
    </div>
  );
}

function TaskStat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3">
      <p className="text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-100">{value.toLocaleString("en-US")}</p>
    </div>
  );
}
