import { ImageIcon, Music2, Video } from "lucide-react";
import { UploadPostForm } from "@/components/upload/upload-post-form";

const uploadTypes = [
  { title: "Image + caption", description: "Static post with text caption.", icon: ImageIcon },
  { title: "Video + caption", description: "Vertical sponsored or creator video.", icon: Video },
  { title: "Image + MP3", description: "Image post with matching soundtrack.", icon: Music2 },
];

export default function UploadPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[0.78fr_1.22fr]">
      <aside className="order-2 glass p-4 lg:order-1">
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

      <div className="order-1 glass-strong p-4 lg:order-2">
        <UploadPostForm />
      </div>
    </div>
  );
}
