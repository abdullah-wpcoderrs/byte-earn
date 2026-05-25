"use client";

import { Upload } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { Modal } from "@/components/ui/modal";
import { UploadPostForm } from "@/components/upload/upload-post-form";

type FeedUploadButtonProps = {
  compact?: boolean;
  defaultOpen?: boolean;
};

export function FeedUploadButton({ compact = false, defaultOpen = false }: FeedUploadButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(defaultOpen);

  function closeModal() {
    setOpen(false);
    if (defaultOpen) {
      router.replace("/feed", { scroll: false });
    }
  }

  return (
    <>
      {compact ? null : (
        <button
          className="inline-flex min-h-9 items-center justify-center gap-2 rounded-[5px] bg-cyan-300 px-2.5 font-semibold text-slate-950 transition hover:bg-cyan-200"
          onClick={() => setOpen(true)}
          type="button"
        >
          <Upload className="size-4" />
          Create
        </button>
      )}

      <Modal className="max-w-3xl" onClose={closeModal} open={open} title="Create post">
        <UploadPostForm returnTo="feed" />
      </Modal>
    </>
  );
}
