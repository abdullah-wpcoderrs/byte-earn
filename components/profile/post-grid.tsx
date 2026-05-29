"use client";

import { BarChart3, Clapperboard, Heart, ImageIcon, Music2, Pencil, RotateCcw, Save, Share2, Trash2 } from "lucide-react";
import { useEffect, useRef, useState } from "react";
import { useFormStatus } from "react-dom";
import { deleteOwnPostAction, recordShareAction, resubmitOwnPostAction, updateOwnPostAction } from "@/app/(app)/posts/actions";
import { SubmitButton } from "@/components/ui/submit-button";
import { Modal } from "@/components/ui/modal";
import type { ProfilePost } from "@/lib/posts";

type PostGridProps = {
  posts: ProfilePost[];
  showOwnerControls?: boolean;
};

const postTypeMeta = {
  image_audio: { badge: "MP3", icon: Music2 },
  image_text: { badge: "Image", icon: ImageIcon },
  video_text: { badge: "Video", icon: Clapperboard },
};

const statusCopy = {
  pending: "Pending",
  published: "Live",
  rejected: "Rejected",
};

function compact(value: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function PostGrid({ posts, showOwnerControls = false }: PostGridProps) {
  const [editingPost, setEditingPost] = useState<ProfilePost | null>(null);
  const [activePostId, setActivePostId] = useState<string | null>(null);
  const [canHover, setCanHover] = useState(false);
  const longPressTimerRef = useRef<number | null>(null);
  const longPressTriggeredRef = useRef<string | null>(null);

  useEffect(() => {
    const mediaQuery = window.matchMedia("(hover: hover)");
    const updateCanHover = () => {
      setCanHover(mediaQuery.matches);
    };

    updateCanHover();
    mediaQuery.addEventListener("change", updateCanHover);

    return () => {
      mediaQuery.removeEventListener("change", updateCanHover);
    };
  }, []);

  useEffect(() => {
    return () => {
      if (longPressTimerRef.current) {
        window.clearTimeout(longPressTimerRef.current);
      }
    };
  }, []);

  useEffect(() => {
    if (!activePostId) {
      return;
    }

    function handlePointerDown(event: PointerEvent) {
      const target = event.target;
      if (!(target instanceof Element)) {
        return;
      }

      const ownerCard = target.closest("[data-profile-post-id]");
      if (ownerCard?.getAttribute("data-profile-post-id") === activePostId) {
        return;
      }

      setActivePostId(null);
    }

    document.addEventListener("pointerdown", handlePointerDown);
    return () => {
      document.removeEventListener("pointerdown", handlePointerDown);
    };
  }, [activePostId]);

  function clearLongPressTimer() {
    if (!longPressTimerRef.current) {
      return;
    }

    window.clearTimeout(longPressTimerRef.current);
    longPressTimerRef.current = null;
  }

  function handleLongPressStart(postId: string, pointerType: string) {
    if (!showOwnerControls || canHover || (pointerType !== "touch" && pointerType !== "pen")) {
      return;
    }

    clearLongPressTimer();
    longPressTriggeredRef.current = null;
    longPressTimerRef.current = window.setTimeout(() => {
      setActivePostId(postId);
      longPressTriggeredRef.current = postId;
      longPressTimerRef.current = null;
    }, 450);
  }

  function handleLongPressEnd() {
    clearLongPressTimer();
  }

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
        const isPublished = post.status === "published";
        const isControlsVisible = activePostId === post.id;
        const controlsVisibilityClass = isControlsVisible
          ? "opacity-100 scale-100 translate-y-0 pointer-events-auto"
          : canHover
            ? "pointer-events-none opacity-0 scale-75 translate-y-2 group-hover:opacity-100 group-hover:scale-100 group-hover:translate-y-0 group-hover:pointer-events-auto"
            : "pointer-events-none opacity-0 scale-75 translate-y-2";
        const analyticsVisibilityClass = isControlsVisible
          ? "opacity-0 -translate-x-10"
          : canHover
            ? "opacity-100 translate-x-0 group-hover:opacity-0 group-hover:-translate-x-10"
            : "opacity-100 translate-x-0";
        const statusTone = post.status === "rejected" ? "bg-rose-300/16 text-rose-100" : post.status === "pending" ? "bg-amber-300/16 text-amber-100" : "bg-cyan-300/16 text-cyan-100";
        const content = (
          <>
            <div
              aria-hidden="true"
              className="pointer-events-none absolute inset-0 bg-cover bg-center transition duration-300 group-hover:scale-105"
              style={{ backgroundImage: `url(${post.mediaUrl})` }}
            />
            <div aria-hidden="true" className="pointer-events-none absolute inset-0 bg-[linear-gradient(180deg,rgba(2,6,23,0.04),rgba(2,6,23,0.82))]" />
            <div className="absolute left-2 top-2 inline-flex items-center gap-1 rounded-[5px] bg-black/40 px-2 py-1 text-[10px] text-cyan-100 backdrop-blur">
              <Icon className="size-3" />
              <span className="hidden sm:inline">{badge}</span>
            </div>
            <div className={`absolute right-2 top-2 rounded-[5px] px-2 py-1 text-[10px] font-semibold backdrop-blur ${statusTone}`}>
              {statusCopy[post.status]}
            </div>
            <div className={`absolute bottom-2 left-2 z-20 hidden sm:block transition-all duration-300 ease-out ${analyticsVisibilityClass}`}>
              {post.handle ? <p className="mb-1 truncate text-[10px] text-cyan-100">@{post.handle}</p> : null}
              <p className="mt-1 flex items-center gap-2 text-[10px] text-slate-300">
                <span className="inline-flex items-center gap-1">
                  <BarChart3 className="size-3" />
                  {compact(post.impressionsCount)}
                </span>
                <span className="inline-flex items-center gap-1">
                  <Heart className="size-3" />
                  {compact(post.likesCount)}
                </span>
              </p>
            </div>
            {showOwnerControls ? (
              <div className={`absolute inset-x-2 bottom-2 z-30 transition-all duration-300 ease-[cubic-bezier(0.22,1,0.36,1)] ${controlsVisibilityClass}`}>
                <div className={`grid items-center ${post.status === "rejected" ? "grid-cols-4" : "grid-cols-3"}`}>
                  <IconToolButton icon={<Pencil className="size-4" />} label="Edit post" onClick={() => setEditingPost(post)} />
                  <IconToolButton icon={<Share2 className="size-4" />} label="Share post" onClick={() => sharePost(post.id, post.caption)} />
                  {post.status === "rejected" ? (
                    <form action={resubmitOwnPostAction}>
                      <input name="postId" type="hidden" value={post.id} />
                      <IconSubmitButton icon={<RotateCcw className="size-4" />} label="Resubmit post" />
                    </form>
                  ) : null}
                  <form action={deleteOwnPostAction}>
                    <input name="postId" type="hidden" value={post.id} />
                    <IconSubmitButton destructive icon={<Trash2 className="size-4" />} label="Delete post" />
                  </form>
                </div>
              </div>
            ) : null}
          </>
        );

        return (
          <article
            className="group"
            data-profile-post-id={post.id}
            key={post.id}
          >
            <div
              aria-label={isPublished ? `Open post: ${post.caption}` : `${statusCopy[post.status]} post: ${post.caption}`}
              className="relative aspect-[3/4] overflow-hidden rounded-[5px] border border-white/10 bg-slate-950"
              onPointerCancel={handleLongPressEnd}
              onPointerDown={(event) => handleLongPressStart(post.id, event.pointerType)}
              onPointerLeave={handleLongPressEnd}
              onPointerUp={handleLongPressEnd}
              role={isPublished ? undefined : "img"}
            >
              {isPublished ? (
                <a
                  aria-label={`Open post: ${post.caption}`}
                  className="absolute inset-0 z-10"
                  href={`/posts/${post.id}`}
                  onClick={(event) => {
                    if (longPressTriggeredRef.current === post.id) {
                      event.preventDefault();
                      longPressTriggeredRef.current = null;
                    }
                  }}
                />
              ) : null}
              {content}
            </div>
          </article>
        );
      })}
      <Modal className="max-w-lg" onClose={() => setEditingPost(null)} open={Boolean(editingPost)} title="Edit post">
        {editingPost ? (
          <form action={updateOwnPostAction} className="grid gap-3">
            <input name="postId" type="hidden" value={editingPost.id} />
            <label className="grid gap-2">
              <span className="font-medium text-slate-200">Caption</span>
              <textarea
                className="min-h-32 resize-none rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 py-2 text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/55"
                defaultValue={editingPost.caption}
                maxLength={600}
                name="caption"
                required
              />
            </label>
            <SubmitButton icon={<Save className="size-4" />} pendingLabel="Saving..." type="submit">
              Save changes
            </SubmitButton>
          </form>
        ) : null}
      </Modal>
    </div>
  );
}

function IconToolButton({ icon, label, onClick }: { icon: React.ReactNode; label: string; onClick: () => void }) {
  return (
    <button
      aria-label={label}
      className="grid size-6 w-full place-items-center text-slate-200 transition hover:text-cyan-100"
      onClick={onClick}
      title={label}
      type="button"
    >
      {icon}
    </button>
  );
}

function IconSubmitButton({
  destructive = false,
  icon,
  label,
}: {
  destructive?: boolean;
  icon: React.ReactNode;
  label: string;
}) {
  const { pending } = useFormStatus();

  return (
    <button
      aria-label={label}
      className={`grid size-6 w-full place-items-center transition ${destructive ? "text-slate-200 hover:text-rose-300" : "text-slate-200 hover:text-cyan-100"} disabled:opacity-50`}
      disabled={pending}
      title={label}
      type="submit"
    >
      {icon}
    </button>
  );
}

async function sharePost(postId: string, caption: string) {
  const url = `${window.location.origin}/posts/${postId}`;

  if (navigator.share) {
    await navigator.share({ text: caption, title: "byte-earn post", url }).catch(() => undefined);
    await recordShareAction(postId).catch(() => undefined);
    return;
  }

  await navigator.clipboard?.writeText(url).catch(() => undefined);
  await recordShareAction(postId).catch(() => undefined);
}
