"use client";

import { Send } from "lucide-react";
import { sendEmailBlastAction } from "@/app/admin/actions";
import { SubmitButton } from "@/components/ui/submit-button";

type EmailBlastSendFormProps = {
  blastId: string;
  disabled: boolean;
};

export function EmailBlastSendForm({ blastId, disabled }: EmailBlastSendFormProps) {
  return (
    <form
      action={sendEmailBlastAction}
      onSubmit={(event) => {
        if (!window.confirm("Send this email blast to eligible recipients now?")) {
          event.preventDefault();
        }
      }}
    >
      <input name="blastId" type="hidden" value={blastId} />
      <SubmitButton className="w-full" disabled={disabled} icon={<Send className="size-4" />} pendingLabel="Sending..." type="submit" variant="secondary">
        Send
      </SubmitButton>
    </form>
  );
}
