"use client";

import { Upload } from "lucide-react";
import { useUpload } from "@/components/upload/upload-provider";

type FeedUploadButtonProps = {
  compact?: boolean;
};

// The composer itself is mounted globally in AppShell; this button just opens it.
// `?upload=1` / `?updated=...` handling lives in UploadProvider.
export function FeedUploadButton({ compact = false }: FeedUploadButtonProps) {
  const { openUpload } = useUpload();

  if (compact) {
    return null;
  }

  return (
    <button
      className="inline-flex min-h-9 items-center justify-center gap-2 rounded-[5px] bg-cyan-300 px-2.5 font-semibold text-slate-950 transition hover:bg-cyan-200"
      onClick={openUpload}
      type="button"
    >
      <Upload className="size-4" />
      Create
    </button>
  );
}
