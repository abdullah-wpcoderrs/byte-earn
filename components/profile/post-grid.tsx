import { Clapperboard, ImageIcon, Music2, Play } from "lucide-react";
import type { ProfilePost } from "@/lib/posts";

type PostGridProps = {
  posts: ProfilePost[];
};

const postTypeMeta = {
  image_audio: { badge: "MP3", icon: Music2 },
  image_text: { badge: "Image", icon: ImageIcon },
  video_text: { badge: "Video", icon: Clapperboard },
};

export function PostGrid({ posts }: PostGridProps) {
  if (posts.length === 0) {
    return (
      <div className="grid min-h-40 place-items-center rounded-[5px] border border-white/10 bg-white/[0.045] p-4 text-center text-muted">
        No posts yet.
      </div>
    );
  }

  return (
    <div className="grid grid-cols-3 gap-2 md:grid-cols-4 xl:grid-cols-5">
      {posts.map((post) => {
        const { badge, icon: Icon } = postTypeMeta[post.type];

        return (
          <a
            aria-label={`Open post: ${post.caption}`}
            className="group relative aspect-[3/4] overflow-hidden rounded-[5px] border border-white/10 bg-slate-950"
            href={`/posts/${post.id}`}
            key={post.id}
          >
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-105"
              style={{ backgroundImage: `url(${post.mediaUrl})` }}
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04),rgba(2,6,23,0.82))]" />
            <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-[5px] bg-black/40 px-2 py-1 text-[10px] text-cyan-100 backdrop-blur">
              <Icon className="size-3" />
              {badge}
            </div>
            <div className="absolute bottom-2 left-2 right-2">
              <p className="truncate font-medium text-white">{post.caption}</p>
              <p className="mt-1 flex items-center gap-1 text-[10px] text-slate-300">
                <Play className="size-3 fill-current" />
                {post.likesCount.toLocaleString()}
              </p>
            </div>
          </a>
        );
      })}
    </div>
  );
}
