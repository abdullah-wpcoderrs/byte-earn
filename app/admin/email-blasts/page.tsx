import { Copy, MailPlus, Trash2 } from "lucide-react";
import { EmailBlastComposerModal } from "@/components/admin/email-blast-composer-modal";
import { EmailBlastSendForm } from "./email-blast-send-form";
import { EmailBlastTestSendModal } from "./email-blast-test-send-modal";
import { sendPreviewEmailBlastAction } from "@/app/admin/actions";
import { deleteEmailBlastAction, duplicateEmailBlastAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { getEmailBlastHistory } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminEmailBlastsPage() {
  const blasts = await getEmailBlastHistory();

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4 sm:p-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between">
          <div>
            <p className="text-muted">Saved email campaigns and delivery preparation history</p>
            <h1 className="mt-1 text-[28px] font-semibold leading-tight">Email blast history</h1>
          </div>
          <a className="rounded-[5px] border border-white/10 px-3 py-2 font-semibold text-cyan-100" href="/admin/platform">
            Back to platform tools
          </a>
        </div>
      </section>

      <section className="glass overflow-hidden">
        <div className="divide-y divide-white/10">
          {blasts.map((blast) => (
            <article className="grid gap-4 p-4 xl:grid-cols-[1fr_280px]" key={blast.id}>
              <div className="grid gap-4">
                <div className="flex flex-col gap-3 lg:flex-row lg:items-start lg:justify-between">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <h2 className="text-lg font-semibold text-slate-100">{blast.subject}</h2>
                      <span className="rounded-[5px] border border-cyan-200/20 bg-cyan-300/10 px-2 py-1 text-[11px] font-semibold text-cyan-100">
                        {blast.status}
                      </span>
                      <span className="rounded-[5px] border border-white/10 px-2 py-1 text-[11px] font-semibold text-slate-300">
                        {blast.audience}
                      </span>
                    </div>
                    <div className="mt-2 flex flex-wrap items-center gap-2 text-sm text-slate-400">
                      <span>{blast.createdBy ?? "Admin"}</span>
                      <span>-</span>
                      <span>{blast.recipientCount} delivered</span>
                      <span>-</span>
                      <span>{blast.failedRecipientCount} failed</span>
                      <span>-</span>
                      <time>{blast.createdAt.toLocaleString("en-NG")}</time>
                    </div>
                  </div>
                  {["draft", "failed"].includes(blast.status) ? (
                    <EmailBlastComposerModal
                      blast={{
                        audience: blast.audience,
                        htmlBody: blast.htmlBody,
                        id: blast.id,
                        status: blast.status,
                        subject: blast.subject,
                      }}
                    />
                  ) : null}
                </div>

                <div className="rounded-[5px] border border-white/10 bg-white/[0.04] p-4">
                  <p className="text-sm leading-6 text-slate-300">{blast.bodyPreview || "No preview available yet."}</p>
                </div>

                {blast.errorMessage ? <p className="text-sm text-rose-200">{blast.errorMessage}</p> : null}
              </div>

              <div className="grid content-start gap-2">
                <EmailBlastSendForm
                  blastId={blast.id}
                  failedRecipientCount={blast.failedRecipientCount}
                  processedRecipientCount={blast.processedRecipientCount}
                  queuedRecipientCount={blast.queuedRecipientCount}
                  recipientCount={blast.recipientCount}
                  status={blast.status}
                  subject={blast.subject}
                />
                <form action={sendPreviewEmailBlastAction}>
                  <input name="blastId" type="hidden" value={blast.id} />
                  <SubmitButton className="w-full" icon={<MailPlus className="size-4" />} pendingLabel="Sending preview..." type="submit" variant="secondary">
                    Preview to me
                  </SubmitButton>
                </form>
                <EmailBlastTestSendModal blastId={blast.id} subject={blast.subject} />
                <form action={duplicateEmailBlastAction}>
                  <input name="blastId" type="hidden" value={blast.id} />
                  <SubmitButton className="w-full" icon={<Copy className="size-4" />} pendingLabel="Duplicating..." type="submit" variant="secondary">
                    Duplicate
                  </SubmitButton>
                </form>
                <form action={deleteEmailBlastAction}>
                  <input name="blastId" type="hidden" value={blast.id} />
                  <SubmitButton className="w-full" disabled={!["draft", "failed"].includes(blast.status)} icon={<Trash2 className="size-4" />} pendingLabel="Deleting..." type="submit" variant="danger">
                    Delete
                  </SubmitButton>
                </form>
              </div>
            </article>
          ))}
        </div>
        {blasts.length === 0 ? (
          <div className="grid min-h-32 place-items-center gap-2 p-4 text-muted">
            <MailPlus className="size-5" />
            No email blasts have been created yet.
          </div>
        ) : null}
      </section>
    </div>
  );
}
