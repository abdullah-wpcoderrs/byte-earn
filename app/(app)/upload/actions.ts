"use server";

import { revalidatePath } from "next/cache";
import { writeAuditLog } from "@/lib/audit";
import { getPlatformSettings } from "@/lib/platform-settings";
import { assertRateLimit } from "@/lib/rate-limit";
import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export type PostType = "image_audio" | "image_text" | "video_text";

export type PostRecordInput = {
  audioUrl: string | null;
  caption: string;
  mediaUrls: string[];
  type: PostType;
};

export type PostRecordResult = {
  error?: string;
  ok: boolean;
  postId?: string;
  status?: "pending" | "published";
};

const postTypes = new Set<PostType>(["image_audio", "image_text", "video_text"]);
const MAX_CAPTION = 600;
const MAX_IMAGES = 8;
const ALLOWED_BUCKETS = new Set(["post-images", "post-videos", "post-audio"]);

function storagePublicPrefix() {
  return `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/`;
}

// Ensures a media URL points into this user's own storage folder so a user
// cannot attach another person's (or arbitrary) media to their own post.
function assertOwnMediaUrl(url: string, userId: string): boolean {
  const prefix = storagePublicPrefix();
  if (!url.startsWith(prefix)) {
    return false;
  }
  const rest = url.slice(prefix.length); // <bucket>/<userId>/<file>
  const [bucket, folder] = rest.split("/");
  if (!bucket || !ALLOWED_BUCKETS.has(bucket)) {
    return false;
  }
  return folder === userId;
}

export async function createPostRecord(input: PostRecordInput): Promise<PostRecordResult> {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return { ok: false, error: "auth_required" };
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return { ok: false, error: "profile_not_found" };
  }
  if (profile.status === "suspended") {
    return { ok: false, error: "account_suspended" };
  }
  if (profile.status === "pending_payment") {
    return { ok: false, error: "pending_payment" };
  }
  if (profile.status !== "active") {
    return { ok: false, error: "onboarding_required" };
  }

  try {
    await assertRateLimit(`post:create:${user.id}`, 20, 60 * 60 * 1000);
  } catch {
    return { ok: false, error: "rate_limited" };
  }

  const type = input.type;
  if (!postTypes.has(type)) {
    return { ok: false, error: "invalid_post_type" };
  }

  const caption = (input.caption ?? "").trim();
  if (caption.length === 0) {
    return { ok: false, error: "caption_required" };
  }
  if (caption.length > MAX_CAPTION) {
    return { ok: false, error: "caption_too_long" };
  }

  const mediaUrls = input.mediaUrls.map((url) => url.trim()).filter(Boolean);
  if (mediaUrls.length === 0) {
    return { ok: false, error: "media_required" };
  }
  if (type === "video_text" && mediaUrls.length > 1) {
    return { ok: false, error: "too_many_media_files" };
  }
  if (type !== "video_text" && mediaUrls.length > MAX_IMAGES) {
    return { ok: false, error: "too_many_media_files" };
  }
  if (!mediaUrls.every((url) => assertOwnMediaUrl(url, user.id))) {
    return { ok: false, error: "invalid_media_file" };
  }

  const audioUrl = type === "image_audio" ? (input.audioUrl ?? "").trim() : null;
  if (type === "image_audio") {
    if (!audioUrl || !assertOwnMediaUrl(audioUrl, user.id)) {
      return { ok: false, error: "audio_required" };
    }
  }

  const settings = await getPlatformSettings().catch(() => null);
  if (!settings) {
    return { ok: false, error: "settings_unavailable" };
  }
  const status: "pending" | "published" = settings.post_approval_required ? "pending" : "published";

  const postClient = hasSupabaseAdminKey() ? createAdminClient() : supabase;
  const { data: post, error: postError } = await postClient
    .from("posts")
    .insert({
      audio_url: audioUrl,
      author_id: user.id,
      caption,
      media_url: mediaUrls[0],
      media_urls: JSON.stringify(mediaUrls),
      status,
      type,
    })
    .select("id")
    .maybeSingle();

  if (postError || !post) {
    await writeAuditLog({
      action: "post.create_failed",
      actorId: user.id,
      entityType: "post",
      metadata: { message: postError?.message ?? "insert_failed", status, type },
    }).catch(() => undefined);
    return { ok: false, error: "insert_failed" };
  }

  await writeAuditLog({
    action: "post.created",
    actorId: user.id,
    entityId: post.id,
    entityType: "post",
    metadata: { status, type },
  }).catch(() => undefined);

  revalidatePath("/feed");
  revalidatePath("/profile");
  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
  revalidatePath(`/posts/${post.id}`);

  return { ok: true, postId: post.id, status };
}
