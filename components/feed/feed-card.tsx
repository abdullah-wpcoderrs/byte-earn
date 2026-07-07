"use client";

import { Clapperboard, ImageIcon, Music2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { FeedMedia } from "./feed-media";
import { PostImpressionTracker } from "./post-impression-tracker";
import { PostActions } from "./post-actions";
import { ProfileBadges } from "@/components/profile/profile-badges";
import { cn } from "@/components/ui/utils";
import type { FeedPost } from "@/lib/posts";

type FeedCardProps = {
  className?: string;
  post: FeedPost;
  showFooterMeta?: boolean;
};

const postTypeMeta = {
  image_audio: { badge: "Image + MP3", icon: Music2 },
  image_text: { badge: "Image", icon: ImageIcon },
  video_text: { badge: "Video", icon: Clapperboard },
};

function truncateCaption(text: string, maxLength = 88) {
  const trimmed = text.trim();
  if (trimmed.length <= maxLength) {
    return trimmed;
  }

  return `${trimmed.slice(0, maxLength).trimEnd()}...`;
}

export function FeedCard({ className, post, showFooterMeta = true }: FeedCardProps) {
  const { badge, icon: Icon } = postTypeMeta[post.type];
  const isAudioPost = post.type === "image_audio";
  const containerRef = useRef<HTMLElement | null>(null);
  const [isIntersecting, setIsIntersecting] = useState(false);
  const previewCaption = truncateCaption(post.caption);

  useEffect(() => {
    const el = containerRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        setIsIntersecting(entry.isIntersecting);
      },
      {
        threshold: 0.6, // Trigger when 60% of the card is visible in the viewport
      }
    );

    observer.observe(el);
    return () => {
      observer.unobserve(el);
    };
  }, []);

  return (
    <article
      ref={containerRef}
      className={cn(
        "relative flex h-full shrink-0 snap-start flex-col justify-end overflow-hidden bg-slate-950",
        className,
      )}
    >
      <PostImpressionTracker postId={post.id} />
      <FeedMedia
        audioUrl={post.audioUrl}
        caption={post.caption}
        mediaUrl={post.mediaUrl}
        mediaUrls={post.mediaUrls}
        postId={post.id}
        type={post.type}
        isIntersecting={isIntersecting}
      />
      <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.08),rgba(2,6,23,0.38)_44%,rgba(2,6,23,0.92))]" />
      <div className="absolute left-4 top-4 inline-flex items-center gap-2 rounded-[5px] border border-white/15 bg-black/36 px-3 py-2 text-cyan-100 backdrop-blur">
        <Icon className="size-4" />
        {badge}
      </div>

      <div className="absolute right-3 top-1/2 z-10 -translate-y-1/2">
        <PostActions
          bookmarkedByViewer={post.bookmarkedByViewer}
          bookmarksCount={post.bookmarksCount}
          comments={post.comments}
          commentsCount={post.commentsCount}
          likedByViewer={post.likedByViewer}
          likesCount={post.likesCount}
          postId={post.id}
        />
      </div>

      {showFooterMeta ? (
        <div className="relative z-10 flex items-end justify-between gap-4 p-4 pr-16 sm:p-5 sm:pr-20">
          <div>
            <a className="text-base font-semibold text-white hover:text-cyan-100" href={`/u/${post.handle}`}>
              @{post.handle}
            </a>
            <div className="mt-1">
              <ProfileBadges badges={post.authorBadges} compact />
            </div>
            <p className="mt-2 max-w-[18rem] leading-5 text-slate-200">{previewCaption}</p>
          </div>
          {isAudioPost ? (
            <div className={`vinyl-spin ${isIntersecting ? "" : "paused"} grid size-14 shrink-0 place-items-center rounded-full border border-cyan-100/40 bg-[conic-gradient(from_180deg,#020617,#38bdf8,#020617,#e2e8f0,#020617)]`}>
              <div className="size-4 rounded-full border border-white/30 bg-slate-950" />
            </div>
          ) : null}
        </div>
      ) : isAudioPost ? (
        <div className="pointer-events-none absolute bottom-4 right-4 z-10">
          <div className={`vinyl-spin ${isIntersecting ? "" : "paused"} grid size-14 shrink-0 place-items-center rounded-full border border-cyan-100/40 bg-[conic-gradient(from_180deg,#020617,#38bdf8,#020617,#e2e8f0,#020617)]`}>
            <div className="size-4 rounded-full border border-white/30 bg-slate-950" />
          </div>
        </div>
      ) : null}
    </article>
  );
}
