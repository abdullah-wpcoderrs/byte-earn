import { BadgePlus, BellPlus, MailPlus, Save } from "lucide-react";
import {
  createBadgeAction,
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
        className="min-h-28 rounded-[5px] border border-white/10 bg-white/[0.055] px-3 py-3 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
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
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Platform tools</h1>
      </section>

      <form action={updatePlatformSettingsAction} className="glass grid gap-4 p-4 lg:grid-cols-2">
        <input name="settingsId" type="hidden" value={settings.id} />
        {[
          ["postApprovalRequired", "Require post approval", settings.postApprovalRequired],
          ["sponsoredWithdrawalsUnlocked", "Unlock sponsored withdrawals", settings.sponsoredWithdrawalsUnlocked],
          ["underConstruction", "Under-construction global switch", settings.underConstruction],
        ].map(([name, label, checked]) => (
          <label className="flex min-h-12 items-center justify-between gap-3 rounded-[5px] border border-white/10 bg-white/[0.055] px-3" key={String(name)}>
            <span className="font-semibold text-slate-100">{label}</span>
            <input className="size-4 accent-cyan-300" defaultChecked={Boolean(checked)} name={String(name)} type="checkbox" />
          </label>
        ))}
        <TextInput defaultValue={settings.dailyWatchLimitSeconds} label="Daily watch limit seconds" name="dailyWatchLimitSeconds" inputMode="numeric" />
        <Button className="lg:col-span-2" icon={<Save className="size-4" />} type="submit">
          Save platform settings
        </Button>
      </form>

      <section className="grid gap-4 xl:grid-cols-3">
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

        <form action={createBadgeAction} className="glass grid content-start gap-3 p-4">
          <h2 className="text-base font-semibold">Custom badge</h2>
          <TextInput label="Name" name="name" />
          <TextInput defaultValue="#5fd7ff" label="Color" name="color" />
          <TextArea label="Description" name="description" />
          <Button icon={<BadgePlus className="size-4" />} type="submit">
            Create badge
          </Button>
        </form>
      </section>
    </div>
  );
}
