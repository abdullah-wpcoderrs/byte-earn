"use client";

import { Bookmark, Clock3, Grid3X3, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { PostGrid } from "@/components/profile/post-grid";
import type { ProfilePost } from "@/lib/posts";

type ProfilePostTabsProps = {
  pendingPosts: ProfilePost[];
  publishedPosts: ProfilePost[];
  rejectedPosts: ProfilePost[];
  savedPosts: ProfilePost[];
};

type TabKey = "pending" | "published" | "rejected" | "saved";

const tabs = [
  { empty: "No published posts yet.", icon: Grid3X3, key: "published", label: "Published" },
  { empty: "No posts waiting for approval.", icon: Clock3, key: "pending", label: "Pending" },
  { empty: "No rejected posts.", icon: XCircle, key: "rejected", label: "Rejected" },
  { empty: "No saved posts yet.", icon: Bookmark, key: "saved", label: "Saved" },
] as const;

export function ProfilePostTabs({ pendingPosts, publishedPosts, rejectedPosts, savedPosts }: ProfilePostTabsProps) {
  const initialTab =
    publishedPosts.length === 0 && pendingPosts.length > 0
      ? "pending"
      : publishedPosts.length === 0 && rejectedPosts.length > 0
        ? "rejected"
        : "published";
  const [activeTab, setActiveTab] = useState<TabKey>(initialTab);
  const activePosts = useMemo(
    () => ({
      pending: pendingPosts,
      published: publishedPosts,
      rejected: rejectedPosts,
      saved: savedPosts,
    }),
    [pendingPosts, publishedPosts, rejectedPosts, savedPosts],
  );
  const selected = tabs.find((tab) => tab.key === activeTab) ?? tabs[0];
  const posts = activePosts[activeTab];

  return (
    <section className="grid gap-4">
      <div className="border-y border-white/10">
        <div className="grid grid-cols-4">
          {tabs.map((tab) => {
            const active = activeTab === tab.key;
            const Icon = tab.icon;
            const count = activePosts[tab.key].length;

            return (
              <button
                aria-pressed={active}
                className={`relative inline-flex min-h-12 items-center justify-center gap-2 px-2 font-semibold transition ${
                  active ? "text-cyan-100" : "text-slate-400 hover:text-slate-100"
                }`}
                key={tab.key}
                onClick={() => setActiveTab(tab.key)}
                type="button"
              >
                <Icon className="size-4" />
                <span>{tab.label}</span>
                <span className="text-[10px] text-muted">{count}</span>
                {active ? <span className="absolute inset-x-6 bottom-0 h-px bg-cyan-200" /> : null}
              </button>
            );
          })}
        </div>
      </div>

      {posts.length > 0 ? (
        <PostGrid posts={posts} showOwnerControls={activeTab !== "saved"} />
      ) : (
        <div className="grid min-h-40 place-items-center border-y border-white/10 py-8 text-center text-muted">
          {selected.empty}
        </div>
      )}
    </section>
  );
}
