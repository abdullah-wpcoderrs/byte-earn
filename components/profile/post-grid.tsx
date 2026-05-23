import { Play } from "lucide-react";
import { profileGridPosts } from "@/lib/mock-posts";

export function PostGrid() {
  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-4 xl:grid-cols-5">
      {profileGridPosts.map((post) => {
        const Icon = post.icon;

        return (
          <a
            className="group relative aspect-[3/4] overflow-hidden rounded-[5px] border border-white/10 bg-slate-950"
            href={`/posts/${post.id}`}
            key={post.id}
          >
            <div className="absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-105" style={{ backgroundImage: `url(${post.mediaUrl})` }} />
            <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04),rgba(2,6,23,0.82))]" />
            <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-[5px] bg-black/40 px-2 py-1 text-[10px] text-cyan-100 backdrop-blur">
              <Icon className="size-3" />
              {post.badge}
            </div>
            <div className="absolute bottom-2 left-2 right-2">
              <p className="truncate font-medium text-white">{post.caption}</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-300">
                <Play className="size-3 fill-current" />
                {post.likes}
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
