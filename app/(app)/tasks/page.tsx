import { getActiveTasks, getUserTaskBackendSummary, getUserTaskProgress, getUserTaskSessionSummary, getUserVisibleRewardRules } from "@/lib/tasks-data";
import { createClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { TaskEngine } from "@/components/tasks/task-engine";
import { getPlatformSettings } from "@/lib/platform-settings";
import { Clock, HelpCircle, Lock, WalletCards } from "lucide-react";
import { getActiveFinanceSettings } from "@/lib/finance-settings";
import { creditsToNaira, formatNaira, getNgnPerCredit } from "@/lib/money";

export const dynamic = "force-dynamic";

export default async function TasksPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=required");
  }

  const settings = await getPlatformSettings();

  if (!settings.sponsored_tasks_enabled) {
    return (
      <div className="mx-auto max-w-2xl px-4 py-10 text-center sm:py-14">
        <div className="glass-strong p-5 sm:p-6">
          <div className="flex flex-col items-center">
            <div className="grid size-12 place-items-center rounded-[5px] border border-cyan-500/20 bg-cyan-950/40 text-cyan-300">
              <Clock className="size-6" />
            </div>

            <h1 className="mt-5 text-xl font-semibold tracking-tight text-white sm:text-2xl">
              Earning Hub Coming Soon
            </h1>
            
            <p className="mt-4 text-sm leading-6 text-slate-400 max-w-md">
              Sponsored task campaigns are being prepared. When campaigns are live, you can review eligible activities and see confirmed credits after provider verification.
            </p>

            <div className="mt-6 flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
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
            
            <div className="mt-6 flex items-center gap-2 rounded-[5px] border border-cyan-500/10 bg-cyan-950/20 px-3 py-1.5 text-xs text-cyan-400/80">
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
  const ngnPerCredit = getNgnPerCredit(financeSettings);
  const isFirstTimeView = taskBackendSummary.lifetimeCompleted === 0 && taskBackendSummary.completedToday === 0 && taskBackendSummary.lifetimeSponsoredCredits === 0;

  return (
    <div className="mx-auto max-w-5xl space-y-6 p-4 pb-20">
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px] lg:items-start">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Sponsored Tasks</h1>
          <p className="mt-2 max-w-2xl text-muted">
            Complete a task and credits are added to your wallet after verification.
          </p>
        </div>
        <div className="rounded-[5px] border border-cyan-200/20 bg-cyan-300/10 p-3 text-cyan-50" title={`1 credit = ${formatNaira(ngnPerCredit)}`}>
          <div className="flex items-center gap-2 font-semibold">
            <WalletCards className="size-4" />
            Credit value
          </div>
          <p className="mt-2 text-lg font-semibold">1 credit = {formatNaira(ngnPerCredit)}</p>
          <p className="mt-1 leading-5 text-cyan-50/80">Rewards shown in NGN. Credits go to your wallet on completion.</p>
        </div>
      </div>

      <details className="rounded-[5px] border border-white/10 bg-white/[0.03] p-3">
        <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-100">
          {isFirstTimeView ? "Task stats" : "Your task stats"}
          <HelpCircle className="size-4 text-slate-400" />
        </summary>
        {/* One row of forward-looking stats - what motivates and signals opportunity.
            Internal states (pending, under review, rejected) stay on the admin side. */}
        <div className="mt-4 grid gap-3 md:grid-cols-4">
          <TaskStat
            label="Available credits"
            value={`${taskBackendSummary.totalAvailableTaskCredits.toLocaleString("en-US")} credits`}
            subvalue={formatNaira(creditsToNaira(taskBackendSummary.totalAvailableTaskCredits, financeSettings))}
          />
          <TaskStat
            label="Earned so far"
            value={formatNaira(creditsToNaira(taskBackendSummary.lifetimeSponsoredCredits, financeSettings))}
            subvalue={`${taskBackendSummary.lifetimeCompleted} completions`}
          />
          <TaskStat label="Active tasks" value={taskBackendSummary.activeTaskCount} />
          <TaskStat label="Lifetime completed" value={taskBackendSummary.lifetimeCompleted} />
        </div>
        {settings.sponsored_withdrawals_unlocked ? null : (
          <div className="mt-4 rounded-[5px] border border-white/10 bg-white/[0.035] p-3">
            <div className="flex items-center gap-2 font-semibold text-slate-100">
              <Lock className="size-4 text-slate-400" />
              Sponsored withdrawals
            </div>
            <p className="mt-1 text-slate-400">
              Task earnings are recorded but locked until withdrawals open.
            </p>
          </div>
        )}
      </details>

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

function TaskStat({ label, value, subvalue }: { label: string; value: number | string; subvalue?: string }) {
  return (
    <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3">
      <p className="text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-100">{typeof value === "number" ? value.toLocaleString("en-US") : value}</p>
      {subvalue && <p className="mt-1 text-xs text-slate-500">{subvalue}</p>}
    </div>
  );
}
