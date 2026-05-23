"use server";

import { and, eq, sql } from "drizzle-orm";
import { revalidatePath } from "next/cache";
import { postBookmarks, postComments, postLikes, posts } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";
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

  const post = await getDb().query.posts.findFirst({
    columns: { id: true, status: true },
    where: eq(posts.id, postId),
  });

  if (!post || post.status !== "published") {
    throw new Error("Post is not available.");
  }

  return post;
}

export async function toggleLikeAction(postId: string) {
  const userId = await requireUserId();
  assertRateLimit(`post:like:${userId}`, 120, 10 * 60 * 1000);
  await requirePublishedPost(postId);

  const db = getDb();
  const existing = await db.query.postLikes.findFirst({
    columns: { id: true },
    where: and(eq(postLikes.postId, postId), eq(postLikes.profileId, userId)),
  });

  if (existing) {
    await db.transaction(async (tx) => {
      await tx.delete(postLikes).where(eq(postLikes.id, existing.id));
      await tx
        .update(posts)
        .set({ likesCount: sql`greatest(${posts.likesCount} - 1, 0)` })
        .where(eq(posts.id, postId));
    });
    revalidatePath("/feed");
    revalidatePath(`/posts/${postId}`);
    return { active: false };
  }

  const [inserted] = await db.transaction(async (tx) => {
    const created = await tx
      .insert(postLikes)
      .values({ postId, profileId: userId })
      .onConflictDoNothing()
      .returning({ id: postLikes.id });
    if (created.length > 0) {
      await tx.update(posts).set({ likesCount: sql`${posts.likesCount} + 1` }).where(eq(posts.id, postId));
    }
    return created;
  });

  if (!inserted) {
    return { active: true };
  }

  await writeAuditLog({
    action: "post.like",
    actorId: userId,
    entityId: postId,
    entityType: "post",
  });

  revalidatePath("/feed");
  revalidatePath(`/posts/${postId}`);
  return { active: true };
}

export async function toggleBookmarkAction(postId: string) {
  const userId = await requireUserId();
  assertRateLimit(`post:bookmark:${userId}`, 120, 10 * 60 * 1000);
  await requirePublishedPost(postId);

  const db = getDb();
  const existing = await db.query.postBookmarks.findFirst({
    columns: { id: true },
    where: and(eq(postBookmarks.postId, postId), eq(postBookmarks.profileId, userId)),
  });

  if (existing) {
    await db.transaction(async (tx) => {
      await tx.delete(postBookmarks).where(eq(postBookmarks.id, existing.id));
      await tx
        .update(posts)
        .set({ bookmarksCount: sql`greatest(${posts.bookmarksCount} - 1, 0)` })
        .where(eq(posts.id, postId));
    });
    revalidatePath("/feed");
    revalidatePath(`/posts/${postId}`);
    return { active: false };
  }

  const [inserted] = await db.transaction(async (tx) => {
    const created = await tx
      .insert(postBookmarks)
      .values({ postId, profileId: userId })
      .onConflictDoNothing()
      .returning({ id: postBookmarks.id });
    if (created.length > 0) {
      await tx.update(posts).set({ bookmarksCount: sql`${posts.bookmarksCount} + 1` }).where(eq(posts.id, postId));
    }
    return created;
  });

  if (!inserted) {
    return { active: true };
  }

  await writeAuditLog({
    action: "post.bookmark",
    actorId: userId,
    entityId: postId,
    entityType: "post",
  });

  revalidatePath("/feed");
  revalidatePath(`/posts/${postId}`);
  return { active: true };
}

export async function addCommentAction(postId: string, body: string) {
  const userId = await requireUserId();
  assertRateLimit(`post:comment:${userId}`, 30, 10 * 60 * 1000);
  await requirePublishedPost(postId);

  const trimmedBody = body.trim();
  if (trimmedBody.length < 1 || trimmedBody.length > 500) {
    throw new Error("Comment must be between 1 and 500 characters.");
  }

  const db = getDb();
  const [comment] = await db.transaction(async (tx) => {
    const [created] = await tx
      .insert(postComments)
      .values({ body: trimmedBody, postId, profileId: userId })
      .returning({ id: postComments.id });
    await tx.update(posts).set({ commentsCount: sql`${posts.commentsCount} + 1` }).where(eq(posts.id, postId));
    return [created];
  });

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
