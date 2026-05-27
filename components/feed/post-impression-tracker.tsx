"use client";

import { useEffect, useRef } from "react";
import { recordFeedImpressionAction } from "@/app/(app)/posts/actions";

type PostImpressionTrackerProps = {
  postId: string;
};

const viewWindowMs = 6 * 60 * 60 * 1000;

export function PostImpressionTracker({ postId }: PostImpressionTrackerProps) {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const element = ref.current;
    if (!element || typeof IntersectionObserver === "undefined") return;

    const storageKey = `post-impression:${postId}`;
    const lastSeen = Number(window.localStorage.getItem(storageKey) ?? 0);
    if (Date.now() - lastSeen < viewWindowMs) return;

    let timer: number | null = null;
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry?.isIntersecting && entry.intersectionRatio >= 0.6) {
          timer = window.setTimeout(() => {
            window.localStorage.setItem(storageKey, String(Date.now()));
            recordFeedImpressionAction(postId).catch(() => undefined);
            observer.disconnect();
          }, 900);
        } else if (timer) {
          window.clearTimeout(timer);
          timer = null;
        }
      },
      { threshold: [0.6] },
    );

    observer.observe(element);

    return () => {
      if (timer) window.clearTimeout(timer);
      observer.disconnect();
    };
  }, [postId]);

  return <div ref={ref} className="pointer-events-none absolute inset-0" />;
}
