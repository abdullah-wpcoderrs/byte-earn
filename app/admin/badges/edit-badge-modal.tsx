"use client";

import { useState } from "react";
import { Pencil } from "lucide-react";
import { updateBadgeAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextArea } from "@/components/ui/textarea";

type EditBadgeModalProps = {
  badge: {
    color: string;
    description: string;
    id: string;
    imageUrl: string | null;
    name: string;
  };
};

export function EditBadgeModal({ badge }: EditBadgeModalProps) {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button className="w-full" icon={<Pencil className="size-4" />} onClick={() => setOpen(true)} type="button" variant="secondary">
        Edit
      </Button>

      <Modal className="max-w-xl" onClose={() => setOpen(false)} open={open} title="Edit badge">
        <form action={updateBadgeAction} className="grid gap-3">
          <input name="badgeId" type="hidden" value={badge.id} />
          <TextInput defaultValue={badge.name} label="Name" name="name" required />
          <TextInput defaultValue={badge.color} label="Color" name="color" required />
          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Replace badge image</span>
            <input
              accept="image/gif,image/jpeg,image/png,image/svg+xml,image/webp"
              className="min-h-9 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 py-1 text-slate-300 file:mr-3 file:rounded-[5px] file:border-0 file:bg-cyan-300 file:px-2.5 file:py-1 file:font-semibold file:text-slate-950"
              name="imageFile"
              type="file"
            />
          </label>
          {badge.imageUrl ? <p className="text-xs text-slate-400">Leave the file field empty to keep the current image.</p> : null}
          <TextArea defaultValue={badge.description} label="Description" name="description" required />
          <SubmitButton icon={<Pencil className="size-4" />} pendingLabel="Saving badge..." type="submit">
            Save badge
          </SubmitButton>
        </form>
      </Modal>
    </>
  );
}
