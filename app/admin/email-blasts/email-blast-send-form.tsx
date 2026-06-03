"use client";

import { startTransition, useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { LoaderCircle, Send } from "lucide-react";
import { sendEmailBlastAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";

type EmailBlastSendFormProps = {
  blastId: string;
  failedRecipientCount: number;
  processedRecipientCount: number;
  queuedRecipientCount: number;
  recipientCount: number;
  status: string;
  subject: string;
};

type DeliveryProgress = {
  done: boolean;
  failedRecipientCount: number;
  processedRecipientCount: number;
  queuedRecipientCount: number;
  recipientCount: number;
  status: string;
};

function queueLabel(status: string, failedRecipientCount: number) {
  if (status === "failed" && failedRecipientCount > 0) {
    return "Retry failed recipients";
  }

  if (status === "queued" || status === "sending") {
    return "Processing delivery";
  }

  return "Queue delivery";
}

export function EmailBlastSendForm({
  blastId,
  failedRecipientCount,
  processedRecipientCount,
  queuedRecipientCount,
  recipientCount,
  status,
  subject,
}: EmailBlastSendFormProps) {
  const router = useRouter();
  const processingRef = useRef(false);
  const [confirmOpen, setConfirmOpen] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [liveProgress, setLiveProgress] = useState<DeliveryProgress | null>(
    status === "queued" || status === "sending"
      ? {
          done: false,
          failedRecipientCount,
          processedRecipientCount,
          queuedRecipientCount,
          recipientCount,
          status,
        }
      : null,
  );

  useEffect(() => {
    if (!["queued", "sending"].includes(status) || processingRef.current) {
      return;
    }

    let cancelled = false;
    processingRef.current = true;

    async function processQueue() {
      while (!cancelled) {
        const response = await fetch("/api/admin/email-blasts/process", {
          body: JSON.stringify({ blastId }),
          headers: { "Content-Type": "application/json" },
          method: "POST",
        });

        const payload = await response.json().catch(() => null);

        if (!response.ok) {
          if (response.status === 409 && payload?.done) {
            break;
          }
          setErrorMessage(payload?.error ?? "Email delivery could not continue.");
          break;
        }

        setLiveProgress(payload);

        if (payload?.done) {
          break;
        }
      }

      processingRef.current = false;
      if (!cancelled) {
        startTransition(() => router.refresh());
      }
    }

    void processQueue();

    return () => {
      cancelled = true;
    };
  }, [blastId, router, status]);

  const progress = liveProgress ?? {
    done: false,
    failedRecipientCount,
    processedRecipientCount,
    queuedRecipientCount,
    recipientCount,
    status,
  };
  const queueable = status === "draft" || status === "failed";
  const processing = status === "queued" || status === "sending";

  return (
    <>
      <Button
        className="w-full"
        disabled={!queueable}
        icon={processing ? <LoaderCircle className="size-4 animate-spin" /> : <Send className="size-4" />}
        onClick={() => setConfirmOpen(true)}
        type="button"
        variant="secondary"
      >
        {queueLabel(status, failedRecipientCount)}
      </Button>

      <div className="rounded-[5px] border border-white/10 bg-white/[0.04] px-3 py-2 text-sm text-slate-300">
        <p>Delivered: {progress.recipientCount}</p>
        <p>Processed: {progress.processedRecipientCount}/{Math.max(progress.queuedRecipientCount, progress.processedRecipientCount)}</p>
        <p>Failed: {progress.failedRecipientCount}</p>
        {errorMessage ? <p className="mt-2 text-rose-200">{errorMessage}</p> : null}
      </div>

      <Modal className="max-w-lg" onClose={() => setConfirmOpen(false)} open={confirmOpen} title="Queue email delivery">
        <form action={sendEmailBlastAction} className="grid gap-4">
          <input name="blastId" type="hidden" value={blastId} />
          <div className="rounded-[5px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300">
            <p className="font-semibold text-slate-100">{subject}</p>
            <p className="mt-2">
              {status === "failed" && failedRecipientCount > 0
                ? `This will queue a retry for the ${failedRecipientCount} recipients that failed in the previous run.`
                : "This will snapshot the eligible recipients and start batched delivery from the email history page."}
            </p>
          </div>
          <SubmitButton className="w-full" icon={<Send className="size-4" />} pendingLabel="Queueing..." type="submit">
            {status === "failed" && failedRecipientCount > 0 ? "Retry failed recipients" : "Queue delivery"}
          </SubmitButton>
        </form>
      </Modal>
    </>
  );
}
