import { Archive, BellPlus, MailPlus, Save, Trash2 } from "lucide-react";
import {
  archiveNotificationAction,
  createEmailBlastAction,
  createNotificationAction,
  deleteNotificationAction,
  updatePlatformSettingsAction,
} from "@/app/admin/actions";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextInput } from "@/components/ui/input";
import { getAdminNotifications, getOrCreatePlatformSettings } from "@/lib/admin";

export const dynamic = "force-dynamic";

type ImpactRow = {
  detail: string;
  label: string;
  routes: string[];
  state: string;
};

function TextArea({ label, name, placeholder }: { label: string; name: string; placeholder?: string }) {
  return (
    <label className="grid gap-2">
      <span className="font-medium text-slate-200">{label}</span>
      <textarea
        className="min-h-28 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 py-2 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
        name={name}
        placeholder={placeholder}
      />
    </label>
  );
}

export default async function AdminPlatformPage() {
  const [settings, notifications] = await Promise.all([
    getOrCreatePlatformSettings(),
    getAdminNotifications(),
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
        ? "Users can view and complete Monetag, CPAGrip, and internal tasks."
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
      detail: settings.under_construction
        ? "Protected user routes are intercepted by the construction screen."
        : "Protected user routes remain available to eligible users.",
      label: "Under construction",
      routes: ["/feed", "/tasks", "/wallet", "/leaderboard", "/profile"],
      state: settings.under_construction ? "Enabled" : "Disabled",
    },
    {
      detail: "Task reward progress uses this cap when watch/task credit enforcement is active.",
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

      <form action={updatePlatformSettingsAction} className="glass grid gap-4 p-4 lg:grid-cols-2">
        <input name="settingsId" type="hidden" value={settings.id} />
        {[
          ["postApprovalRequired", "Require post approval", settings.post_approval_required],
          ["sponsoredTasksEnabled", "Enable sponsored tasks feature", settings.sponsored_tasks_enabled],
          ["sponsoredWithdrawalsUnlocked", "Unlock sponsored withdrawals", settings.sponsored_withdrawals_unlocked],
          ["underConstruction", "Under-construction global switch", settings.under_construction],
        ].map(([name, label, checked]) => (
          <label className="flex min-h-12 items-center justify-between gap-3 rounded-[5px] border border-white/10 bg-white/[0.055] px-3" key={String(name)}>
            <span className="font-semibold text-slate-100">{label}</span>
            <input className="size-4 accent-cyan-300" defaultChecked={Boolean(checked)} name={String(name)} type="checkbox" />
          </label>
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

      <section className="grid gap-4 xl:grid-cols-[0.85fr_1.15fr]">
        <form action={createNotificationAction} className="glass grid content-start gap-3 p-4">
          <h2 className="text-base font-semibold">Platform notification</h2>
          <TextInput label="Title" name="title" />
          <TextArea label="Body" name="body" />
          <Select label="Audience" name="audience" defaultValue="all">
            <option value="all">All users</option>
            <option value="active">Active users</option>
            <option value="suspended">Suspended users</option>
          </Select>
          <SubmitButton icon={<BellPlus className="size-4" />} pendingLabel="Creating..." type="submit">
            Create
          </SubmitButton>
        </form>

        <form action={createEmailBlastAction} className="glass grid content-start gap-3 p-4">
          <h2 className="text-base font-semibold">HTML email blast</h2>
          <TextInput label="Subject" name="subject" />
          <TextArea label="HTML body" name="htmlBody" placeholder="<p>Campaign update</p>" />
          <Select label="Audience" name="audience" defaultValue="all">
            <option value="all">All users</option>
            <option value="active">Active users</option>
            <option value="suspended">Suspended users</option>
          </Select>
          <SubmitButton icon={<MailPlus className="size-4" />} pendingLabel="Saving blast..." type="submit">
            Save blast
          </SubmitButton>
        </form>
      </section>

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
              </div>
              <span className="rounded-[5px] border border-white/10 px-2 py-1 text-center text-slate-200">{notification.audience}</span>
              <time className="text-slate-400">{notification.createdAt.toLocaleString("en-NG")}</time>
              <div className="grid grid-cols-2 gap-2">
                <form action={archiveNotificationAction}>
                  <input name="notificationId" type="hidden" value={notification.id} />
                  <SubmitButton className="w-full" disabled={Boolean(notification.archivedAt)} icon={<Archive className="size-4" />} pendingLabel="Archiving..." type="submit" variant="secondary">
                    Archive
                  </SubmitButton>
                </form>
                <form action={deleteNotificationAction}>
                  <input name="notificationId" type="hidden" value={notification.id} />
                  <SubmitButton className="w-full" icon={<Trash2 className="size-4" />} pendingLabel="Deleting..." type="submit" variant="danger">
                    Delete
                  </SubmitButton>
                </form>
              </div>
            </article>
          ))}
        </div>
        {notifications.length === 0 ? <div className="p-6 text-center text-muted">No notifications have been created yet.</div> : null}
      </section>
    </div>
  );
}
