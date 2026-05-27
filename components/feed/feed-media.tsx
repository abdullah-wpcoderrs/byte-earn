"use client";

import { ChevronLeft, ChevronRight, Volume2, VolumeX } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { recordVideoWatchAction } from "@/app/(app)/posts/actions";

type FeedMediaProps = {
  audioUrl?: string | null;
  caption: string;
  mediaUrl: string;
  mediaUrls: string[];
  postId: string;
  type: "image_audio" | "image_text" | "video_text";
};

export function FeedMedia({ audioUrl = null, caption, mediaUrl, mediaUrls, postId, type }: FeedMediaProps) {
  const urls = mediaUrls.length > 0 ? mediaUrls : [mediaUrl];
  const [activeIndex, setActiveIndex] = useState(0);
  const [hasFocusWithin, setHasFocusWithin] = useState(false);
  const [isMuted, setIsMuted] = useState(true);
  const startedAtRef = useRef<number | null>(null);
  const lastReportedAtRef = useRef(0);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const activeUrl = urls[activeIndex] ?? mediaUrl;
  const canControlSound = type === "video_text" || (type === "image_audio" && Boolean(audioUrl));
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

  useEffect(() => {
    if (type !== "image_audio") {
      return;
    }

    const audio = audioRef.current;
    if (!audio) {
      return;
    }

    audio.muted = isMuted;

    const playAudio = async () => {
      try {
        await audio.play();
      } catch {
      }
    };

    playAudio();

    return () => {
      audio.pause();
      audio.currentTime = 0;
    };
  }, [audioUrl, isMuted, type]);

  function syncVideoMute(nextMuted: boolean) {
    const video = videoRef.current;
    if (video) {
      video.muted = nextMuted;
      if (!nextMuted) {
        video.volume = 1;
        video.play().catch(() => undefined);
      }
    }
  }

  function syncAudioMute(nextMuted: boolean) {
    const audio = audioRef.current;
    if (audio) {
      audio.muted = nextMuted;
      if (!nextMuted) {
        audio.volume = 1;
        audio.play().catch(() => undefined);
      }
    }
  }

  function toggleSound() {
    const nextMuted = !isMuted;
    setIsMuted(nextMuted);
    syncVideoMute(nextMuted);
    syncAudioMute(nextMuted);
  }

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
      <div
        className="group/media absolute inset-0"
        onBlur={(event) => setHasFocusWithin(event.currentTarget.contains(event.relatedTarget as Node | null))}
        onFocus={() => setHasFocusWithin(true)}
      >
        <video
          autoPlay
          className="absolute inset-0 size-full bg-slate-950 object-cover"
          loop
          muted={isMuted}
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
        {canControlSound ? (
          <MediaSoundButton hasFocusWithin={hasFocusWithin} isMuted={isMuted} onToggle={toggleSound} />
        ) : null}
      </div>
    );
  }

  return (
    <div
      className="group/media absolute inset-0"
      onBlur={(event) => setHasFocusWithin(event.currentTarget.contains(event.relatedTarget as Node | null))}
      onFocus={() => setHasFocusWithin(true)}
    >
      <a aria-label={`Open post: ${caption}`} className="absolute inset-0 block" href={`/posts/${postId}`}>
        <img alt={caption} className="size-full object-cover" src={activeUrl} />
      </a>
      {type === "image_audio" && audioUrl ? <audio autoPlay loop muted={isMuted} preload="metadata" ref={audioRef} src={audioUrl} /> : null}
      {canControlSound ? (
        <MediaSoundButton hasFocusWithin={hasFocusWithin} isMuted={isMuted} onToggle={toggleSound} />
      ) : null}
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

function MediaSoundButton({ hasFocusWithin, isMuted, onToggle }: { hasFocusWithin: boolean; isMuted: boolean; onToggle: () => void }) {
  const Icon = isMuted ? VolumeX : Volume2;

  return (
    <button
      aria-label={isMuted ? "Unmute media" : "Mute media"}
      className={`absolute right-4 top-4 z-30 grid size-10 place-items-center rounded-full border border-white/20 bg-black/45 text-white shadow-lg backdrop-blur transition duration-200 group-hover/media:opacity-100 group-focus-within/media:opacity-100 hover:bg-black/65 focus-visible:opacity-100 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-cyan-200/70 ${hasFocusWithin ? "opacity-100" : "opacity-0"}`}
      onClick={onToggle}
      type="button"
    >
      <Icon className="size-4" />
    </button>
  );
}
