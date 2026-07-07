import { ArrowLeft, BarChart3, Bookmark, Clock3, Heart, MessageCircle, Share2 } from "lucide-react";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { FeedCard } from "@/components/feed/feed-card";
import { ProfileBadges } from "@/components/profile/profile-badges";
import { getOwnPostAnalytics, getPostById, getViewerId, recordPostImpression } from "@/lib/posts";

export const dynamic = "force-dynamic";

export default async function PostDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const post = await getPostById(id);

  if (!post) {
    redirect("/feed?error=post_unavailable");
  }

  await recordPostImpression(id);
  const viewerId = await getViewerId();
  const isOwner = viewerId === post.authorId;
  const analytics = isOwner ? await getOwnPostAnalytics(id) : null;
  const stats = analytics
    ? [
        { icon: <BarChart3 className="size-3.5" />, label: "Impressions", value: compact(analytics.impressionsCount) },
        { icon: <Heart className="size-3.5" />, label: "Likes", value: compact(analytics.likesCount) },
        { icon: <Bookmark className="size-3.5" />, label: "Bookmarks", value: compact(analytics.bookmarksCount) },
        { icon: <MessageCircle className="size-3.5" />, label: "Comments", value: compact(analytics.commentsCount) },
        { icon: <Share2 className="size-3.5" />, label: "Shares", value: compact(analytics.sharesCount) },
        {
          icon: <Clock3 className="size-3.5" />,
          label: "Avg watch",
          value: analytics.avgWatchSeconds === null ? "N/A" : formatSeconds(analytics.avgWatchSeconds),
        },
      ]
    : [];

  return (
    <div className="mx-auto grid w-full max-w-6xl gap-4 lg:grid-cols-[minmax(360px,520px)_1fr] lg:items-start">
      {/* Mobile: small floating back button over the media. Desktop: slim text link. */}
      <a
        aria-label="Back to feed"
        className="fixed left-4 top-20 z-30 grid size-9 place-items-center rounded-full border border-white/15 bg-black/45 text-white backdrop-blur lg:hidden"
        href="/feed"
      >
        <ArrowLeft className="size-4" />
      </a>

      <section className="glass-strong overflow-hidden p-2 lg:sticky lg:top-4">
        <FeedCard className="min-h-[100svh] lg:min-h-[calc(100svh-32px)]" post={post} showFooterMeta={false} />
      </section>

      <div className="grid gap-4 lg:max-h-[calc(100svh-32px)] lg:overflow-y-auto lg:pr-1">
        <a
          className="hidden items-center gap-1.5 text-sm font-medium text-slate-300 transition hover:text-white lg:inline-flex"
          href="/feed"
        >
          <ArrowLeft className="size-4" />
          Back to feed
        </a>

        <section className="glass p-4">
          <a className="text-base font-semibold text-white hover:text-cyan-100" href={`/u/${post.handle}`}>
            @{post.handle}
          </a>
          <div className="mt-2">
            <ProfileBadges badges={post.authorBadges} compact />
          </div>
          <p className="mt-4 whitespace-pre-wrap leading-6 text-slate-200">{post.caption}</p>
        </section>

        {analytics ? (
          <>
            {/* Mobile: compact Twitter-style row of stats. */}
            <div className="flex flex-wrap items-center gap-x-4 gap-y-2 px-1 lg:hidden">
              {stats.map((stat) => (
                <div className="flex items-center gap-1.5" key={stat.label}>
                  <span className="text-cyan-100">{stat.icon}</span>
                  <span className="text-sm font-semibold text-white">{stat.value}</span>
                  <span className="text-[11px] text-muted">{stat.label}</span>
                </div>
              ))}
            </div>

            {/* Desktop: full analytics card grid. */}
            <section className="hidden glass p-4 lg:block">
              <h1 className="text-base font-semibold">Post analytics</h1>
              <div className="mt-4 grid grid-cols-2 gap-2">
                <Metric icon={<BarChart3 className="size-4" />} label="Impressions" value={compact(analytics.impressionsCount)} />
                <Metric icon={<Heart className="size-4" />} label="Likes" value={compact(analytics.likesCount)} />
                <Metric icon={<Bookmark className="size-4" />} label="Bookmarks" value={compact(analytics.bookmarksCount)} />
                <Metric icon={<MessageCircle className="size-4" />} label="Comments" value={compact(analytics.commentsCount)} />
                <Metric icon={<Share2 className="size-4" />} label="Shares" value={compact(analytics.sharesCount)} />
                <Metric icon={<Clock3 className="size-4" />} label="Avg watch" value={analytics.avgWatchSeconds === null ? "N/A" : formatSeconds(analytics.avgWatchSeconds)} />
              </div>
            </section>
          </>
        ) : null}
      </div>
    </div>
  );
}

function compact(value: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

function formatSeconds(seconds: number) {
  const minutes = Math.floor(seconds / 60);
  const remainder = seconds % 60;
  return minutes > 0 ? `${minutes}m ${remainder}s` : `${remainder}s`;
}

function Metric({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3">
      <div className="flex items-center gap-2 text-cyan-100">
        {icon}
        <span className="text-[11px] font-semibold">{label}</span>
      </div>
      <p className="mt-3 text-xl font-semibold leading-none text-white">{value}</p>
    </div>
  );
}
