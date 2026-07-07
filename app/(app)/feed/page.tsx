import { FeedCard } from "@/components/feed/feed-card";
import { FeedUploadButton } from "@/components/feed/feed-upload-button";
import { getFeedPosts } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const feedPosts = await getFeedPosts();

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(360px,520px)_minmax(240px,1fr)] lg:items-start">
      {/* Mobile: full-bleed between the header and bottom nav (TikTok-style).
          Desktop: a clean, full-height column with no glass container. */}
      <section className="fixed inset-x-0 top-16 bottom-[4.75rem] z-0 lg:static lg:inset-auto lg:top-auto lg:bottom-auto lg:z-auto lg:h-[calc(100svh-3rem)] lg:overflow-hidden">
        <div className="app-scrollbar flex h-full snap-y snap-mandatory flex-col overflow-y-auto">
          {feedPosts.length === 0 ? (
            <div className="grid h-full place-items-center px-6 text-center text-muted">No published posts yet.</div>
          ) : (
            feedPosts.map((post) => <FeedCard key={post.id} post={post} />)
          )}
        </div>
      </section>

      <FeedUploadButton compact />

      <aside className="hidden gap-4 lg:grid">
        <section className="glass p-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <h1 className="text-base font-semibold">Creator feed</h1>
              <p className="mt-1 leading-5 text-muted">Image, video, and image plus audio posts share one vertical surface.</p>
            </div>
            <FeedUploadButton />
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
