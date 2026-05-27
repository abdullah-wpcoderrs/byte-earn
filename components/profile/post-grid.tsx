"use client";

import { BarChart3, Clapperboard, Heart, ImageIcon, Music2, Pencil, RotateCcw, Save, Share2, Trash2 } from "lucide-react";
import { useState } from "react";
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

function truncateWords(text: string, limit = 50) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= limit) return text;
  return `${words.slice(0, limit).join(" ")}...`;
}

function compact(value: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function PostGrid({ posts, showOwnerControls = false }: PostGridProps) {
  const [editingPost, setEditingPost] = useState<ProfilePost | null>(null);

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
            <div className="absolute bottom-2 left-2 right-2 hidden sm:block">
              {post.handle ? <p className="mb-1 truncate text-[10px] text-cyan-100">@{post.handle}</p> : null}
              <p className="line-clamp-3 font-medium leading-4 text-white">{truncateWords(post.caption)}</p>
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
          </>
        );

        const ownerControls = showOwnerControls ? (
          <div className={`hidden gap-1.5 rounded-b-[5px] border-x border-b border-white/10 bg-white/[0.035] p-1.5 sm:grid ${post.status === "rejected" ? "grid-cols-4" : "grid-cols-3"}`}>
            <IconToolButton icon={<Pencil className="size-4" />} label="Edit post" onClick={() => setEditingPost(post)} />
            <IconToolButton icon={<Share2 className="size-4" />} label="Share post" onClick={() => sharePost(post.id, post.caption)} />
            {post.status === "rejected" ? (
              <form action={resubmitOwnPostAction}>
                <input name="postId" type="hidden" value={post.id} />
                <SubmitButton className="size-9 w-full px-0" icon={<RotateCcw className="size-4" />} pendingLabel="" title="Resubmit post" type="submit" variant="secondary">
                  <span className="sr-only">Resubmit post</span>
                </SubmitButton>
              </form>
            ) : null}
            <form action={deleteOwnPostAction}>
              <input name="postId" type="hidden" value={post.id} />
              <SubmitButton className="size-9 w-full px-0" icon={<Trash2 className="size-4" />} pendingLabel="" title="Delete post" type="submit" variant="danger">
                <span className="sr-only">Delete post</span>
              </SubmitButton>
            </form>
          </div>
        ) : null;

        const tile = isPublished ? (
          <a
            aria-label={`Open post: ${post.caption}`}
            className={`group relative aspect-[3/4] overflow-hidden border border-white/10 bg-slate-950 ${showOwnerControls ? "rounded-t-[5px]" : "rounded-[5px]"}`}
            href={`/posts/${post.id}`}
          >
            {content}
          </a>
        ) : (
          <div
            aria-label={`${statusCopy[post.status]} post: ${post.caption}`}
            className={`group relative aspect-[3/4] overflow-hidden border border-white/10 bg-slate-950 ${showOwnerControls ? "rounded-t-[5px]" : "rounded-[5px]"}`}
            role="img"
          >
            {content}
          </div>
        );

        return (
          <article className="grid" key={post.id}>
            {tile}
            {ownerControls}
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
      className="grid size-9 w-full place-items-center rounded-[5px] border border-white/10 bg-white/[0.055] text-slate-100 transition hover:border-cyan-200/35 hover:bg-cyan-300/12 hover:text-cyan-100"
      onClick={onClick}
      title={label}
      type="button"
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
