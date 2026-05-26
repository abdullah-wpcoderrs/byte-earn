import { Copy, MailPlus, Save, Trash2 } from "lucide-react";
import { EmailBlastSendForm } from "./email-blast-send-form";
import { deleteEmailBlastAction, duplicateEmailBlastAction, updateEmailBlastAction } from "@/app/admin/actions";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextInput } from "@/components/ui/input";
import { getEmailBlastHistory } from "@/lib/admin";

export const dynamic = "force-dynamic";

function TextArea({ defaultValue, label, name }: { defaultValue: string; label: string; name: string }) {
  return (
    <label className="grid gap-2">
      <span className="font-medium text-slate-200">{label}</span>
      <textarea
        className="min-h-28 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 py-2 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
        defaultValue={defaultValue}
        name={name}
      />
    </label>
  );
}

export default async function AdminEmailBlastsPage() {
  const blasts = await getEmailBlastHistory();

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4 sm:p-5">
        <p className="text-muted">Saved email campaigns and delivery preparation history</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Email blast history</h1>
      </section>

      <section className="glass overflow-hidden">
        <div className="divide-y divide-white/10">
          {blasts.map((blast) => (
            <article className="grid gap-4 p-4 xl:grid-cols-[1fr_260px]" key={blast.id}>
              <form action={updateEmailBlastAction} className="grid gap-3">
                <input name="blastId" type="hidden" value={blast.id} />
                <div className="grid gap-3 md:grid-cols-[1fr_160px_120px]">
                  <TextInput defaultValue={blast.subject} disabled={!["draft", "failed"].includes(blast.status)} label="Subject" name="subject" />
                  <Select defaultValue={blast.audience} disabled={!["draft", "failed"].includes(blast.status)} label="Audience" name="audience">
                    <option value="all">All users</option>
                    <option value="active">Active users</option>
                    <option value="suspended">Suspended users</option>
                  </Select>
                  <label className="grid gap-2">
                    <span className="font-medium text-slate-200">Status</span>
                    <span className="inline-flex min-h-9 items-center rounded-[5px] border border-white/10 px-2.5 text-slate-200">{blast.status}</span>
                  </label>
                </div>
                <TextArea defaultValue={blast.htmlBody} label="HTML body" name="htmlBody" />
                <div className="flex flex-wrap items-center gap-2 text-muted">
                  <span>{blast.createdBy ?? "Admin"}</span>
                  <span>-</span>
                  <span>{blast.recipientCount} sent</span>
                  <span>-</span>
                  <time>{blast.createdAt.toLocaleString("en-NG")}</time>
                </div>
                <SubmitButton disabled={!["draft", "failed"].includes(blast.status)} icon={<Save className="size-4" />} pendingLabel="Saving..." type="submit">
                  Save changes
                </SubmitButton>
              </form>

              <div className="grid content-start gap-2">
                <EmailBlastSendForm blastId={blast.id} disabled={blast.status === "sending" || blast.status === "sent"} />
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
                <p className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3 leading-5 text-slate-300">{blast.bodyPreview || "No preview"}</p>
              </div>
              {blast.errorMessage ? <p className="text-rose-200 md:col-span-6">{blast.errorMessage}</p> : null}
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
