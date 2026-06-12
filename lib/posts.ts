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
  impressionsCount: number;
  likedByViewer: boolean;
  likesCount: number;
  mediaUrl: string;
  mediaUrls: string[];
  sharesCount: number;
  type: "image_audio" | "image_text" | "video_text";
  videoWatchSecondsTotal: number;
  videoWatchSessionsCount: number;
};

export type ProfilePost = {
  author?: string;
  caption: string;
  handle?: string;
  id: string;
  impressionsCount: number;
  likesCount: number;
  mediaUrl: string;
  mediaUrls: string[];
  status: "pending" | "published" | "rejected";
  type: "image_audio" | "image_text" | "video_text";
};

export type PostAnalytics = {
  avgWatchSeconds: number | null;
  bookmarksCount: number;
  commentsCount: number;
  impressionsCount: number;
  likesCount: number;
  sharesCount: number;
};

type PostRow = {
  audio_url: string | null;
  author_id: string;
  bookmarks_count: number;
  caption: string;
  comments_count: number;
  id: string;
  impressions_count?: number | null;
  likes_count: number;
  media_url: string;
  media_urls?: string | null;
  profiles: RelationProfile;
  shares_count?: number | null;
  type: "image_audio" | "image_text" | "video_text";
  video_watch_seconds_total?: number | null;
  video_watch_sessions_count?: number | null;
};

function isMissingPostCounterRpc(message: string) {
  return message.includes("increment_post_counter");
}

type CommentRow = {
  body: string;
  id: string;
  post_id: string;
  profiles:
    | {
        display_name: string | null;
        username?: string | null;
      }
    | Array<{
        display_name: string | null;
        username?: string | null;
      }>
    | null;
};

type RelationProfile =
  | {
      display_name: string | null;
      referral_code?: string;
      username?: string | null;
    }
  | Array<{
      display_name: string | null;
      referral_code?: string;
      username?: string | null;
    }>
  | null;

type ProfileRow = {
  display_name: string | null;
  id: string;
  referral_code: string;
  referral_count: number;
  username: string | null;
  bank_name?: string | null;
  account_number?: string | null;
  account_name?: string | null;
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

function publicHandle(profileId: string, username: string | null | undefined, referralCode: string | undefined) {
  return username || referralCode || profileId;
}

function firstRelation<T>(value: T | T[] | null | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function parseMediaUrls(value: string | null | undefined, fallback: string) {
  if (!value) return [fallback];
  try {
    const parsed = JSON.parse(value);
    if (Array.isArray(parsed)) {
      const urls = parsed.filter((url): url is string => typeof url === "string" && url.length > 0);
      return urls.length > 0 ? urls : [fallback];
    }
  } catch {
    return [fallback];
  }
  return [fallback];
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

export async function getViewerId() {
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
  impressions_count?: number | null;
  likes_count: number;
  media_url: string;
  media_urls?: string | null;
  profiles?: RelationProfile;
  status?: "pending" | "published" | "rejected";
  type: "image_audio" | "image_text" | "video_text";
}): ProfilePost {
  const authorProfile = firstRelation(row.profiles);
  const referralCode = authorProfile?.referral_code;
  const username = authorProfile?.username ?? null;
  const handle = publicHandle(row.author_id ?? "", username, referralCode);

  return {
    author: username ?? authorProfile?.display_name ?? undefined,
    caption: row.caption,
    handle,
    id: row.id,
    impressionsCount: row.impressions_count ?? 0,
    likesCount: row.likes_count,
    mediaUrl: row.media_url,
    mediaUrls: parseMediaUrls(row.media_urls, row.media_url),
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
        author: firstRelation(comment.profiles)?.username ?? firstRelation(comment.profiles)?.display_name ?? "Creator",
        body: comment.body,
        id: comment.id,
      });
      commentsByPost.set(comment.post_id, existing);
    }
  });

  return rows.map((row): FeedPost => {
    const authorProfile = firstRelation(row.profiles as RelationProfile);
    const username = authorProfile?.username ?? null;
    const authorName = authorProfile?.display_name ?? null;
    const referralCode = authorProfile?.referral_code ?? row.author_id;

    return {
      audioUrl: row.audio_url,
      author: username ?? authorName ?? "Creator",
      authorBadges: badgesByProfile.get(row.author_id) ?? [],
      authorId: row.author_id,
      avatar: initialsFor(authorName, username ?? referralCode),
      bookmarkedByViewer: bookmarkedIds.has(row.id),
      bookmarksCount: row.bookmarks_count,
      caption: row.caption,
      comments: commentsByPost.get(row.id) ?? [],
      commentsCount: row.comments_count,
      handle: publicHandle(row.author_id, username, referralCode),
      id: row.id,
      impressionsCount: row.impressions_count ?? 0,
      likedByViewer: likedIds.has(row.id),
      likesCount: row.likes_count,
      mediaUrl: row.media_url,
      mediaUrls: parseMediaUrls(row.media_urls, row.media_url),
      sharesCount: row.shares_count ?? 0,
      type: row.type,
      videoWatchSecondsTotal: row.video_watch_seconds_total ?? 0,
      videoWatchSessionsCount: row.video_watch_sessions_count ?? 0,
    };
  });
}

export async function getFeedPosts() {
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const viewerId = await getViewerId();
  const { data, error } = await supabase
    .from("posts")
    .select("id, author_id, type, caption, media_url, media_urls, audio_url, likes_count, impressions_count, bookmarks_count, comments_count, shares_count, video_watch_seconds_total, video_watch_sessions_count, profiles:author_id(display_name, referral_code, username)")
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
    .select("id, author_id, type, caption, media_url, media_urls, audio_url, likes_count, impressions_count, bookmarks_count, comments_count, shares_count, video_watch_seconds_total, video_watch_sessions_count, profiles:author_id(display_name, referral_code, username)")
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

export async function recordPostImpression(postId: string) {
  if (!uuidPattern.test(postId)) {
    return;
  }

  const viewerId = await getViewerId();
  if (!viewerId) {
    return;
  }

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { error } = await supabase.rpc("increment_post_counter", {
    counter_delta: 1,
    counter_name: "impressions_count",
    target_post_id: postId,
    viewer_profile_id: viewerId,
  });

  if (error && !error.message.includes("Post is not available") && !isMissingPostCounterRpc(error.message)) {
    throw new Error(error.message);
  }
}

export async function getOwnPostAnalytics(postId: string): Promise<PostAnalytics | null> {
  if (!uuidPattern.test(postId)) {
    return null;
  }

  const viewerId = await getViewerId();
  if (!viewerId) {
    return null;
  }

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data, error } = await supabase
    .from("posts")
    .select("author_id, likes_count, bookmarks_count, comments_count, impressions_count, shares_count, video_watch_seconds_total, video_watch_sessions_count")
    .eq("id", postId)
    .maybeSingle();

  if (error || !data || data.author_id !== viewerId) {
    return null;
  }

  const sessions = data.video_watch_sessions_count ?? 0;
  return {
    avgWatchSeconds: sessions > 0 ? Math.round((data.video_watch_seconds_total ?? 0) / sessions) : null,
    bookmarksCount: data.bookmarks_count ?? 0,
    commentsCount: data.comments_count ?? 0,
    impressionsCount: data.impressions_count ?? 0,
    likesCount: data.likes_count ?? 0,
    sharesCount: data.shares_count ?? 0,
  };
}

export async function getOwnProfileData() {
  const viewerId = await getViewerId();
  if (!viewerId) {
    return null;
  }
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();

  const [profileResult, postsResult, bookmarksResult, badgesByProfile] = await Promise.all([
    supabase.from("profiles").select("id, display_name, referral_code, referral_count, username, bank_name, account_number, account_name").eq("id", viewerId).maybeSingle(),
    supabase
      .from("posts")
      .select("id, type, status, caption, media_url, media_urls, likes_count, impressions_count")
      .eq("author_id", viewerId)
      .order("created_at", { ascending: false })
      .limit(60),
    supabase
      .from("post_bookmarks")
      .select("posts:post_id(id, author_id, type, status, caption, media_url, media_urls, likes_count, impressions_count, profiles:author_id(display_name, referral_code, username))")
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
      initials: initialsFor(profile.display_name, profile.username ?? profile.referral_code),
      badges: badgesByProfile.get(profile.id) ?? [],
      referralCode: profile.referral_code,
      referralCount: profile.referral_count,
      username: profile.username,
      bankName: profile.bank_name,
      accountNumber: profile.account_number,
      accountName: profile.account_name,
    },
    pendingPosts: ownPosts.filter((post) => post.status === "pending"),
    posts: ownPosts,
    publishedPosts: ownPosts.filter((post) => post.status === "published"),
    rejectedPosts: ownPosts.filter((post) => post.status === "rejected"),
    savedPosts,
  };
}

export async function getPublicProfileData(identifier: string) {
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const normalized = identifier.trim();
  const query = supabase.from("profiles").select("id, display_name, referral_code, referral_count, username");
  const profileResult = uuidPattern.test(normalized)
    ? await query.eq("id", normalized).maybeSingle()
    : await query.eq("username", normalized.toLowerCase()).maybeSingle();

  if (profileResult.error) {
    throw new Error(profileResult.error.message);
  }

  let profile = profileResult.data as ProfileRow | null;
  if (!profile && !uuidPattern.test(normalized)) {
    const referralResult = await query.eq("referral_code", normalized.toUpperCase()).maybeSingle();
    if (referralResult.error) {
      throw new Error(referralResult.error.message);
    }
    profile = referralResult.data as ProfileRow | null;
  }

  if (!profile) {
    return null;
  }

  const [{ data, error }, badgesByProfile] = await Promise.all([
    supabase
      .from("posts")
      .select("id, type, status, caption, media_url, media_urls, likes_count, impressions_count")
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
      initials: initialsFor(profile.display_name, profile.username ?? profile.referral_code),
      badges: badgesByProfile.get(profile.id) ?? [],
      referralCode: profile.referral_code,
      referralCount: profile.referral_count,
      username: profile.username,
    },
    posts: (data ?? []).map(toProfilePost),
  };
}
