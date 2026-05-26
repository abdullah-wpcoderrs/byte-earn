import "server-only";

import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

export type FeedComment = {
  author: string;
  body: string;
  id: string;
};

export type UserBadge = {
  color: string;
  id: string;
  imageUrl: string | null;
  name: string;
};

export type FeedPost = {
  audioUrl: string | null;
  author: string;
  authorId: string;
  authorBadges: UserBadge[];
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
  author?: string;
  caption: string;
  handle?: string;
  id: string;
  likesCount: number;
  mediaUrl: string;
  status: "pending" | "published" | "rejected";
  type: "image_audio" | "image_text" | "video_text";
};

type PostRow = {
  audio_url: string | null;
  author_id: string;
  bookmarks_count: number;
  caption: string;
  comments_count: number;
  id: string;
  likes_count: number;
  media_url: string;
  profiles: RelationProfile;
  type: "image_audio" | "image_text" | "video_text";
};

type CommentRow = {
  body: string;
  id: string;
  post_id: string;
  profiles:
    | {
        display_name: string | null;
      }
    | Array<{
        display_name: string | null;
      }>
    | null;
};

type RelationProfile =
  | {
      display_name: string | null;
      referral_code?: string;
    }
  | Array<{
      display_name: string | null;
      referral_code?: string;
    }>
  | null;

type ProfileRow = {
  display_name: string | null;
  id: string;
  referral_code: string;
  referral_count: number;
};

type ProfileBadgeRow = {
  badge_id: string;
  badges:
    | {
        color: string;
        image_url: string | null;
        name: string;
      }
    | Array<{
        color: string;
        image_url: string | null;
        name: string;
      }>
    | null;
  profile_id: string;
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

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

async function getBadgesByProfile(profileIds: string[]) {
  const uniqueProfileIds = Array.from(new Set(profileIds)).filter(Boolean);
  const badgesByProfile = new Map<string, UserBadge[]>();

  if (uniqueProfileIds.length === 0) {
    return badgesByProfile;
  }

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const fetchBadges = (includeImageUrl: boolean) =>
    supabase
      .from("profile_badges")
      .select(`profile_id, badge_id, badges:badge_id(name, color${includeImageUrl ? ", image_url" : ""})`)
      .in("profile_id", uniqueProfileIds);

  const primaryResult = await fetchBadges(true);
  const missingBadgeImageColumn =
    primaryResult.error?.message.includes("image_url") ||
    primaryResult.error?.message.includes("schema cache");
  const { data, error } = missingBadgeImageColumn ? await fetchBadges(false) : primaryResult;

  if (error) {
    const missingProfileBadges = error.message.includes("profile_badges") || error.message.includes("schema cache");
    if (missingProfileBadges) {
      return badgesByProfile;
    }
    throw new Error(error.message);
  }

  ((data ?? []) as unknown as ProfileBadgeRow[]).forEach((row) => {
    const badge = firstRelation(row.badges);
    if (!badge) return;
    const current = badgesByProfile.get(row.profile_id) ?? [];
    current.push({
      color: badge.color,
      id: row.badge_id,
      imageUrl: "image_url" in badge ? badge.image_url : null,
      name: badge.name,
    });
    badgesByProfile.set(row.profile_id, current);
  });

  return badgesByProfile;
}

async function getViewerId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  return user?.id ?? null;
}

function toProfilePost(row: {
  author_id?: string;
  caption: string;
  id: string;
  likes_count: number;
  media_url: string;
  profiles?: RelationProfile;
  status?: "pending" | "published" | "rejected";
  type: "image_audio" | "image_text" | "video_text";
}): ProfilePost {
  const authorProfile = firstRelation(row.profiles);
  const referralCode = authorProfile?.referral_code ?? row.author_id ?? "";

  return {
    author: authorProfile?.display_name ?? undefined,
    caption: row.caption,
    handle: referralCode || row.author_id,
    id: row.id,
    likesCount: row.likes_count,
    mediaUrl: row.media_url,
    status: row.status ?? "published",
    type: row.type,
  };
}

async function attachPostMetadata(rows: PostRow[], viewerId: string | null) {
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const postIds = rows.map((row) => row.id);
  const authorIds = rows.map((row) => row.author_id);

  if (postIds.length === 0) {
    return [];
  }

  const commentsQuery = supabase
    .from("post_comments")
    .select("id, post_id, body, profiles:profile_id(display_name)")
    .in("post_id", postIds)
    .order("created_at", { ascending: false })
    .limit(120);

  const likesQuery = viewerId
    ? supabase.from("post_likes").select("post_id").eq("profile_id", viewerId).in("post_id", postIds)
    : Promise.resolve({ data: [] });

  const bookmarksQuery = viewerId
    ? supabase.from("post_bookmarks").select("post_id").eq("profile_id", viewerId).in("post_id", postIds)
    : Promise.resolve({ data: [] });

  const [commentsResult, likesResult, bookmarksResult, badgesByProfile] = await Promise.all([
    commentsQuery,
    likesQuery,
    bookmarksQuery,
    getBadgesByProfile(authorIds),
  ]);
  const comments = (commentsResult.data ?? []) as unknown as CommentRow[];
  const likedIds = new Set((likesResult.data ?? []).map((like) => like.post_id));
  const bookmarkedIds = new Set((bookmarksResult.data ?? []).map((bookmark) => bookmark.post_id));
  const commentsByPost = new Map<string, FeedComment[]>();

  comments.forEach((comment) => {
    const existing = commentsByPost.get(comment.post_id) ?? [];
    if (existing.length < 8) {
      existing.push({
        author: firstRelation(comment.profiles)?.display_name ?? "Creator",
        body: comment.body,
        id: comment.id,
      });
      commentsByPost.set(comment.post_id, existing);
    }
  });

  return rows.map((row): FeedPost => {
    const authorProfile = firstRelation(row.profiles as RelationProfile);
    const authorName = authorProfile?.display_name ?? null;
    const referralCode = authorProfile?.referral_code ?? row.author_id;

    return {
      audioUrl: row.audio_url,
      author: authorName ?? "Creator",
      authorBadges: badgesByProfile.get(row.author_id) ?? [],
      authorId: row.author_id,
      avatar: initialsFor(authorName, referralCode),
      bookmarkedByViewer: bookmarkedIds.has(row.id),
      bookmarksCount: row.bookmarks_count,
      caption: row.caption,
      comments: commentsByPost.get(row.id) ?? [],
      commentsCount: row.comments_count,
      handle: publicHandle(row.author_id, referralCode),
      id: row.id,
      likedByViewer: likedIds.has(row.id),
      likesCount: row.likes_count,
      mediaUrl: row.media_url,
      type: row.type,
    };
  });
}

export async function getFeedPosts() {
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const viewerId = await getViewerId();
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, type, caption, media_url, audio_url, likes_count, bookmarks_count, comments_count, profiles:author_id(display_name, referral_code)")
    .eq("status", "published")
    .order("created_at", { ascending: false })
    .limit(30);

  if (error) {
    throw new Error(error.message);
  }

  return attachPostMetadata((data ?? []) as unknown as PostRow[], viewerId);
}

export async function getPostById(postId: string) {
  if (!uuidPattern.test(postId)) {
    return null;
  }

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const viewerId = await getViewerId();
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, type, caption, media_url, audio_url, likes_count, bookmarks_count, comments_count, profiles:author_id(display_name, referral_code)")
    .eq("id", postId)
    .eq("status", "published")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!data) {
    return null;
  }

  const [post] = await attachPostMetadata([data as unknown as PostRow], viewerId);
  return post ?? null;
}

export async function getOwnProfileData() {
  const viewerId = await getViewerId();
  if (!viewerId) {
    return null;
  }
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();

  const [profileResult, postsResult, bookmarksResult, badgesByProfile] = await Promise.all([
    supabase.from("profiles").select("id, display_name, referral_code, referral_count").eq("id", viewerId).maybeSingle(),
    supabase
      .from("posts")
      .select("id, type, status, caption, media_url, likes_count")
      .eq("author_id", viewerId)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("post_bookmarks")
      .select("posts:post_id(id, author_id, type, status, caption, media_url, likes_count, profiles:author_id(display_name, referral_code))")
      .eq("profile_id", viewerId)
      .order("created_at", { ascending: false })
      .limit(60),
    getBadgesByProfile([viewerId]),
  ]);

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  if (postsResult.error) {
    throw new Error(postsResult.error.message);
  }

  if (bookmarksResult.error) {
    throw new Error(bookmarksResult.error.message);
  }

  const profile = profileResult.data as ProfileRow | null;
  if (!profile) {
    return null;
  }

  const ownPosts = (postsResult.data ?? []).map(toProfilePost);
  const savedPosts = ((bookmarksResult.data ?? []) as unknown as Array<{ posts: Parameters<typeof toProfilePost>[0] | Parameters<typeof toProfilePost>[0][] | null }>)
    .map((row) => firstRelation(row.posts))
    .filter((post): post is Parameters<typeof toProfilePost>[0] => Boolean(post && post.author_id !== viewerId && post.status === "published"))
    .map(toProfilePost);

  return {
    profile: {
      displayName: profile.display_name,
      id: profile.id,
      initials: initialsFor(profile.display_name, profile.referral_code),
      badges: badgesByProfile.get(profile.id) ?? [],
      referralCode: profile.referral_code,
      referralCount: profile.referral_count,
    },
    pendingPosts: ownPosts.filter((post) => post.status === "pending"),
    posts: ownPosts,
    publishedPosts: ownPosts.filter((post) => post.status === "published"),
    savedPosts,
  };
}

export async function getPublicProfileData(identifier: string) {
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const normalized = identifier.trim();
  const query = supabase.from("profiles").select("id, display_name, referral_code, referral_count");
  const profileResult = uuidPattern.test(normalized)
    ? await query.eq("id", normalized).maybeSingle()
    : await query.eq("referral_code", normalized.toUpperCase()).maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  const profile = profileResult.data as ProfileRow | null;
  if (!profile) {
    return null;
  }

  const [{ data, error }, badgesByProfile] = await Promise.all([
    supabase
      .from("posts")
      .select("id, type, status, caption, media_url, likes_count")
      .eq("author_id", profile.id)
      .eq("status", "published")
      .order("created_at", { ascending: false })
      .limit(60),
    getBadgesByProfile([profile.id]),
  ]);

  if (error) {
    throw new Error(error.message);
  }

  return {
    profile: {
      displayName: profile.display_name,
      id: profile.id,
      initials: initialsFor(profile.display_name, profile.referral_code),
      badges: badgesByProfile.get(profile.id) ?? [],
      referralCode: profile.referral_code,
      referralCount: profile.referral_count,
    },
    posts: (data ?? []).map(toProfilePost),
  };
}
