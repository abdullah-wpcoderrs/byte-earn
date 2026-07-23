import { CheckCircle2, Save, ServerCog, TriangleAlert } from "lucide-react";
import { updatePlatformSettingsAction } from "@/app/admin/actions";
import { NotificationHistoryActions } from "./notification-history-actions";
import { PlatformComposerTools } from "./platform-composer-tools";
import { TextInput } from "@/components/ui/input";
import { SubmitButton } from "@/components/ui/submit-button";
import { getAdminNotificationRecipients, getAdminNotifications, getBackendDiagnostics, getOrCreatePlatformSettings, getPlatformReadiness } from "@/lib/admin";

export const dynamic = "force-dynamic";

type ImpactRow = {
  detail: string;
  label: string;
  routes: string[];
  state: string;
};

export default async function AdminPlatformPage() {
  const [settings, notifications, readiness, recipients, diagnostics] = await Promise.all([
    getOrCreatePlatformSettings(),
    getAdminNotifications(),
    getPlatformReadiness(),
    getAdminNotificationRecipients(),
    getBackendDiagnostics(),
  ]);
  const impactRows: ImpactRow[] = [
    {
      detail: settings.post_approval_required
        ? "New uploads enter moderation before feed/profile publication."
        : "New uploads publish immediately and appear on the creator profile.",
      label: "Post approval",
      routes: ["/upload", "/feed", "/profile", "/admin/moderation"],
      state: settings.post_approval_required ? "Approval required" : "Auto-publish",
    },
    {
      detail: `Uploads are rejected server-side above ${settings.max_upload_size_mb ?? 50} MB.`,
      label: "Max upload size",
      routes: ["/feed create modal", "/upload"],
      state: `${settings.max_upload_size_mb ?? 50} MB`,
    },
    {
      detail: settings.sponsored_tasks_enabled
        ? "Users can view and complete Adsterra, CPAGrip, and internal tasks."
        : "Users see a custom waiting screen; task sessions are blocked.",
      label: "Sponsored tasks",
      routes: ["/tasks", "/admin/tasks"],
      state: settings.sponsored_tasks_enabled ? "Enabled" : "Disabled",
    },
    {
      detail: settings.sponsored_withdrawals_unlocked
        ? "Sponsored task credits are available for payout."
        : "Sponsored task credits remain locked outside fallback unlock rules.",
      label: "Sponsored withdrawals",
      routes: ["/wallet", "/admin/withdrawals"],
      state: settings.sponsored_withdrawals_unlocked ? "Unlocked" : "Locked",
    },
    {
      detail: settings.referral_withdrawals_unlocked
        ? "Referral credits are available for payout."
        : "Referral credits remain locked outside fallback unlock rules.",
      label: "Referral withdrawals",
      routes: ["/wallet", "/admin/withdrawals"],
      state: settings.referral_withdrawals_unlocked ? "Unlocked" : "Locked",
    },
    {
      detail: settings.watch_time_withdrawals_unlocked
        ? "Watch time credits are available for payout."
        : "Watch time credits remain locked outside fallback unlock rules.",
      label: "Watch time withdrawals",
      routes: ["/wallet", "/admin/withdrawals"],
      state: settings.watch_time_withdrawals_unlocked ? "Unlocked" : "Locked",
    },
    {
      detail: settings.admin_credit_withdrawals_unlocked
        ? "Admin credits are available for payout."
        : "Admin credits remain locked outside fallback unlock rules.",
      label: "Admin credit withdrawals",
      routes: ["/wallet", "/admin/withdrawals"],
      state: settings.admin_credit_withdrawals_unlocked ? "Unlocked" : "Locked",
    },
    {
      detail: settings.adjustment_withdrawals_unlocked
        ? "Adjustment credits are available for payout."
        : "Adjustment credits remain locked outside fallback unlock rules.",
      label: "Adjustment withdrawals",
      routes: ["/wallet", "/admin/withdrawals"],
      state: settings.adjustment_withdrawals_unlocked ? "Unlocked" : "Locked",
    },
    {
      detail: settings.under_construction
        ? "Protected user routes are intercepted by the construction screen."
        : "Protected user routes remain available to eligible users.",
      label: "Under construction",
      routes: ["/feed", "/tasks", "/wallet", "/leaderboard", "/profile"],
      state: settings.under_construction ? "Enabled" : "Disabled",
    },
    {
      detail: "Completed internal watch-media tasks stop rewarding once a user reaches this many watched seconds for the day.",
      label: "Daily watch cap",
      routes: ["/tasks", "/wallet"],
      state: `${settings.daily_watch_limit_seconds} seconds`,
    },
  ];

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4 sm:p-5">
        <p className="text-muted">Global switches, notifications, email blasts, and badges</p>
        <div className="mt-1 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <h1 className="text-[28px] font-semibold leading-tight">Platform tools</h1>
          <div className="flex flex-wrap gap-2">
            <a className="rounded-[5px] border border-white/10 px-3 py-2 font-semibold text-cyan-100" href="/admin/email-blasts">
              Email history
            </a>
            <a className="rounded-[5px] border border-white/10 px-3 py-2 font-semibold text-cyan-100" href="/admin/badges">
              View badges
            </a>
          </div>
        </div>
      </section>

      <section className="glass overflow-hidden">
        <div className="border-b border-white/10 p-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div>
              <h2 className="text-base font-semibold">Platform readiness</h2>
              <p className="mt-1 text-muted">Launch-gate checks for payments, providers, migrations, storage, email, and reconciliation freshness.</p>
            </div>
            <span className="inline-flex items-center gap-2 rounded-[5px] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm font-semibold text-slate-200">
              <ServerCog className="size-4 text-cyan-100" />
              {readiness.readyCount}/{readiness.totalCount} launch checks passing
            </span>
          </div>
        </div>
        <div className="divide-y divide-white/10">
          {readiness.checks.map((check) => (
            <article className="grid gap-3 p-4 lg:grid-cols-[180px_120px_1fr]" key={check.key}>
              <p className="font-semibold text-slate-100">{check.label}</p>
              <span className={`inline-flex items-center justify-center gap-2 rounded-[5px] border px-2 py-1 text-[11px] font-semibold ${check.ready ? "border-emerald-200/20 bg-emerald-300/10 text-emerald-100" : "border-amber-200/20 bg-amber-300/10 text-amber-100"}`}>
                {check.ready ? <CheckCircle2 className="size-3.5" /> : <TriangleAlert className="size-3.5" />}
                {check.ready ? "Ready" : "Needs setup"}
              </span>
              <p className="leading-5 text-slate-300">{check.detail}</p>
            </article>
          ))}
        </div>
      </section>

      <section className="glass overflow-hidden">
        <div className="border-b border-white/10 p-4">
          <h2 className="text-base font-semibold">Backend diagnostics</h2>
          <p className="mt-1 text-muted">Aggregate task, provider, withdrawal, and accounting consistency checks.</p>
        </div>
        <div className="grid gap-3 p-4 md:grid-cols-2 xl:grid-cols-4">
          <DiagnosticStat label="Active tasks" value={diagnostics.sponsoredTaskTotals.activeTaskCount} />
          <DiagnosticStat label="Task credits available" value={diagnostics.sponsoredTaskTotals.totalActiveTaskRewardCredits} />
          <DiagnosticStat label="Completed sessions" value={diagnostics.sponsoredTaskTotals.completedSessions} />
          <DiagnosticStat label="Pending sessions" value={diagnostics.sponsoredTaskTotals.pendingSessions} />
          <DiagnosticStat label="Suspicious sessions" value={diagnostics.sponsoredTaskTotals.suspiciousSessions} />
          <DiagnosticStat label="Rejected sessions" value={diagnostics.sponsoredTaskTotals.rejectedSessions} />
          <DiagnosticStat label="Provider clicks" value={diagnostics.providerTotals.clicks} />
          <DiagnosticStat label="Provider impressions" value={diagnostics.providerTotals.impressions} />
          <DiagnosticStat label="Provider revenue" value={diagnostics.providerTotals.revenue.toFixed(4)} />
          <DiagnosticStat label="Processed events" value={diagnostics.providerTotals.processedEvents} />
          <DiagnosticStat label="Unprocessed events" value={diagnostics.providerTotals.unprocessedEvents} />
          <DiagnosticStat label="Pending withdrawal credits" value={diagnostics.withdrawalTotals.pendingCredits} />
        </div>
        <div className="grid gap-3 border-t border-white/10 p-4 lg:grid-cols-3">
          <ConsistencyPanel
            count={diagnostics.consistency.creditBalanceMismatches.length}
            detail="profiles.credits_balance vs summed credit_ledger"
            label="Credit balance mismatches"
          />
          <ConsistencyPanel
            count={diagnostics.consistency.referralCountMismatches.length}
            detail="profiles.referral_count vs qualified referral_attributions"
            label="Referral count mismatches"
          />
          <ConsistencyPanel
            count={diagnostics.consistency.taskCompletionMismatches.length}
            detail="sponsored_tasks.completions_count vs completed task_sessions"
            label="Task completion mismatches"
          />
        </div>
      </section>

      <form action={updatePlatformSettingsAction} className="glass grid gap-4 p-4 lg:grid-cols-2">
        <input name="settingsId" type="hidden" value={settings.id} />

        {/* Platform-level switches that are not tied to a single earning stream */}
        <p className="lg:col-span-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Platform</p>
        {[
          ["postApprovalRequired", "Require post approval", settings.post_approval_required],
          ["sponsoredTasksEnabled", "Enable sponsored tasks feature", settings.sponsored_tasks_enabled],
          ["underConstruction", "Under-construction global switch", settings.under_construction],
        ].map(([name, label, checked]) => (
          <SettingToggle key={String(name)} label={String(label)} name={String(name)} checked={Boolean(checked)} />
        ))}

        {/* The two earning streams users see in the wallet */}
        <p className="lg:col-span-2 mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Earning streams (user-facing)</p>
        {[
          ["referralWithdrawalsUnlocked", "Unlock referral withdrawals", settings.referral_withdrawals_unlocked],
          ["sponsoredWithdrawalsUnlocked", "Unlock sponsored withdrawals", settings.sponsored_withdrawals_unlocked],
        ].map(([name, label, checked]) => (
          <SettingToggle key={String(name)} label={String(label)} name={String(name)} checked={Boolean(checked)} />
        ))}

        {/* Legacy sources kept in the data layer; not shown in the user wallet */}
        <p className="lg:col-span-2 mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Legacy earning categories (data layer only)</p>
        <p className="lg:col-span-2 -mt-2 leading-5 text-slate-400">
          These no longer surface in the user wallet. Leave locked unless you are supporting a historical balance.
        </p>
        {[
          ["watchTimeWithdrawalsUnlocked", "Unlock watch time withdrawals", settings.watch_time_withdrawals_unlocked],
          ["adminCreditWithdrawalsUnlocked", "Unlock admin credit withdrawals", settings.admin_credit_withdrawals_unlocked],
          ["adjustmentWithdrawalsUnlocked", "Unlock adjustment withdrawals", settings.adjustment_withdrawals_unlocked],
        ].map(([name, label, checked]) => (
          <SettingToggle key={String(name)} label={String(label)} name={String(name)} checked={Boolean(checked)} />
        ))}

        <TextInput defaultValue={settings.daily_watch_limit_seconds} label="Daily watch limit seconds" name="dailyWatchLimitSeconds" inputMode="numeric" />
        <TextInput defaultValue={settings.max_upload_size_mb ?? 50} label="Max upload size MB" max={100} min={1} name="maxUploadSizeMb" inputMode="numeric" />
        <SubmitButton className="lg:col-span-2" icon={<Save className="size-4" />} pendingLabel="Saving settings..." type="submit">
          Save platform settings
        </SubmitButton>
      </form>

      <section className="glass overflow-hidden">
        <div className="border-b border-white/10 p-4">
          <h2 className="text-base font-semibold">Settings impact</h2>
          <p className="mt-1 text-muted">Where each platform setting is enforced after save.</p>
        </div>
        <div className="divide-y divide-white/10">
          {impactRows.map((item) => (
            <article className="grid gap-3 p-4 lg:grid-cols-[180px_140px_1fr_1.1fr] lg:items-center" key={item.label}>
              <p className="font-semibold text-slate-100">{item.label}</p>
              <span className="rounded-[5px] border border-cyan-200/20 bg-cyan-300/10 px-2 py-1 text-center text-[11px] font-semibold text-cyan-100">
                {item.state}
              </span>
              <p className="leading-5 text-slate-300">{item.detail}</p>
              <div className="flex flex-wrap gap-1.5">
                {item.routes.map((route) => (
                  <span className="rounded-[5px] border border-white/10 bg-white/[0.045] px-2 py-1 text-[11px] font-semibold text-slate-300" key={route}>
                    {route}
                  </span>
                ))}
              </div>
            </article>
          ))}
        </div>
      </section>

      <PlatformComposerTools recipients={recipients} />

      <section className="glass overflow-hidden">
        <div className="border-b border-white/10 p-4">
          <h2 className="text-base font-semibold">Notification history</h2>
          <p className="mt-1 text-muted">Archive or delete platform notifications from user trays.</p>
        </div>
        <div className="divide-y divide-white/10">
          {notifications.map((notification) => (
            <article className="grid gap-3 p-4 lg:grid-cols-[1fr_130px_150px_220px] lg:items-center" key={notification.id}>
              <div>
                <div className="flex flex-wrap items-center gap-2">
                  <p className="font-semibold text-slate-100">{notification.title}</p>
                  {notification.archivedAt ? <span className="rounded-[5px] border border-amber-200/20 bg-amber-300/10 px-2 py-1 text-[11px] font-semibold text-amber-100">Archived</span> : null}
                </div>
                <p className="mt-1 leading-5 text-slate-300">{notification.body}</p>
                {notification.recipientLabel ? <p className="mt-2 text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Recipient: {notification.recipientLabel}</p> : null}
              </div>
              <span className="rounded-[5px] border border-white/10 px-2 py-1 text-center text-slate-200">{notification.audience}</span>
              <time className="text-slate-400">{notification.createdAt.toLocaleString("en-NG")}</time>
              <NotificationHistoryActions archived={Boolean(notification.archivedAt)} notificationId={notification.id} />
            </article>
          ))}
        </div>
        {notifications.length === 0 ? <div className="p-6 text-center text-muted">No notifications have been created yet.</div> : null}
      </section>
    </div>
  );
}

function SettingToggle({ label, name, checked }: { label: string; name: string; checked: boolean }) {
  return (
    <label className="flex min-h-12 items-center justify-between gap-3 rounded-[5px] border border-white/10 bg-white/[0.055] px-3" key={name}>
      <span className="font-semibold text-slate-100">{label}</span>
      <input className="size-4 accent-cyan-300" defaultChecked={checked} name={name} type="checkbox" />
    </label>
  );
}

function DiagnosticStat({ label, value }: { label: string; value: number | string }) {
  return (
    <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3">
      <p className="text-slate-400">{label}</p>
      <p className="mt-1 text-base font-semibold text-slate-100">{typeof value === "number" ? value.toLocaleString("en-US") : value}</p>
    </div>
  );
}

function ConsistencyPanel({ count, detail, label }: { count: number; detail: string; label: string }) {
  return (
    <div className={`rounded-[5px] border p-3 ${count === 0 ? "border-emerald-200/20 bg-emerald-300/10" : "border-amber-200/20 bg-amber-300/10"}`}>
      <p className="font-semibold text-slate-100">{label}</p>
      <p className="mt-1 text-[24px] font-semibold leading-tight">{count.toLocaleString("en-US")}</p>
      <p className="mt-1 leading-5 text-slate-300">{detail}</p>
    </div>
  );
}
