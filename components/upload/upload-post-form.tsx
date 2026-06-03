"use client";

import { ChevronDown, FileAudio, ImageIcon, LoaderCircle, UploadCloud, Video } from "lucide-react";
import { useEffect, useState } from "react";
import { useFormStatus } from "react-dom";
import { createPostAction } from "@/app/(app)/upload/actions";

type UploadPostFormProps = {
  returnTo?: "feed" | "upload";
};

type PostType = "image_audio" | "image_text" | "video_text";

const postTypeCopy: Record<PostType, { accept: string; helper: string; icon: typeof ImageIcon; mediaLabel: string; title: string }> = {
  image_audio: {
    accept: "image/*",
    helper: "Upload an image and attach an MP3 soundtrack.",
    icon: FileAudio,
    mediaLabel: "Image file",
    title: "Image with MP3 soundtrack",
  },
  image_text: {
    accept: "image/*",
    helper: "Upload a still image and add a caption.",
    icon: ImageIcon,
    mediaLabel: "Image file",
    title: "Image and text caption",
  },
  video_text: {
    accept: "video/*",
    helper: "Upload a video and add a caption.",
    icon: Video,
    mediaLabel: "Video file",
    title: "Video and text caption",
  },
};

export function UploadPostForm({ returnTo = "upload" }: UploadPostFormProps) {
  const [postType, setPostType] = useState<PostType>("image_text");
  const [mediaPreviews, setMediaPreviews] = useState<Array<{ name: string; type: string; url: string }>>([]);
  const selected = postTypeCopy[postType];
  const SelectedIcon = selected.icon;
  const allowsMultipleImages = postType === "image_text";

  useEffect(() => {
    return () => mediaPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
  }, [mediaPreviews]);

  function updateMediaPreviews(files: FileList | null) {
    mediaPreviews.forEach((preview) => URL.revokeObjectURL(preview.url));
    const nextFiles = Array.from(files ?? []).slice(0, allowsMultipleImages ? 8 : 1);
    setMediaPreviews(nextFiles.map((file) => ({ name: file.name, type: file.type, url: URL.createObjectURL(file) })));
  }

  return (
    <form action={createPostAction} className="grid gap-3">
      <input name="returnTo" type="hidden" value={returnTo} />
      <div className="mb-2 flex items-center gap-2 text-cyan-100">
        <UploadCloud className="size-4" />
        <span className="font-semibold">Media details</span>
      </div>

      <label className="grid gap-2">
        <span className="font-medium text-slate-200">Post type</span>
        <span className="relative">
          <select
            className="min-h-10 w-full appearance-none rounded-[5px] border border-white/10 bg-[#101f37] px-2.5 pr-8 text-white outline-none transition focus:border-cyan-200/55"
            name="postType"
            onChange={(event) => {
              setPostType(event.target.value as PostType);
              setMediaPreviews([]);
            }}
            value={postType}
          >
            <option value="image_text">Image and text caption</option>
            <option value="video_text">Video and text caption</option>
            <option value="image_audio">Image with MP3 soundtrack</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-100" />
        </span>
      </label>

      <div className="flex items-start gap-3 border-y border-white/10 py-3 text-slate-300">
        <div className="grid size-10 shrink-0 place-items-center rounded-[5px] bg-cyan-300/12 text-cyan-100">
          <SelectedIcon className="size-5" />
        </div>
        <div>
          <p className="font-semibold text-slate-100">{selected.title}</p>
          <p className="mt-1 leading-5 text-muted">{selected.helper}</p>
        </div>
      </div>

      <label className="grid gap-2">
        <span className="font-medium text-slate-200">{selected.mediaLabel}</span>
        <input
          accept={selected.accept}
          className="min-h-10 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 py-1.5 text-slate-300 file:mr-3 file:rounded-[5px] file:border-0 file:bg-cyan-300 file:px-2.5 file:py-1.5 file:font-semibold file:text-slate-950"
          multiple={allowsMultipleImages}
          name="mediaFile"
          onChange={(event) => updateMediaPreviews(event.currentTarget.files)}
          required
          type="file"
        />
      </label>

      {mediaPreviews.length > 0 ? (
        <div className="overflow-hidden rounded-[5px] border border-white/10 bg-white/[0.045]">
          <div className="app-scrollbar flex gap-2 overflow-x-auto p-2">
            {mediaPreviews.map((preview, index) => (
              <div className="relative aspect-[4/5] w-28 shrink-0 overflow-hidden rounded-[5px] bg-slate-950" key={preview.url}>
                {preview.type.startsWith("video/") ? (
                  <video className="size-full object-cover" muted playsInline preload="metadata" src={preview.url} />
                ) : (
                  // Native image keeps local upload preview blob URLs working.
                  // eslint-disable-next-line @next/next/no-img-element
                  <img alt={preview.name} className="size-full object-cover" src={preview.url} />
                )}
                <span className="absolute left-1.5 top-1.5 rounded-[5px] bg-black/45 px-1.5 py-0.5 text-[10px] font-semibold text-white backdrop-blur">
                  {index + 1}
                </span>
              </div>
            ))}
          </div>
        </div>
      ) : null}

      {postType === "image_audio" ? (
        <label className="grid gap-2">
          <span className="font-medium text-slate-200">Audio file</span>
          <input
            accept="audio/mpeg,audio/mp3"
            className="min-h-10 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 py-1.5 text-slate-300 file:mr-3 file:rounded-[5px] file:border-0 file:bg-white/10 file:px-2.5 file:py-1.5 file:font-semibold file:text-white"
            name="audioFile"
            required
            type="file"
          />
        </label>
      ) : null}

      <label className="grid gap-2">
        <span className="font-medium text-slate-200">Caption</span>
        <textarea className="min-h-28 resize-none rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 py-2 text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/55" maxLength={600} name="caption" placeholder="Write a short caption..." required />
      </label>

      <SubmitButton />
    </form>
  );
}

function SubmitButton() {
  const { pending } = useFormStatus();

  return (
    <button
      className="mt-2 inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
      disabled={pending}
      type="submit"
    >
      {pending ? <LoaderCircle className="size-4 animate-spin" /> : <UploadCloud className="size-4" />}
      {pending ? "Submitting..." : "Submit post"}
    </button>
  );
}
