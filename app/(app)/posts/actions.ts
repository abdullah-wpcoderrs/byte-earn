"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { postMediaUrls, removePostMediaFiles } from "@/lib/post-media";
import { getPlatformSettings } from "@/lib/platform-settings";
import { assertRateLimit } from "@/lib/rate-limit";
import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

type PostActionSnapshot = {
  bookmarked_by_viewer: boolean;
  bookmarks_count: number;
  comments_count: number;
  impressions_count: number;
  liked_by_viewer: boolean;
  likes_count: number;
  shares_count: number;
  video_watch_seconds_total: number;
  video_watch_sessions_count: number;
};

async function requireUserId() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    throw new Error("Sign in to continue.");
  }

  return user.id;
}

async function requireEligibleUserId() {
  const userId = await requireUserId();
  const supabase = await createClient();
  const { data: profile, error } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", userId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!profile || profile.status !== "active") {
    throw new Error("Your account cannot interact with posts right now.");
  }

  return userId;
}

async function requirePublishedPost(postId: string) {
  if (!uuidPattern.test(postId)) {
    throw new Error("Invalid post.");
  }

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data: post, error } = await supabase
    .from("posts")
    .select("id, author_id, status, likes_count, bookmarks_count, comments_count, impressions_count, shares_count, video_watch_seconds_total, video_watch_sessions_count")
    .eq("id", postId)
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  if (!post || post.status !== "published") {
    throw new Error("Post is not available.");
  }

  return post;
}

async function incrementPublishedPostCounter(
  postId: string,
  viewerId: string,
  counter: "impressions_count" | "shares_count" | "video_watch_seconds_total" | "video_watch_sessions_count",
  delta = 1,
) {
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data, error } = await supabase.rpc("increment_post_counter", {
    counter_delta: delta,
    counter_name: counter,
    target_post_id: postId,
    viewer_profile_id: viewerId,
  });

  if (error) {
    throw new Error(error.message);
  }

  return data?.[0] ?? null;
}

async function getPostActionSnapshot(postId: string, viewerId: string) {
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data, error } = await supabase.rpc("get_post_action_snapshot", {
    target_post_id: postId,
    viewer_profile_id: viewerId,
  });

  if (error) {
    throw new Error(error.message);
  }

  const snapshot = data?.[0] as PostActionSnapshot | undefined;
  if (!snapshot) {
    throw new Error("Post is not available.");
  }

  return {
    bookmarkedByViewer: snapshot.bookmarked_by_viewer,
    bookmarksCount: snapshot.bookmarks_count,
    commentsCount: snapshot.comments_count,
    impressionsCount: snapshot.impressions_count,
    likedByViewer: snapshot.liked_by_viewer,
    likesCount: snapshot.likes_count,
    sharesCount: snapshot.shares_count,
    videoWatchSecondsTotal: snapshot.video_watch_seconds_total,
    videoWatchSessionsCount: snapshot.video_watch_sessions_count,
  };
}

function formText(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" ? value.trim() : "";
}

function moderationStatusFor(settings: Awaited<ReturnType<typeof getPlatformSettings>>) {
  return settings.post_approval_required ? "pending" : "published";
}

async function deletePostWithChildren(postId: string, supabase: ReturnType<typeof createAdminClient> | Awaited<ReturnType<typeof createClient>>) {
  const childDeletes = await Promise.all([
    supabase.from("post_comments").delete().eq("post_id", postId),
    supabase.from("post_bookmarks").delete().eq("post_id", postId),
    supabase.from("post_likes").delete().eq("post_id", postId),
  ]);
  const childDeleteError = childDeletes.find((result) => result.error)?.error;
  if (childDeleteError) throw new Error(childDeleteError.message);

  const { error } = await supabase.from("posts").delete().eq("id", postId);
  if (error) throw new Error(error.message);
}

export async function updateOwnPostAction(formData: FormData) {
  const userId = await requireUserId();
  await assertRateLimit(`post:update:${userId}`, 30, 10 * 60 * 1000);
  const postId = formText(formData, "postId");
  const caption = formText(formData, "caption").slice(0, 600);

  if (!uuidPattern.test(postId)) redirect("/profile?error=invalid_post");
  if (!caption) redirect("/profile?error=missing_caption");

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data: post, error: readError } = await supabase
    .from("posts")
    .select("id, author_id, status")
    .eq("id", postId)
    .eq("author_id", userId)
    .maybeSingle();

  if (readError || !post) redirect("/profile?error=missing_post");

  const settings = await getPlatformSettings().catch(() => redirect("/profile?error=settings_unavailable"));
  const status = post.status === "published" && settings.post_approval_required ? "pending" : post.status === "rejected" ? moderationStatusFor(settings) : post.status;
  const { error } = await supabase.from("posts").update({ caption, status }).eq("id", postId).eq("author_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath("/feed");
  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
  revalidatePath(`/posts/${postId}`);
  await writeAuditLog({
    action: "post.updated",
    actorId: userId,
    entityId: postId,
    entityType: "post",
    metadata: { status },
  });
  redirect(`/profile?updated=${status === "published" ? "post_updated" : "post_submitted"}`);
}

export async function resubmitOwnPostAction(formData: FormData) {
  const userId = await requireUserId();
  await assertRateLimit(`post:resubmit:${userId}`, 20, 10 * 60 * 1000);
  const postId = formText(formData, "postId");

  if (!uuidPattern.test(postId)) redirect("/profile?error=invalid_post");

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data: post, error: readError } = await supabase
    .from("posts")
    .select("id, author_id, status")
    .eq("id", postId)
    .eq("author_id", userId)
    .maybeSingle();

  if (readError || !post) redirect("/profile?error=missing_post");
  if (post.status !== "rejected") redirect("/profile?error=invalid_transition");

  const settings = await getPlatformSettings().catch(() => redirect("/profile?error=settings_unavailable"));
  const status = moderationStatusFor(settings);
  const { error } = await supabase.from("posts").update({ status }).eq("id", postId).eq("author_id", userId);
  if (error) throw new Error(error.message);

  revalidatePath("/profile");
  revalidatePath("/feed");
  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
  await writeAuditLog({
    action: "post.resubmitted",
    actorId: userId,
    entityId: postId,
    entityType: "post",
    metadata: { status },
  });
  redirect(`/profile?updated=${status === "published" ? "post_published" : "post_submitted"}`);
}

export async function deleteOwnPostAction(formData: FormData) {
  const userId = await requireUserId();
  await assertRateLimit(`post:delete:${userId}`, 20, 10 * 60 * 1000);
  const postId = formText(formData, "postId");

  if (!uuidPattern.test(postId)) redirect("/profile?error=invalid_post");

  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { data: post, error: readError } = await supabase
    .from("posts")
    .select("id, author_id, media_url, media_urls, audio_url")
    .eq("id", postId)
    .eq("author_id", userId)
    .maybeSingle();

  if (readError || !post) redirect("/profile?error=missing_post");

  await deletePostWithChildren(postId, supabase);
  await removePostMediaFiles(postMediaUrls(post.media_url, post.media_urls, post.audio_url));

  revalidatePath("/profile");
  revalidatePath("/feed");
  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
  revalidatePath(`/posts/${postId}`);
  await writeAuditLog({
    action: "post.deleted",
    actorId: userId,
    entityId: postId,
    entityType: "post",
  });
  redirect("/profile?updated=post_deleted");
}

export async function toggleLikeAction(postId: string) {
  const userId = await requireEligibleUserId();
  await assertRateLimit(`post:like:${userId}`, 120, 10 * 60 * 1000);
  await requirePublishedPost(postId);
  await incrementPublishedPostCounter(postId, userId, "impressions_count");
  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("profile_id", userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    const { error } = await supabase.from("post_likes").delete().eq("id", existing.id);
    if (error) {
      throw new Error(error.message);
    }
    revalidatePath("/feed");
    revalidatePath(`/posts/${postId}`);
    const snapshot = await getPostActionSnapshot(postId, userId);
    return { active: false, snapshot };
  }

  const { data: inserted, error } = await supabase
    .from("post_likes")
    .insert({ post_id: postId, profile_id: userId })
    .select("id")
    .maybeSingle();

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }

  if (inserted) {
    await writeAuditLog({ action: "post.like", actorId: userId, entityId: postId, entityType: "post" });
  }

  const snapshot = await getPostActionSnapshot(postId, userId);
  revalidatePath("/feed");
  revalidatePath(`/posts/${postId}`);
  return { active: snapshot.likedByViewer, snapshot };
}

export async function toggleBookmarkAction(postId: string) {
  const userId = await requireEligibleUserId();
  await assertRateLimit(`post:bookmark:${userId}`, 120, 10 * 60 * 1000);
  await requirePublishedPost(postId);
  await incrementPublishedPostCounter(postId, userId, "impressions_count");
  const supabase = await createClient();
  const { data: existing, error: existingError } = await supabase
    .from("post_bookmarks")
    .select("id")
    .eq("post_id", postId)
    .eq("profile_id", userId)
    .maybeSingle();

  if (existingError) {
    throw new Error(existingError.message);
  }

  if (existing) {
    const { error } = await supabase.from("post_bookmarks").delete().eq("id", existing.id);
    if (error) {
      throw new Error(error.message);
    }
    revalidatePath("/feed");
    revalidatePath(`/posts/${postId}`);
    const snapshot = await getPostActionSnapshot(postId, userId);
    return { active: false, snapshot };
  }

  const { data: inserted, error } = await supabase
    .from("post_bookmarks")
    .insert({ post_id: postId, profile_id: userId })
    .select("id")
    .maybeSingle();

  if (error && error.code !== "23505") {
    throw new Error(error.message);
  }

  if (inserted) {
    await writeAuditLog({ action: "post.bookmark", actorId: userId, entityId: postId, entityType: "post" });
  }

  const snapshot = await getPostActionSnapshot(postId, userId);
  revalidatePath("/feed");
  revalidatePath(`/posts/${postId}`);
  return { active: snapshot.bookmarkedByViewer, snapshot };
}

export async function addCommentAction(postId: string, body: string) {
  const userId = await requireEligibleUserId();
  await assertRateLimit(`post:comment:${userId}`, 30, 10 * 60 * 1000);
  await requirePublishedPost(postId);
  await incrementPublishedPostCounter(postId, userId, "impressions_count");
  const trimmedBody = body.trim();

  if (trimmedBody.length < 1 || trimmedBody.length > 500) {
    throw new Error("Comment must be between 1 and 500 characters.");
  }

  const supabase = await createClient();
  const { data: comment, error } = await supabase
    .from("post_comments")
    .insert({ body: trimmedBody, post_id: postId, profile_id: userId })
    .select("id")
    .maybeSingle();

  if (error) {
    throw new Error(error.message);
  }

  await writeAuditLog({
    action: "post.comment",
    actorId: userId,
    entityId: postId,
    entityType: "post",
    metadata: { commentId: comment?.id },
  });

  revalidatePath("/feed");
  revalidatePath(`/posts/${postId}`);
  const snapshot = await getPostActionSnapshot(postId, userId);
  return {
    comment: {
      author: "You",
      body: trimmedBody,
      id: comment?.id ?? `${postId}-${Date.now()}`,
    },
    id: comment?.id,
    snapshot,
  };
}

export async function recordFeedImpressionAction(postId: string) {
  const userId = await requireEligibleUserId();
  await assertRateLimit(`post:impression:${userId}`, 240, 10 * 60 * 1000);
  if (!uuidPattern.test(postId)) return { recorded: false };
  await incrementPublishedPostCounter(postId, userId, "impressions_count");
  return { recorded: true };
}

export async function recordShareAction(postId: string) {
  const userId = await requireEligibleUserId();
  await assertRateLimit(`post:share:${userId}`, 80, 10 * 60 * 1000);
  if (!uuidPattern.test(postId)) return { recorded: false };
  await incrementPublishedPostCounter(postId, userId, "impressions_count");
  await incrementPublishedPostCounter(postId, userId, "shares_count");
  revalidatePath(`/posts/${postId}`);
  const snapshot = await getPostActionSnapshot(postId, userId);
  return { recorded: true, snapshot };
}

export async function recordVideoWatchAction(postId: string, seconds: number) {
  const userId = await requireEligibleUserId();
  await assertRateLimit(`post:video-watch:${userId}`, 120, 10 * 60 * 1000);
  if (!uuidPattern.test(postId)) return { recorded: false };
  const safeSeconds = Math.min(60 * 60, Math.max(2, Math.floor(seconds)));
  await incrementPublishedPostCounter(postId, userId, "impressions_count");
  await incrementPublishedPostCounter(postId, userId, "video_watch_seconds_total", safeSeconds);
  await incrementPublishedPostCounter(postId, userId, "video_watch_sessions_count");
  revalidatePath(`/posts/${postId}`);
  return { recorded: true };
}
