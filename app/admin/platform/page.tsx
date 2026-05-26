import { BellPlus, MailPlus, Save } from "lucide-react";
import {
  createEmailBlastAction,
  createNotificationAction,
  updatePlatformSettingsAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/input";
import { getOrCreatePlatformSettings } from "@/lib/admin";

export const dynamic = "force-dynamic";

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
  const settings = await getOrCreatePlatformSettings();

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
        <Button className="lg:col-span-2" icon={<Save className="size-4" />} type="submit">
          Save platform settings
        </Button>
      </form>

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
          <Button icon={<BellPlus className="size-4" />} type="submit">
            Create
          </Button>
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
          <Button icon={<MailPlus className="size-4" />} type="submit">
            Save blast
          </Button>
        </form>
      </section>
    </div>
  );
}
