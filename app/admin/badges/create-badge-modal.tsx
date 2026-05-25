"use client";

import { useState } from "react";
import { BadgePlus } from "lucide-react";
import { createBadgeAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Modal } from "@/components/ui/modal";
import { TextInput } from "@/components/ui/input";

function TextArea({ label, name }: { label: string; name: string }) {
  return (
    <label className="grid gap-2">
      <span className="font-medium text-slate-200">{label}</span>
      <textarea
        className="min-h-28 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 py-2 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
        name={name}
        required
      />
    </label>
  );
}

export function CreateBadgeModal() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <Button icon={<BadgePlus className="size-4" />} onClick={() => setOpen(true)} type="button">
        Create badge
      </Button>

      <Modal className="max-w-xl" onClose={() => setOpen(false)} open={open} title="Create badge">
        <form action={createBadgeAction} className="grid gap-3">
          <TextInput label="Name" name="name" required />
          <TextInput defaultValue="#5fd7ff" label="Color" name="color" required />
          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Badge image</span>
            <input
              accept="image/gif,image/jpeg,image/png,image/svg+xml,image/webp"
              className="min-h-9 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 py-1 text-slate-300 file:mr-3 file:rounded-[5px] file:border-0 file:bg-cyan-300 file:px-2.5 file:py-1 file:font-semibold file:text-slate-950"
              name="imageFile"
              required
              type="file"
            />
          </label>
          <TextArea label="Description" name="description" />
          <Button icon={<BadgePlus className="size-4" />} type="submit">
            Create badge
          </Button>
        </form>
      </Modal>
    </>
  );
}
