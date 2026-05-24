import { ChevronDown, ImageIcon, Music2, UploadCloud, Video } from "lucide-react";
import { createPostAction } from "./actions";

const uploadTypes = [
  { title: "Image + caption", description: "Static post with text caption.", icon: ImageIcon },
  { title: "Video + caption", description: "Vertical sponsored or creator video.", icon: Video },
  { title: "Image + MP3", description: "Image post with matching soundtrack.", icon: Music2 },
];

export default function UploadPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
      <aside className="glass p-4">
        <h1 className="text-base font-semibold">Upload post</h1>
        <p className="mt-2 leading-5 text-muted">Create one of the three approved media post formats.</p>

        <div className="mt-5 grid gap-2">
          {uploadTypes.map((type) => (
            <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3" key={type.title}>
              <type.icon className="mb-3 size-5 text-cyan-200" />
              <p className="font-semibold text-slate-100">{type.title}</p>
              <p className="mt-1 leading-5 text-muted">{type.description}</p>
            </div>
          ))}
        </div>
      </aside>

      <form action={createPostAction} className="glass-strong grid gap-3 p-4">
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
    </div>
  );
}
