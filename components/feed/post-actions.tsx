"use client";

import { Bookmark, Heart, MessageCircle } from "lucide-react";
import { useState, useTransition } from "react";
import { addCommentAction, toggleBookmarkAction, toggleLikeAction } from "@/app/(app)/posts/actions";
import { ReferralShareButton } from "@/components/share/referral-share-button";
import { Sheet } from "@/components/ui/sheet";
import type { FeedComment } from "@/lib/posts";

type PostActionsProps = {
  bookmarkedByViewer: boolean;
  bookmarksCount: number;
  comments: FeedComment[];
  commentsCount: number;
  likedByViewer: boolean;
  likesCount: number;
  postId: string;
};

function compact(value: number) {
  return Intl.NumberFormat("en", { notation: "compact", maximumFractionDigits: 1 }).format(value);
}

export function PostActions({
  bookmarkedByViewer,
  bookmarksCount,
  comments,
  commentsCount,
  likedByViewer,
  likesCount,
  postId,
}: PostActionsProps) {
  const [liked, setLiked] = useState(likedByViewer);
  const [bookmarked, setBookmarked] = useState(bookmarkedByViewer);
  const [localLikes, setLocalLikes] = useState(likesCount);
  const [localBookmarks, setLocalBookmarks] = useState(bookmarksCount);
  const [localComments, setLocalComments] = useState(comments);
  const [localCommentsCount, setLocalCommentsCount] = useState(commentsCount);
  const [commentBody, setCommentBody] = useState("");
  const [commentsOpen, setCommentsOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [isPending, startTransition] = useTransition();

  function toggleLike() {
    const nextLiked = !liked;
    setLiked(nextLiked);
    setLocalLikes((count) => Math.max(0, count + (nextLiked ? 1 : -1)));
    setMessage("");

    startTransition(async () => {
      try {
        const result = await toggleLikeAction(postId);
        setLiked(result.active);
      } catch (error) {
        setLiked(!nextLiked);
        setLocalLikes((count) => Math.max(0, count + (nextLiked ? -1 : 1)));
        setMessage(error instanceof Error ? error.message : "Could not update like.");
      }
    });
  }

  function toggleBookmark() {
    const nextBookmarked = !bookmarked;
    setBookmarked(nextBookmarked);
    setLocalBookmarks((count) => Math.max(0, count + (nextBookmarked ? 1 : -1)));
    setMessage("");

    startTransition(async () => {
      try {
        const result = await toggleBookmarkAction(postId);
        setBookmarked(result.active);
      } catch (error) {
        setBookmarked(!nextBookmarked);
        setLocalBookmarks((count) => Math.max(0, count + (nextBookmarked ? -1 : 1)));
        setMessage(error instanceof Error ? error.message : "Could not update bookmark.");
      }
    });
  }

  function addComment() {
    const nextBody = commentBody.trim();
    if (!nextBody) {
      setMessage("Write a comment first.");
      return;
    }

    setMessage("");
    startTransition(async () => {
      try {
        const result = await addCommentAction(postId, nextBody);
        setLocalComments((current) => [{ author: "You", body: nextBody, id: result.id ?? `${postId}-${Date.now()}` }, ...current]);
        setLocalCommentsCount((count) => count + 1);
        setCommentBody("");
        setMessage("Comment posted.");
      } catch (error) {
        setMessage(error instanceof Error ? error.message : "Could not post comment.");
      }
    });
  }

  return (
    <>
      <div className="flex flex-col gap-3">
        <ActionButton active={liked} count={compact(localLikes)} disabled={isPending} label="Like post" onClick={toggleLike}>
          <Heart className={`size-5 ${liked ? "fill-current" : ""}`} />
        </ActionButton>
        <ActionButton count={compact(localCommentsCount)} label="Open comments" onClick={() => setCommentsOpen(true)}>
          <MessageCircle className="size-5" />
        </ActionButton>
        <ActionButton active={bookmarked} count={compact(localBookmarks)} disabled={isPending} label="Bookmark post" onClick={toggleBookmark}>
          <Bookmark className={`size-5 ${bookmarked ? "fill-current" : ""}`} />
        </ActionButton>
        <ReferralShareButton
          className="grid min-h-[54px] min-w-[46px] place-items-center rounded-[5px] border border-white/15 bg-black/32 text-center text-white backdrop-blur transition hover:bg-cyan-300/12"
          label="Share"
        />
      </div>

      <Sheet onClose={() => setCommentsOpen(false)} open={commentsOpen} title="Comments">
        <div className="grid gap-3">
          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Add comment</span>
            <textarea
              className="min-h-24 resize-none rounded-[5px] border border-white/10 bg-white/[0.055] px-3 py-3 text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/55"
              maxLength={500}
              onChange={(event) => setCommentBody(event.target.value)}
              placeholder="Write a comment..."
              value={commentBody}
            />
          </label>
          <button
            className="inline-flex min-h-10 items-center justify-center rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={isPending}
            onClick={addComment}
            type="button"
          >
            Post comment
          </button>
          {message ? (
            <div className="rounded-[5px] border border-cyan-200/20 bg-cyan-300/10 p-3 text-cyan-50">{message}</div>
          ) : null}
          {localComments.map((comment) => (
            <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3" key={comment.id}>
              <p className="font-semibold text-slate-100">{comment.author}</p>
              <p className="mt-1 leading-5 text-slate-300">{comment.body}</p>
            </div>
          ))}
          {localComments.length === 0 ? (
            <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3 text-muted">No comments yet.</div>
          ) : null}
        </div>
      </Sheet>
    </>
  );
}

function ActionButton({
  active,
  children,
  count,
  disabled,
  label,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  count: string;
  disabled?: boolean;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`grid min-h-[54px] min-w-[46px] place-items-center rounded-[5px] border text-center transition disabled:cursor-not-allowed disabled:opacity-60 ${
        active
          ? "border-cyan-200/30 bg-cyan-300/18 text-cyan-100"
          : "border-white/15 bg-black/32 text-white backdrop-blur hover:bg-cyan-300/12"
      }`}
      disabled={disabled}
      onClick={onClick}
      type="button"
    >
      {children}
      <span className="mt-1 text-[10px] leading-none text-slate-300">{count}</span>
    </button>
  );
}
