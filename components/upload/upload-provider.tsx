"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, X } from "lucide-react";
import type { ReactNode } from "react";
import { UploadComposer } from "./upload-composer";

type UploadContextValue = {
  openUpload: () => void;
};

type ComposerUiState = {
  autoPick: boolean;
  error: string | null;
  open: boolean;
};

const UploadContext = createContext<UploadContextValue | null>(null);

const MAX_IMAGES = 8;

// Friendly text for server-action error codes (redirect returns ?error=...).
const errorMessages: Record<string, string> = {
  audio_required: "Please attach an MP3 track, or remove music.",
  caption_too_long: "Caption is too long (max 600 characters).",
  file_too_large: "One of the files is too large to upload.",
  invalid_audio_file: "Audio must be an MP3 file.",
  invalid_media_file: "That file type is not supported.",
  invalid_post_type: "Could not determine the post type.",
  media_required: "Please choose an image or video first.",
  settings_unavailable: "Upload settings are unavailable. Try again shortly.",
  too_many_media_files: `You can attach up to ${MAX_IMAGES} images.`,
};

export function UploadProvider({ children }: { children: ReactNode }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ui, setUi] = useState<ComposerUiState>({ autoPick: false, error: null, open: false });

  const openUpload = useCallback(() => {
    setUi({ autoPick: true, error: null, open: true });
  }, []);

  const closeUpload = useCallback(() => {
    setUi((previous) => ({ autoPick: false, error: previous.error, open: false }));
  }, []);

  const handleAutoPickDone = useCallback(() => {
    setUi((previous) => ({ ...previous, autoPick: false }));
  }, []);

  const errorCode = searchParams.get("error");
  const updated = searchParams.get("updated");
  const uploadFlag = searchParams.get("upload");
  const hasUpdated = updated === "post_published" || updated === "post_submitted";
  const hasUploadFlag = uploadFlag === "1";
  const hasSignal = Boolean(errorCode) || hasUpdated || hasUploadFlag;

  // Sync composer state to URL signals (?error / ?updated / ?upload=1) on navigation.
  useEffect(() => {
    if (!hasSignal) {
      return;
    }

    let next: ComposerUiState;
    if (errorCode) {
      next = { autoPick: false, error: errorMessages[errorCode] ?? "Could not create the post. Please try again.", open: false };
    } else if (hasUpdated) {
      next = { autoPick: false, error: null, open: false };
    } else {
      next = { autoPick: false, error: null, open: true };
    }
    // The URL bar is an external system; mirroring it into state on navigation is the intended effect use.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setUi(next);

    // Consume the signal by stripping these params from the URL.
    const params = new URLSearchParams(window.location.search);
    params.delete("error");
    params.delete("upload");
    params.delete("updated");
    params.delete("post");
    const remaining = params.toString();
    router.replace(remaining ? `${pathname}?${remaining}` : pathname, { scroll: false });
  }, [errorCode, hasSignal, hasUpdated, hasUploadFlag, pathname, router]);

  // Auto-dismiss the error banner after a few seconds.
  useEffect(() => {
    if (!ui.error) {
      return;
    }
    const timeout = window.setTimeout(() => setUi((previous) => ({ ...previous, error: null })), 6000);
    return () => window.clearTimeout(timeout);
  }, [ui.error]);

  const value = useMemo<UploadContextValue>(() => ({ openUpload }), [openUpload]);

  return (
    <UploadContext.Provider value={value}>
      {children}
      <UploadComposer autoPick={ui.autoPick} onClose={closeUpload} onAutoPickDone={handleAutoPickDone} open={ui.open} />
      {ui.error ? (
        <div className="fixed inset-x-0 top-3 z-[60] flex justify-center px-4 lg:top-4" role="alert">
          <div className="flex w-full max-w-md items-start gap-3 rounded-[8px] border border-rose-300/25 bg-rose-400/15 px-3 py-2.5 text-sm text-rose-50 backdrop-blur">
            <AlertTriangle className="mt-0.5 size-4 shrink-0" />
            <p className="flex-1 leading-5">{ui.error}</p>
            <button aria-label="Dismiss" className="shrink-0 text-rose-100/80 hover:text-white" onClick={() => setUi((previous) => ({ ...previous, error: null }))} type="button">
              <X className="size-4" />
            </button>
          </div>
        </div>
      ) : null}
    </UploadContext.Provider>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider.");
  }
  return context;
}
