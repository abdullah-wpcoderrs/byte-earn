"use client";

import { createPortal } from "react-dom";
import { ChevronLeft, ChevronRight, Music2, UploadCloud, X } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { Button } from "@/components/ui/button";
import type { PostType } from "@/lib/upload/post-upload";

type MediaPreview = { name: string; type: string; url: string };
type AudioPreview = { name: string; url: string };

type UploadComposerProps = {
  autoPick: boolean;
  onClose: () => void;
  onAutoPickDone: () => void;
  open: boolean;
  submitPost: (input: { audioFile: File | null; caption: string; files: File[]; type: PostType }) => void;
};

const MAX_IMAGES = 8;

export function UploadComposer({ autoPick, onClose, onAutoPickDone, open, submitPost }: UploadComposerProps) {
  const mediaInputRef = useRef<HTMLInputElement>(null);
  const audioInputRef = useRef<HTMLInputElement>(null);
  const [mediaPreviews, setMediaPreviews] = useState<MediaPreview[]>([]);
  const [audioPreview, setAudioPreview] = useState<AudioPreview | null>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [note, setNote] = useState<string | null>(null);

  // Revoke object URLs when previews change or the composer closes.
  useEffect(() => {
    return () => {
      mediaPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
      if (audioPreview) {
        URL.revokeObjectURL(audioPreview.url);
      }
    };
  }, [mediaPreviews, audioPreview]);

  // Open the native picker right after the composer mounts (TikTok-style).
  useEffect(() => {
    if (open && autoPick && mediaInputRef.current) {
      mediaInputRef.current.click();
      onAutoPickDone();
    }
  }, [open, autoPick, onAutoPickDone]);

  const hasVideo = mediaPreviews.some((preview) => preview.type.startsWith("video/"));
  const activePreview = mediaPreviews[activeIndex] ?? mediaPreviews[0];

  function handleMediaChange(event: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.currentTarget.files ?? []);
    setError(null);
    setNote(null);

    if (files.length === 0) {
      return;
    }

    const images = files.filter((file) => file.type.startsWith("image/"));
    const videos = files.filter((file) => file.type.startsWith("video/"));

    // A single post is images OR a video, never mixed.
    if (images.length > 0 && videos.length > 0) {
      setError("Choose images or a video, not both.");
      event.currentTarget.value = "";
      return;
    }

    let selected = files;
    if (videos.length > 1) {
      selected = [videos[0]];
      setNote("Only one video can be posted at a time.");
    } else if (images.length > MAX_IMAGES) {
      selected = images.slice(0, MAX_IMAGES);
      setNote(`Only the first ${MAX_IMAGES} images were kept.`);
    }

    // Adding a video replaces any soundtrack since video posts cannot carry music.
    if (videos.length > 0 && audioPreview) {
      clearAudio();
    }

    setMediaPreviews((previous) => {
      previous.forEach((preview) => URL.revokeObjectURL(preview.url));
      return selected.map((file) => ({ name: file.name, type: file.type, url: URL.createObjectURL(file) }));
    });
    setActiveIndex(0);
  }

  function handleAudioChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.currentTarget.files?.[0];
    if (!file) {
      return;
    }
    setError(null);
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview.url);
    }
    setAudioPreview({ name: file.name, url: URL.createObjectURL(file) });
  }

  function clearMedia() {
    setMediaPreviews((previous) => {
      previous.forEach((preview) => URL.revokeObjectURL(preview.url));
      return [];
    });
    if (mediaInputRef.current) {
      mediaInputRef.current.value = "";
    }
    setActiveIndex(0);
    setNote(null);
  }

  function clearAudio() {
    if (audioPreview) {
      URL.revokeObjectURL(audioPreview.url);
    }
    setAudioPreview(null);
    if (audioInputRef.current) {
      audioInputRef.current.value = "";
    }
  }

  function handleSubmit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    const data = new FormData(form);
    const files = data.getAll("mediaFile").filter((value): value is File => value instanceof File && value.size > 0);
    const audioValue = data.get("audioFile");
    const audioFile = audioValue instanceof File && audioValue.size > 0 ? audioValue : null;
    const caption = String(data.get("caption") ?? "").trim();

    if (files.length === 0) {
      setError("Please choose an image or video first.");
      return;
    }
    if (!caption) {
      setError("Please write a caption.");
      return;
    }

    const fileHasVideo = files.some((file) => file.type.startsWith("video/"));
    const type: PostType = fileHasVideo ? "video_text" : audioFile ? "image_audio" : "image_text";
    // Reset the form so a reopened composer starts empty.
    form.reset();
    submitPost({ audioFile, caption, files, type });
  }

  if (!open || typeof document === "undefined") {
    return null;
  }

  const hasMedia = mediaPreviews.length > 0;

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-950/80 backdrop-blur-sm md:grid md:place-items-center md:px-4 md:py-6" onClick={onClose}>
      <section
        aria-label="Create post"
        className="glass-strong flex h-full w-full flex-col overflow-hidden md:h-auto md:max-h-[calc(100svh-3rem)] md:w-full md:max-w-5xl md:rounded-[10px]"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <form className="flex min-h-0 flex-1 flex-col" onSubmit={handleSubmit}>
          {/* Hidden native inputs hold the real files the submit handler reads. */}
          <input
            accept="image/*,video/*"
            className="sr-only"
            multiple
            name="mediaFile"
            onChange={handleMediaChange}
            ref={mediaInputRef}
            type="file"
          />
          <input
            accept="audio/mpeg,audio/mp3"
            className="sr-only"
            name="audioFile"
            onChange={handleAudioChange}
            ref={audioInputRef}
            type="file"
          />

          {/* Top bar */}
          <div className="flex shrink-0 items-center justify-between gap-3 border-b border-white/10 px-4 py-3">
            <h2 className="text-base font-semibold">Create post</h2>
            <Button aria-label="Close" className="size-9 px-0" icon={<X className="size-4" />} onClick={onClose} type="button" variant="ghost" />
          </div>

          {error ? (
            <div className="shrink-0 border-b border-rose-300/20 bg-rose-400/10 px-4 py-2 text-sm text-rose-100">
              {error}
            </div>
          ) : null}

          {/* Body: stacked on mobile, two columns on desktop */}
          <div className="grid min-h-0 flex-1 md:grid-cols-[1.4fr_1fr]">
            {/* Media stage — square preview frame so media is always neatly scaled. */}
            <div className="flex min-h-0 items-center justify-center bg-slate-950/60 p-3 md:p-4">
              {hasMedia && activePreview ? (
                <div className="flex w-full flex-col items-center gap-3">
                  <div className="relative aspect-square w-full max-w-[18rem] overflow-hidden rounded-[5px] bg-slate-950">
                    {activePreview.type.startsWith("video/") ? (
                      <video className="size-full object-cover" muted playsInline preload="metadata" src={activePreview.url} />
                    ) : (
                      // Native img keeps local blob preview working without a remote fetch.
                      // eslint-disable-next-line @next/next/no-img-element
                      <img alt={activePreview.name} className="size-full object-cover" src={activePreview.url} />
                    )}
                    {mediaPreviews.length > 1 ? (
                      <>
                        <button
                          aria-label="Previous media"
                          className="absolute left-1.5 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
                          onClick={() => setActiveIndex((index) => (index - 1 + mediaPreviews.length) % mediaPreviews.length)}
                          type="button"
                        >
                          <ChevronLeft className="size-4" />
                        </button>
                        <button
                          aria-label="Next media"
                          className="absolute right-1.5 top-1/2 z-10 grid size-8 -translate-y-1/2 place-items-center rounded-full bg-black/45 text-white backdrop-blur transition hover:bg-black/65"
                          onClick={() => setActiveIndex((index) => (index + 1) % mediaPreviews.length)}
                          type="button"
                        >
                          <ChevronRight className="size-4" />
                        </button>
                        <span className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                          {activeIndex + 1} / {mediaPreviews.length}
                        </span>
                      </>
                    ) : null}
                  </div>
                  {mediaPreviews.length > 1 ? (
                    <div className="flex flex-wrap justify-center gap-1.5">
                      {mediaPreviews.map((preview, index) => (
                        <button
                          aria-label={`Show media ${index + 1}`}
                          className={`h-1.5 rounded-full transition ${index === activeIndex ? "w-6 bg-cyan-200" : "w-1.5 bg-white/35 hover:bg-white/60"}`}
                          key={preview.url}
                          onClick={() => setActiveIndex(index)}
                          type="button"
                        />
                      ))}
                    </div>
                  ) : null}
                </div>
              ) : (
                <button
                  className="flex w-full max-w-sm flex-col items-center gap-3 rounded-[10px] border border-dashed border-white/15 bg-white/[0.03] px-6 py-10 text-center transition hover:border-cyan-200/40 hover:bg-white/[0.06]"
                  onClick={() => mediaInputRef.current?.click()}
                  type="button"
                >
                  <span className="grid size-12 place-items-center rounded-full bg-cyan-300/12 text-cyan-100">
                    <UploadCloud className="size-6" />
                  </span>
                  <span className="font-semibold text-slate-100">Select media</span>
                  <span className="text-xs text-muted">Images or a video. Up to {MAX_IMAGES} images.</span>
                </button>
              )}
            </div>

            {/* Caption, music, actions */}
            <div className="app-scrollbar flex min-h-0 flex-col gap-4 overflow-y-auto border-t border-white/10 p-4 md:border-t-0 md:border-l">
              {hasMedia ? (
                <div className="flex flex-wrap gap-2">
                  <Button
                    className="min-h-9 px-2.5"
                    icon={<UploadCloud className="size-4" />}
                    onClick={() => mediaInputRef.current?.click()}
                    type="button"
                    variant="secondary"
                  >
                    Change media
                  </Button>
                  <Button className="min-h-9 px-2.5" icon={<X className="size-4" />} onClick={clearMedia} type="button" variant="ghost">
                    Remove
                  </Button>
                </div>
              ) : null}

              {note ? <p className="text-xs text-cyan-100/80">{note}</p> : null}

              <label className="grid gap-2">
                <span className="font-medium text-slate-200">Caption</span>
                <textarea
                  className="min-h-24 resize-none rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 py-2 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55"
                  maxLength={600}
                  name="caption"
                  placeholder="Write a caption..."
                />
              </label>

              {/* Music only applies to image posts; video posts cannot carry a soundtrack. */}
              {hasMedia && !hasVideo ? (
                <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3">
                  {audioPreview ? (
                    <div className="flex items-center gap-3">
                      <span className="grid size-9 shrink-0 place-items-center rounded-[5px] bg-cyan-300/12 text-cyan-100">
                        <Music2 className="size-4" />
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-slate-100">{audioPreview.name}</p>
                        <p className="text-xs text-muted">Soundtrack attached</p>
                      </div>
                      <Button className="min-h-9 px-2.5" icon={<X className="size-4" />} onClick={clearAudio} type="button" variant="ghost">
                        Remove
                      </Button>
                    </div>
                  ) : (
                    <button
                      className="flex w-full items-center gap-3 rounded-[5px] px-1 py-1 text-left transition hover:bg-white/[0.04]"
                      onClick={() => audioInputRef.current?.click()}
                      type="button"
                    >
                      <span className="grid size-9 shrink-0 place-items-center rounded-[5px] bg-cyan-300/12 text-cyan-100">
                        <Music2 className="size-4" />
                      </span>
                      <div>
                        <p className="text-sm font-medium text-slate-100">Add music</p>
                        <p className="text-xs text-muted">Attach an MP3 soundtrack to your images.</p>
                      </div>
                    </button>
                  )}
                </div>
              ) : null}

              <div className="mt-auto flex items-center justify-end gap-2 pt-2 pb-[calc(0.5rem+env(safe-area-inset-bottom))]">
                <Button className="min-h-9 px-2.5" onClick={onClose} type="button" variant="ghost">
                  Discard
                </Button>
                <button
                  className="inline-flex min-h-9 items-center justify-center gap-2 rounded-[5px] bg-cyan-300 px-4 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
                  disabled={!hasMedia}
                  type="submit"
                >
                  <UploadCloud className="size-4" />
                  Post
                </button>
              </div>
            </div>
          </div>
        </form>
      </section>
    </div>,
    document.body,
  );
}
