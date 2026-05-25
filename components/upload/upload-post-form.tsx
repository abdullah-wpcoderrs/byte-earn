import { ChevronDown, UploadCloud } from "lucide-react";
import { createPostAction } from "@/app/(app)/upload/actions";

type UploadPostFormProps = {
  returnTo?: "feed" | "upload";
};

export function UploadPostForm({ returnTo = "upload" }: UploadPostFormProps) {
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
          <select className="min-h-9 w-full appearance-none rounded-[5px] border border-white/10 bg-[#101f37] px-2.5 pr-8 text-white outline-none focus:border-cyan-200/55" name="postType">
            <option value="image_text">Image and text caption</option>
            <option value="video_text">Video and text caption</option>
            <option value="image_audio">Image with MP3 soundtrack</option>
          </select>
          <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-100" />
        </span>
      </label>

      <label className="grid gap-2">
        <span className="font-medium text-slate-200">Media file</span>
        <input className="min-h-9 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 py-1.5 text-slate-300 file:mr-3 file:rounded-[5px] file:border-0 file:bg-cyan-300 file:px-2.5 file:py-1.5 file:font-semibold file:text-slate-950" name="mediaFile" required type="file" />
      </label>

      <label className="grid gap-2">
        <span className="font-medium text-slate-200">Audio file</span>
        <input className="min-h-9 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 py-1.5 text-slate-300 file:mr-3 file:rounded-[5px] file:border-0 file:bg-white/10 file:px-2.5 file:py-1.5 file:font-semibold file:text-white" name="audioFile" type="file" />
      </label>

      <label className="grid gap-2">
        <span className="font-medium text-slate-200">Caption</span>
        <textarea className="min-h-28 resize-none rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 py-2 text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/55" maxLength={600} name="caption" placeholder="Write a short caption..." required />
      </label>

      <button className="mt-2 inline-flex min-h-10 items-center justify-center rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950 transition hover:bg-cyan-200" type="submit">
        Submit post
      </button>
    </form>
  );
}
