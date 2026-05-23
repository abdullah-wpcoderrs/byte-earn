"use client";

import { Bookmark, Heart, MessageCircle } from "lucide-react";
import { useState } from "react";
import { ReferralShareButton } from "@/components/share/referral-share-button";
import { Sheet } from "@/components/ui/sheet";

type PostActionsProps = {
  bookmarks: string;
  comments: Array<[string, string]>;
  likes: string;
};

export function PostActions({ bookmarks, comments, likes }: PostActionsProps) {
  const [liked, setLiked] = useState(false);
  const [bookmarked, setBookmarked] = useState(false);
  const [commentsOpen, setCommentsOpen] = useState(false);

  return (
    <>
      <div className="flex flex-col gap-3">
        <ActionButton active={liked} count={likes} label="Like post" onClick={() => setLiked((value) => !value)}>
          <Heart className={`size-5 ${liked ? "fill-current" : ""}`} />
        </ActionButton>
        <ActionButton count={String(comments.length)} label="Open comments" onClick={() => setCommentsOpen(true)}>
          <MessageCircle className="size-5" />
        </ActionButton>
        <ActionButton active={bookmarked} count={bookmarks} label="Bookmark post" onClick={() => setBookmarked((value) => !value)}>
          <Bookmark className={`size-5 ${bookmarked ? "fill-current" : ""}`} />
        </ActionButton>
        <ReferralShareButton
          className="grid min-h-[54px] min-w-[46px] place-items-center rounded-[5px] border border-white/15 bg-black/32 text-center text-white backdrop-blur transition hover:bg-cyan-300/12"
          label="Share"
        />
      </div>

      <Sheet onClose={() => setCommentsOpen(false)} open={commentsOpen} title="Comments">
        <div className="grid gap-3">
          {comments.map(([author, body]) => (
            <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3" key={`${author}-${body}`}>
              <p className="font-semibold text-slate-100">{author}</p>
              <p className="mt-1 leading-5 text-slate-300">{body}</p>
            </div>
          ))}
          <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3 text-muted">Comment composer will connect after post writes are live.</div>
        </div>
      </Sheet>
    </>
  );
}

function ActionButton({
  active,
  children,
  count,
  label,
  onClick,
}: {
  active?: boolean;
  children: React.ReactNode;
  count: string;
  label: string;
  onClick: () => void;
}) {
  return (
    <button
      aria-label={label}
      className={`grid min-h-[54px] min-w-[46px] place-items-center rounded-[5px] border text-center transition ${
        active
          ? "border-cyan-200/30 bg-cyan-300/18 text-cyan-100"
          : "border-white/15 bg-black/32 text-white backdrop-blur hover:bg-cyan-300/12"
      }`}
      onClick={onClick}
      type="button"
    >
      {children}
      <span className="mt-1 text-[10px] leading-none text-slate-300">{count}</span>
    </button>
  );
}
