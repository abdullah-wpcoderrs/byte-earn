import { Upload } from "lucide-react";
import { FeedCard } from "@/components/feed/feed-card";
import { feedPosts } from "@/lib/mock-posts";

export default function FeedPage() {
  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(360px,520px)_minmax(240px,1fr)] lg:items-start">
      <section className="glass-strong h-[calc(100svh-112px)] min-h-[620px] overflow-hidden p-2 lg:sticky lg:top-4 lg:h-[calc(100svh-32px)]">
        <div className="app-scrollbar h-full snap-y snap-mandatory overflow-y-auto">
          <div className="grid gap-3">
            {feedPosts.map((post) => (
              <FeedCard key={post.id} post={post} />
            ))}
          </div>
        </div>
      </section>

      <aside className="grid gap-4">
        <section className="glass p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold">Creator feed</h1>
              <p className="mt-1 leading-5 text-muted">Image, video, and image plus audio posts share one vertical surface.</p>
            </div>
            <a className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950" href="/upload">
              <Upload className="size-4" />
              Upload
            </a>
          </div>
        </section>

        <section className="glass p-4">
          <h2 className="text-base font-semibold">Feed behavior</h2>
          <div className="mt-4 grid gap-2">
            {["Desktop feed stays sticky and independently scrollable.", "Mobile feed reserves safe spacing for bottom navigation.", "Audio posts show an active rotating vinyl indicator."].map((item) => (
              <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3 text-slate-300" key={item}>
                {item}
              </div>
            ))}
          </div>
        </section>
      </aside>
    </div>
  );
}
