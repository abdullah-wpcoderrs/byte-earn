import "server-only";

import { and, desc, eq, inArray, or } from "drizzle-orm";
import { postBookmarks, postComments, postLikes, posts, profiles } from "@/db/schema";
import { getDb } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type FeedComment = {
  author: string;
  body: string;
  id: string;
};

export type FeedPost = {
  audioUrl: string | null;
  author: string;
  authorId: string;
  avatar: string;
  bookmarkedByViewer: boolean;
  bookmarksCount: number;
  caption: string;
  comments: FeedComment[];
  commentsCount: number;
  handle: string;
  id: string;
  likedByViewer: boolean;
  likesCount: number;
  mediaUrl: string;
  type: "image_audio" | "image_text" | "video_text";
};

export type ProfilePost = {
  caption: string;
  id: string;
  likesCount: number;
  mediaUrl: string;
  type: "image_audio" | "image_text" | "video_text";
};

export type ProfileSummary = {
  displayName: string | null;
  id: string;
  initials: string;
  referralCode: string;
  referralCount: number;
};

function initialsFor(name: string | null, fallback: string) {
  const source = name?.trim() || fallback;
  return source
    .split(/\s+/)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
}

function publicHandle(profileId: string, referralCode: string) {
  return referralCode || profileId;
}

async function getViewerId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

async function attachPostMetadata(rows: Array<{
  audioUrl: string | null;
  authorId: string;
  authorName: string | null;
  bookmarksCount: number;
  caption: string;
  commentsCount: number;
  id: string;
  likesCount: number;
  mediaUrl: string;
  referralCode: string | null;
  type: "image_audio" | "image_text" | "video_text";
}>, viewerId: string | null) {
  const db = getDb();
  const postIds = rows.map((row) => row.id);

  if (postIds.length === 0) {
    return [];
  }

  const [comments, likes, bookmarks] = await Promise.all([
    db
      .select({
        authorName: profiles.displayName,
        body: postComments.body,
        id: postComments.id,
        postId: postComments.postId,
      })
      .from(postComments)
      .leftJoin(profiles, eq(postComments.profileId, profiles.id))
      .where(inArray(postComments.postId, postIds))
      .orderBy(desc(postComments.createdAt))
      .limit(120),
    viewerId
      ? db.select({ postId: postLikes.postId }).from(postLikes).where(and(eq(postLikes.profileId, viewerId), inArray(postLikes.postId, postIds)))
      : Promise.resolve([]),
    viewerId
      ? db.select({ postId: postBookmarks.postId }).from(postBookmarks).where(and(eq(postBookmarks.profileId, viewerId), inArray(postBookmarks.postId, postIds)))
      : Promise.resolve([]),
  ]);

  const likedIds = new Set(likes.map((like) => like.postId));
  const bookmarkedIds = new Set(bookmarks.map((bookmark) => bookmark.postId));
  const commentsByPost = new Map<string, FeedComment[]>();

  comments.forEach((comment) => {
    const existing = commentsByPost.get(comment.postId) ?? [];
    if (existing.length < 8) {
      existing.push({
        author: comment.authorName ?? "Creator",
        body: comment.body,
        id: comment.id,
      });
      commentsByPost.set(comment.postId, existing);
    }
  });

  return rows.map((row): FeedPost => {
    const referralCode = row.referralCode ?? row.authorId;

    return {
      audioUrl: row.audioUrl,
      author: row.authorName ?? "Creator",
      authorId: row.authorId,
      avatar: initialsFor(row.authorName, referralCode),
      bookmarkedByViewer: bookmarkedIds.has(row.id),
      bookmarksCount: row.bookmarksCount,
      caption: row.caption,
      comments: commentsByPost.get(row.id) ?? [],
      commentsCount: row.commentsCount,
      handle: publicHandle(row.authorId, referralCode),
      id: row.id,
      likedByViewer: likedIds.has(row.id),
      likesCount: row.likesCount,
      mediaUrl: row.mediaUrl,
      type: row.type,
    };
  });
}

export async function getFeedPosts() {
  const viewerId = await getViewerId();
  const rows = await getDb()
    .select({
      audioUrl: posts.audioUrl,
      authorId: posts.authorId,
      authorName: profiles.displayName,
      bookmarksCount: posts.bookmarksCount,
      caption: posts.caption,
      commentsCount: posts.commentsCount,
      id: posts.id,
      likesCount: posts.likesCount,
      mediaUrl: posts.mediaUrl,
      referralCode: profiles.referralCode,
      type: posts.type,
    })
    .from(posts)
    .leftJoin(profiles, eq(posts.authorId, profiles.id))
    .where(eq(posts.status, "published"))
    .orderBy(desc(posts.createdAt))
    .limit(30);

  return attachPostMetadata(rows, viewerId);
}

export async function getPostById(postId: string) {
  if (!uuidPattern.test(postId)) {
    return null;
  }

  const viewerId = await getViewerId();
  const rows = await getDb()
    .select({
      audioUrl: posts.audioUrl,
      authorId: posts.authorId,
      authorName: profiles.displayName,
      bookmarksCount: posts.bookmarksCount,
      caption: posts.caption,
      commentsCount: posts.commentsCount,
      id: posts.id,
      likesCount: posts.likesCount,
      mediaUrl: posts.mediaUrl,
      referralCode: profiles.referralCode,
      type: posts.type,
    })
    .from(posts)
    .leftJoin(profiles, eq(posts.authorId, profiles.id))
    .where(and(eq(posts.id, postId), eq(posts.status, "published")))
    .limit(1);

  const [post] = await attachPostMetadata(rows, viewerId);
  return post ?? null;
}

export async function getOwnProfileData() {
  const viewerId = await getViewerId();
  if (!viewerId) {
    return null;
  }

  const db = getDb();
  const profile = await db.query.profiles.findFirst({
    columns: {
      displayName: true,
      id: true,
      referralCode: true,
      referralCount: true,
    },
    where: eq(profiles.id, viewerId),
  });

  if (!profile) {
    return null;
  }

  const gridPosts = await db
    .select({
      caption: posts.caption,
      id: posts.id,
      likesCount: posts.likesCount,
      mediaUrl: posts.mediaUrl,
      type: posts.type,
    })
    .from(posts)
    .where(eq(posts.authorId, viewerId))
    .orderBy(desc(posts.createdAt))
    .limit(60);

  return {
    profile: {
      ...profile,
      initials: initialsFor(profile.displayName, profile.referralCode),
    },
    posts: gridPosts,
  };
}

export async function getPublicProfileData(identifier: string) {
  const normalized = identifier.trim();
  const db = getDb();
  const profile = await db.query.profiles.findFirst({
    columns: {
      displayName: true,
      id: true,
      referralCode: true,
      referralCount: true,
    },
    where: uuidPattern.test(normalized)
      ? eq(profiles.id, normalized)
      : or(eq(profiles.referralCode, normalized), eq(profiles.referralCode, normalized.toUpperCase())),
  });

  if (!profile) {
    return null;
  }

  const gridPosts = await db
    .select({
      caption: posts.caption,
      id: posts.id,
      likesCount: posts.likesCount,
      mediaUrl: posts.mediaUrl,
      type: posts.type,
    })
    .from(posts)
    .where(and(eq(posts.authorId, profile.id), eq(posts.status, "published")))
    .orderBy(desc(posts.createdAt))
    .limit(60);

  return {
    profile: {
      ...profile,
      initials: initialsFor(profile.displayName, profile.referralCode),
    },
    posts: gridPosts,
  };
}
