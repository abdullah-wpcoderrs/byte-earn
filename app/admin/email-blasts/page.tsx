import { MailPlus } from "lucide-react";
import { sendEmailBlastAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { getEmailBlastHistory } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminEmailBlastsPage() {
  const blasts = await getEmailBlastHistory();

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4 sm:p-5">
        <p className="text-muted">Saved email campaigns and delivery preparation history</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Email blast history</h1>
      </section>

      <section className="glass overflow-hidden">
        <div className="hidden grid-cols-[1.1fr_100px_90px_1fr_150px_100px] border-b border-white/10 px-4 py-3 font-semibold text-slate-300 md:grid">
          <span>Subject</span>
          <span>Audience</span>
          <span>Status</span>
          <span>Preview</span>
          <span>Created</span>
          <span />
        </div>
        <div className="divide-y divide-white/10">
          {blasts.map((blast) => (
            <article className="grid gap-2 p-4 md:grid-cols-[1.1fr_100px_90px_1fr_150px_100px] md:items-center" key={blast.id}>
              <div>
                <p className="font-semibold text-slate-100">{blast.subject}</p>
                <p className="mt-1 text-muted">
                  {blast.createdBy ?? "Admin"} - {blast.recipientCount} sent
                </p>
              </div>
              <span className="rounded-[5px] border border-white/10 px-2 py-1 text-center text-slate-200">{blast.audience}</span>
              <span className="rounded-[5px] border border-white/10 px-2 py-1 text-center text-slate-200">{blast.status}</span>
              <p className="leading-5 text-slate-300">{blast.bodyPreview || "No preview"}</p>
              <time className="text-slate-400">{blast.createdAt.toLocaleString("en-NG")}</time>
              <form action={sendEmailBlastAction}>
                <input name="blastId" type="hidden" value={blast.id} />
                <Button className="w-full" disabled={blast.status === "sending"} type="submit" variant="secondary">
                  Send
                </Button>
              </form>
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
