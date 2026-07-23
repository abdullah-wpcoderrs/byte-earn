"use client";

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { AlertTriangle, Check, LoaderCircle, X } from "lucide-react";
import type { ReactNode } from "react";
import { createPostRecord } from "@/app/(app)/upload/actions";
import { UploadComposer } from "./upload-composer";
import { removeUploadedPaths, uploadPostMedia, UploadValidationError, type PostType } from "@/lib/upload/post-upload";

type UploadContextValue = {
  openUpload: () => void;
  submitPost: (input: { audioFile: File | null; caption: string; files: File[]; type: PostType }) => void;
};

type ComposerUiState = {
  autoPick: boolean;
  error: string | null;
  open: boolean;
};

type UploadStatus = "error" | "finalizing" | "success" | "uploading";

type UploadState = {
  message: string;
  percent: number;
  status: UploadStatus;
} | null;

const UploadContext = createContext<UploadContextValue | null>(null);

const MAX_IMAGES = 8;

// Friendly text for client + server error codes.
const errorMessages: Record<string, string> = {
  account_suspended: "Your account is suspended.",
  audio_required: "Please attach an MP3 track, or remove music.",
  auth_required: "Please sign in to post.",
  caption_required: "Please write a caption.",
  caption_too_long: "Caption is too long (max 600 characters).",
  file_too_large: "One of the files is too large to upload.",
  insert_failed: "Could not create the post. Please try again.",
  invalid_audio_file: "Audio must be an MP3 file.",
  invalid_media_file: "That file type is not supported.",
  invalid_post_type: "Could not determine the post type.",
  media_required: "Please choose an image or video first.",
  network_error: "Network error during upload. Check your connection.",
  onboarding_required: "Please finish onboarding before posting.",
  pending_payment: "Activation payment is required before posting.",
  profile_not_found: "Profile not found.",
  rate_limited: "You have posted a lot recently. Try again later.",
  settings_unavailable: "Upload settings are unavailable. Try again shortly.",
  too_many_media_files: `You can attach up to ${MAX_IMAGES} images.`,
};

export function UploadProvider({ children, userId }: { children: ReactNode; userId?: string }) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [ui, setUi] = useState<ComposerUiState>({ autoPick: false, error: null, open: false });
  const [upload, setUpload] = useState<UploadState>(null);

  const openUpload = useCallback(() => {
    setUi({ autoPick: true, error: null, open: true });
  }, []);

  const closeUpload = useCallback(() => {
    setUi((previous) => ({ autoPick: false, error: previous.error, open: false }));
  }, []);

  const handleAutoPickDone = useCallback(() => {
    setUi((previous) => ({ ...previous, autoPick: false }));
  }, []);

  // Run the whole post flow in the background: upload media with progress,
  // then ask the server to insert the post row. The composer is closed up front
  // so the user can keep browsing while it works.
  const submitPost = useCallback(
    (input: { audioFile: File | null; caption: string; files: File[]; type: PostType }) => {
      if (!userId) {
        setUi((previous) => ({ ...previous, error: "Please sign in to post." }));
        return;
      }
      setUi((previous) => ({ ...previous, autoPick: false, open: false }));
      setUpload({ message: "Uploading media", percent: 0, status: "uploading" });

      void (async () => {
        try {
          const { mediaUrls, audioUrl, paths } = await uploadPostMedia({
            audioFile: input.audioFile,
            files: input.files,
            onProgress: ({ label, percent }) =>
              setUpload((current) => (current ? { ...current, message: label, percent, status: "uploading" } : current)),
            type: input.type,
            userId,
          });
          setUpload({ message: "Publishing", percent: 100, status: "finalizing" });
          const result = await createPostRecord({ audioUrl, caption: input.caption, mediaUrls, type: input.type });
          if (!result.ok) {
            await removeUploadedPaths(paths).catch(() => undefined);
            setUpload({ message: errorMessages[result.error ?? ""] ?? "Could not create the post. Please try again.", percent: 100, status: "error" });
            return;
          }
          setUpload({
            message: result.status === "published" ? "Posted" : "Submitted for review",
            percent: 100,
            status: "success",
          });
          router.refresh();
          if (result.postId && result.status === "published") {
            router.push(`/posts/${result.postId}`);
          }
        } catch (error) {
          const code = error instanceof UploadValidationError ? error.message : "";
          setUpload({
            message: errorMessages[code] ?? "Upload failed. Please try again.",
            percent: 100,
            status: "error",
          });
        }
      })();
    },
    [userId, router],
  );

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

    const params = new URLSearchParams(window.location.search);
    params.delete("error");
    params.delete("upload");
    params.delete("updated");
    params.delete("post");
    const remaining = params.toString();
    router.replace(remaining ? `${pathname}?${remaining}` : pathname, { scroll: false });
  }, [errorCode, hasSignal, hasUpdated, hasUploadFlag, pathname, router]);

  // Auto-dismiss the composer error banner after a few seconds.
  useEffect(() => {
    if (!ui.error) {
      return;
    }
    const timeout = window.setTimeout(() => setUi((previous) => ({ ...previous, error: null })), 6000);
    return () => window.clearTimeout(timeout);
  }, [ui.error]);

  // Auto-dismiss success quickly; keep errors longer.
  useEffect(() => {
    if (!upload) {
      return;
    }
    const ttl = upload.status === "success" ? 3000 : upload.status === "error" ? 7000 : null;
    if (ttl === null) {
      return;
    }
    const timeout = window.setTimeout(() => setUpload(null), ttl);
    return () => window.clearTimeout(timeout);
  }, [upload]);

  const value = useMemo<UploadContextValue>(() => ({ openUpload, submitPost }), [openUpload, submitPost]);

  return (
    <UploadContext.Provider value={value}>
      {children}
      <UploadComposer autoPick={ui.autoPick} onClose={closeUpload} onAutoPickDone={handleAutoPickDone} open={ui.open} submitPost={submitPost} />
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
      {upload ? <UploadToast upload={upload} onDismiss={() => setUpload(null)} /> : null}
    </UploadContext.Provider>
  );
}

function UploadToast({ upload, onDismiss }: { upload: NonNullable<UploadState>; onDismiss: () => void }) {
  const isError = upload.status === "error";
  const isSuccess = upload.status === "success";
  const showBar = upload.status === "uploading" || upload.status === "finalizing";

  return (
    <div className="fixed inset-x-0 bottom-24 z-[60] flex justify-center px-4 lg:bottom-6" role="status">
      <div className={`flex w-full max-w-sm items-center gap-3 rounded-[8px] border px-3 py-2.5 text-sm backdrop-blur ${isError ? "border-rose-300/25 bg-rose-400/15 text-rose-50" : "border-white/12 bg-[#0b1626]/90 text-slate-100"}`}>
        {isError ? (
          <AlertTriangle className="size-4 shrink-0" />
        ) : isSuccess ? (
          <Check className="size-4 shrink-0 text-cyan-300" />
        ) : (
          <LoaderCircle className="size-4 shrink-0 animate-spin text-cyan-300" />
        )}
        <div className="min-w-0 flex-1">
          <div className="flex items-center justify-between gap-2">
            <span className="truncate font-medium">{upload.message}</span>
            {upload.status === "uploading" ? <span className="text-xs text-muted">{upload.percent}%</span> : null}
          </div>
          {showBar ? (
            <div className="mt-1.5 h-1 overflow-hidden rounded-full bg-white/10">
              <div className="h-full rounded-full bg-cyan-300 transition-[width] duration-200" style={{ width: `${upload.percent}%` }} />
            </div>
          ) : null}
        </div>
        <button aria-label="Dismiss" className={`shrink-0 ${isError ? "text-rose-100/80 hover:text-white" : "text-slate-400 hover:text-white"}`} onClick={onDismiss} type="button">
          <X className="size-4" />
        </button>
      </div>
    </div>
  );
}

export function useUpload() {
  const context = useContext(UploadContext);
  if (!context) {
    throw new Error("useUpload must be used within an UploadProvider.");
  }
  return context;
}
