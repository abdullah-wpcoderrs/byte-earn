"use client";

import { useState } from "react";
import { FlaskConical } from "lucide-react";
import { sendTestEmailBlastAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";

type EmailBlastTestSendModalProps = {
  blastId: string;
  subject: string;
};

export function EmailBlastTestSendModal({ blastId, subject }: EmailBlastTestSendModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className="w-full" icon={<FlaskConical className="size-4" />} onClick={() => setOpen(true)} type="button" variant="secondary">
        Send test email
      </Button>

      <Modal className="max-w-lg" onClose={() => setOpen(false)} open={open} title="Send test email">
        <form action={sendTestEmailBlastAction} className="grid gap-4">
          <input name="blastId" type="hidden" value={blastId} />
          <div className="rounded-[5px] border border-white/10 bg-white/[0.04] p-4 text-sm leading-6 text-slate-300">
            <p className="font-semibold text-slate-100">{subject}</p>
            <p className="mt-2">This sends a single test copy without changing the draft status or delivery progress.</p>
          </div>
          <TextInput label="Recipient email" name="recipientEmail" placeholder="name@example.com" required type="email" />
          <SubmitButton className="w-full" icon={<FlaskConical className="size-4" />} pendingLabel="Sending test..." type="submit">
            Send test email
          </SubmitButton>
        </form>
      </Modal>
    </>
  );
}
