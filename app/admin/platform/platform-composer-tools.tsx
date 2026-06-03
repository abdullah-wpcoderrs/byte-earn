import { MailPlus } from "lucide-react";
import { EmailBlastComposerModal } from "@/components/admin/email-blast-composer-modal";
import { NotificationComposerModal } from "@/components/admin/notification-composer-modal";
import type { AdminNotificationRecipientOption } from "@/lib/admin";

type PlatformComposerToolsProps = {
  recipients: AdminNotificationRecipientOption[];
};

export function PlatformComposerTools({ recipients }: PlatformComposerToolsProps) {
  return (
    <section className="grid gap-4 xl:grid-cols-[0.9fr_1.1fr]">
      <article className="glass grid gap-4 p-4">
        <div>
          <h2 className="text-base font-semibold">Platform notification</h2>
          <p className="mt-1 text-muted">Open a focused composer for short platform updates, whether you need a full audience blast or a single-user notice.</p>
        </div>
        <NotificationComposerModal recipients={recipients} />
      </article>

      <article className="glass grid gap-4 p-4">
        <div>
          <h2 className="text-base font-semibold">Email blast draft</h2>
          <p className="mt-1 text-muted">Use the rich text composer to design a campaign, preview it, and save the draft before delivery.</p>
        </div>
        <EmailBlastComposerModal compact />
        <div className="rounded-[5px] border border-white/10 bg-white/[0.035] px-3 py-3 text-sm text-slate-300">
          <div className="flex items-center gap-2">
            <MailPlus className="size-4 text-cyan-100" />
            <span>Drafts stay editable until queued, and delivery now runs in resumable batches from the email history page.</span>
          </div>
        </div>
      </article>
    </section>
  );
}
