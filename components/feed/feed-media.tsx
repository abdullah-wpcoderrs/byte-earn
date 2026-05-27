"use client";

import { ChevronLeft, ChevronRight } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { recordVideoWatchAction } from "@/app/(app)/posts/actions";

type FeedMediaProps = {
  caption: string;
  mediaUrl: string;
  mediaUrls: string[];
  postId: string;
  type: "image_audio" | "image_text" | "video_text";
};

export function FeedMedia({ caption, mediaUrl, mediaUrls, postId, type }: FeedMediaProps) {
  const urls = mediaUrls.length > 0 ? mediaUrls : [mediaUrl];
  const [activeIndex, setActiveIndex] = useState(0);
  const startedAtRef = useRef<number | null>(null);
  const lastReportedAtRef = useRef(0);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeUrl = urls[activeIndex] ?? mediaUrl;
  const hasCarousel = type === "image_text" && urls.length > 1;

  useEffect(() => {
    if (type !== "video_text") {
      return;
    }

    const video = videoRef.current;
    if (!video) {
      return;
    }

    const playVideo = async () => {
      try {
        await video.play();
      } catch {
      }
    };

    playVideo();
  }, [activeUrl, type]);

  function move(delta: number) {
    setActiveIndex((index) => (index + delta + urls.length) % urls.length);
  }

  if (type === "video_text") {
    function reportWatch() {
      const startedAt = startedAtRef.current;
      if (!startedAt) return;
      const seconds = Math.floor((Date.now() - startedAt) / 1000);
      if (seconds < 2 || Date.now() - lastReportedAtRef.current < 5000) return;
      lastReportedAtRef.current = Date.now();
      startedAtRef.current = null;
      recordVideoWatchAction(postId, seconds).catch(() => undefined);
    }

    return (
      <video
        autoPlay
        className="absolute inset-0 size-full bg-slate-950 object-cover"
        controls
        loop
        muted
        onEnded={reportWatch}
        onPause={reportWatch}
        onPlay={() => {
          startedAtRef.current = Date.now();
        }}
        playsInline
        preload="metadata"
        ref={videoRef}
        src={activeUrl}
      />
    );
  }

  return (
    <div className="absolute inset-0">
      <a aria-label={`Open post: ${caption}`} className="absolute inset-0 block" href={`/posts/${postId}`}>
        <img alt={caption} className="size-full object-cover" src={activeUrl} />
      </a>
      {hasCarousel ? (
        <>
          <button
            aria-label="Previous image"
            className="absolute left-3 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-[5px] border border-white/15 bg-black/40 text-white backdrop-blur transition hover:bg-cyan-300/18"
            onClick={() => move(-1)}
            type="button"
          >
            <ChevronLeft className="size-4" />
          </button>
          <button
            aria-label="Next image"
            className="absolute right-16 top-1/2 z-20 grid size-9 -translate-y-1/2 place-items-center rounded-[5px] border border-white/15 bg-black/40 text-white backdrop-blur transition hover:bg-cyan-300/18"
            onClick={() => move(1)}
            type="button"
          >
            <ChevronRight className="size-4" />
          </button>
          <div className="app-scrollbar absolute bottom-24 left-4 right-20 z-20 flex gap-1.5 overflow-x-auto pb-1">
            {urls.map((url, index) => (
              <button
                aria-label={`Show image ${index + 1}`}
                className={`h-1.5 shrink-0 rounded-full transition ${index === activeIndex ? "w-8 bg-cyan-200" : "w-4 bg-white/35 hover:bg-white/60"}`}
                key={`${url}-${index}`}
                onClick={() => setActiveIndex(index)}
                type="button"
              />
            ))}
          </div>
        </>
      ) : null}
    </div>
  );
}
