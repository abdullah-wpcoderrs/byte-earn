import { ArrowLeft } from "lucide-react";
import { FeedCard } from "@/components/feed/feed-card";
import { feedPosts, profileGridPosts } from "@/lib/mock-posts";

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = [...feedPosts, ...profileGridPosts].find((item) => item.id === id) ?? feedPosts[0];

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(360px,520px)_1fr]">
      <section className="glass-strong overflow-hidden p-2">
        <FeedCard post={post} />
      </section>
      <aside className="glass p-4">
        <a className="mb-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] border border-white/10 bg-white/[0.065] px-3 font-semibold text-slate-100" href="/feed">
          <ArrowLeft className="size-4" />
          Back to feed
        </a>
        <h1 className="text-base font-semibold">Post details</h1>
        <p className="mt-2 leading-5 text-muted">This page will host direct post links, comment deep-links, and moderation previews.</p>
      </aside>
    </div>
  );
}
