"use client";

import { useState } from "react";
import { MailPlus, Pencil } from "lucide-react";
import { createEmailBlastAction, updateEmailBlastAction } from "@/app/admin/actions";
import { RichTextEmailEditor } from "@/components/admin/rich-text-email-editor";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";

type EditableBlast = {
  audience: "active" | "all" | "suspended";
  htmlBody: string;
  id: string;
  status: string;
  subject: string;
};

type EmailBlastComposerModalProps = {
  blast?: EditableBlast;
  compact?: boolean;
};

export function EmailBlastComposerModal({ blast, compact = false }: EmailBlastComposerModalProps) {
  const [open, setOpen] = useState(false);
  const isEdit = Boolean(blast);

  return (
    <>
      {isEdit ? (
        <button
          className="grid size-9 place-items-center rounded-[5px] border border-white/10 bg-white/[0.055] text-slate-300 transition hover:bg-white/10 hover:text-white"
          onClick={() => setOpen(true)}
          title="Edit email blast"
          type="button"
        >
          <Pencil className="size-4" />
        </button>
      ) : (
        <Button className={compact ? "w-full self-start" : undefined} icon={<MailPlus className="size-4" />} onClick={() => setOpen(true)} type="button">
          Create email draft
        </Button>
      )}

      <Modal className="!max-w-[50rem]" onClose={() => setOpen(false)} open={open} title={isEdit ? "Edit email blast" : "Create email blast"}>
        <form
          action={async (formData) => {
            if (isEdit) {
              await updateEmailBlastAction(formData);
              return;
            }

            await createEmailBlastAction(formData);
          }}
          className="grid gap-4 pb-2"
        >
          {blast ? <input name="blastId" type="hidden" value={blast.id} /> : null}

          <div className="grid gap-3">
            <TextInput defaultValue={blast?.subject ?? ""} label="Subject" maxLength={120} name="subject" required />
            <Select defaultValue={blast?.audience ?? "all"} label="Audience" name="audience">
              <option value="all">All users</option>
              <option value="active">Active users</option>
              <option value="suspended">Suspended users</option>
            </Select>
          </div>

          <RichTextEmailEditor defaultValue={blast?.htmlBody ?? ""} label="Email body" name="htmlBody" required />

          <SubmitButton icon={<MailPlus className="size-4" />} pendingLabel={isEdit ? "Saving draft..." : "Saving draft..."} type="submit">
            {isEdit ? "Save changes" : "Save draft"}
          </SubmitButton>
        </form>
      </Modal>
    </>
  );
}
