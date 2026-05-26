"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { assertRateLimit } from "@/lib/rate-limit";
import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

const uuidPattern = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i;

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

async function requirePublishedPost(postId: string) {
  if (!uuidPattern.test(postId)) {
    throw new Error("Invalid post.");
  }

  const supabase = await createClient();
  const { data: post, error } = await supabase
    .from("posts")
    .select("id, status, likes_count, bookmarks_count, comments_count")
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

async function syncPostCount(
  postId: string,
  table: "post_bookmarks" | "post_comments" | "post_likes",
  column: "bookmarks_count" | "comments_count" | "likes_count",
) {
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const { count, error: countError } = await supabase
    .from(table)
    .select("id", { count: "exact", head: true })
    .eq("post_id", postId);

  if (countError) {
    throw new Error(countError.message);
  }

  const { error } = await supabase
    .from("posts")
    .update({ [column]: count ?? 0 })
    .eq("id", postId);

  if (error) {
    throw new Error(error.message);
  }
}

export async function toggleLikeAction(postId: string) {
  const userId = await requireUserId();
  assertRateLimit(`post:like:${userId}`, 120, 10 * 60 * 1000);
  const post = await requirePublishedPost(postId);
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
    await syncPostCount(postId, "post_likes", "likes_count");
    revalidatePath("/feed");
    revalidatePath(`/posts/${postId}`);
    return { active: false };
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
    await syncPostCount(postId, "post_likes", "likes_count");
    await writeAuditLog({ action: "post.like", actorId: userId, entityId: postId, entityType: "post" });
  }

  revalidatePath("/feed");
  revalidatePath(`/posts/${postId}`);
  return { active: true };
}

export async function toggleBookmarkAction(postId: string) {
  const userId = await requireUserId();
  assertRateLimit(`post:bookmark:${userId}`, 120, 10 * 60 * 1000);
  const post = await requirePublishedPost(postId);
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
    await syncPostCount(postId, "post_bookmarks", "bookmarks_count");
    revalidatePath("/feed");
    revalidatePath(`/posts/${postId}`);
    return { active: false };
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
    await syncPostCount(postId, "post_bookmarks", "bookmarks_count");
    await writeAuditLog({ action: "post.bookmark", actorId: userId, entityId: postId, entityType: "post" });
  }

  revalidatePath("/feed");
  revalidatePath(`/posts/${postId}`);
  return { active: true };
}

export async function addCommentAction(postId: string, body: string) {
  const userId = await requireUserId();
  assertRateLimit(`post:comment:${userId}`, 30, 10 * 60 * 1000);
  const post = await requirePublishedPost(postId);
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

  await syncPostCount(postId, "post_comments", "comments_count");
  await writeAuditLog({
    action: "post.comment",
    actorId: userId,
    entityId: postId,
    entityType: "post",
    metadata: { commentId: comment?.id },
  });

  revalidatePath("/feed");
  revalidatePath(`/posts/${postId}`);
  return { id: comment?.id };
}
