"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { removePostMediaFiles } from "@/lib/post-media";
import { getPlatformSettings } from "@/lib/platform-settings";
import { assertRateLimit } from "@/lib/rate-limit";
import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type UploadPostType = "image_audio" | "image_text" | "video_text";

const postTypes = new Set(["image_audio", "image_text", "video_text"]);

function requiredString(formData: FormData, key: string) {
  const value = formData.get(key);
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }
  return value.trim();
}

function optionalFile(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function optionalFiles(formData: FormData, key: string) {
  return formData.getAll(key).filter((value): value is File => value instanceof File && value.size > 0);
}

function uploadTarget(formData: FormData) {
  return formData.get("returnTo") === "feed" ? "feed" : "upload";
}

function targetUrl(target: "feed" | "upload", params: Record<string, string>) {
  const searchParams = new URLSearchParams(params);
  if (target === "feed") {
    searchParams.set("upload", "1");
  }
  return `/${target}?${searchParams.toString()}`;
}

function redirectWithError(target: "feed" | "upload", message: string): never {
  redirect(targetUrl(target, { error: message }));
}

function assertFile(file: File | null, target: "feed" | "upload", message: string): File {
  if (!file) {
    redirectWithError(target, message);
  }
  return file;
}

function assertAcceptedFile(file: File, target: "feed" | "upload", category: "audio" | "image" | "video", maxUploadSizeBytes: number) {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

  if (file.size > maxUploadSizeBytes) {
    redirectWithError(target, "file_too_large");
  }

  if (category === "image" && !type.startsWith("image/")) {
    redirectWithError(target, "invalid_media_file");
  }

  if (category === "video" && !type.startsWith("video/")) {
    redirectWithError(target, "invalid_media_file");
  }

  if (category === "audio" && type !== "audio/mpeg" && !name.endsWith(".mp3")) {
    redirectWithError(target, "invalid_audio_file");
  }
}

function extensionFor(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : "bin";
}

async function uploadPublicFile({
  bucket,
  file,
  target,
  userId,
}: {
  bucket: "post-audio" | "post-images" | "post-videos";
  file: File;
  target: "feed" | "upload";
  userId: string;
}) {
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    redirectWithError(target, error.message);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function createPostAction(formData: FormData) {
  const target = uploadTarget(formData);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/?auth=required");
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/?auth_error=Profile%20not%20found.");
  }

  if (profile.status === "suspended") {
    redirect(`/?auth_error=${encodeURIComponent("Account suspended.")}`);
  }

  if (profile.status === "pending_payment") {
    redirect("/activate");
  }

  if (profile.status !== "active") {
    redirect("/onboarding");
  }

  await assertRateLimit(`post:create:${user.id}`, 20, 60 * 60 * 1000);

  const type = requiredString(formData, "postType") as UploadPostType;
  const rawCaption = requiredString(formData, "caption");

  if (rawCaption.length > 600) {
    redirectWithError(target, "caption_too_long");
  }

  const caption = rawCaption;

  if (!postTypes.has(type)) {
    redirectWithError(target, "invalid_post_type");
  }

  const settings = await getPlatformSettings().catch(() => redirectWithError(target, "settings_unavailable"));
  const maxUploadSizeMb = Math.max(1, settings.max_upload_size_mb ?? 50);
  const maxUploadSizeBytes = maxUploadSizeMb * 1024 * 1024;
  const mediaFiles = optionalFiles(formData, "mediaFile");

  if (type === "image_text" && mediaFiles.length > 8) {
    redirectWithError(target, "too_many_media_files");
  }

  const mediaFile = assertFile(mediaFiles[0] ?? null, target, "media_required");
  const audioFile = optionalFile(formData, "audioFile");
  const mediaBucket = type === "video_text" ? "post-videos" : "post-images";
  const acceptedMediaFiles = type === "image_text" ? mediaFiles : [mediaFile];
  acceptedMediaFiles.forEach((file) => assertAcceptedFile(file, target, type === "video_text" ? "video" : "image", maxUploadSizeBytes));
  if (audioFile) {
    assertAcceptedFile(audioFile, target, "audio", maxUploadSizeBytes);
  }
  const mediaUrls = await Promise.all(acceptedMediaFiles.map((file) => uploadPublicFile({ bucket: mediaBucket, file, target, userId: user.id })));
  const mediaUrl = mediaUrls[0];
  const audioUrl = type === "image_audio"
    ? await uploadPublicFile({ bucket: "post-audio", file: assertFile(audioFile, target, "audio_required"), target, userId: user.id })
    : null;
  const status = settings.post_approval_required ? "pending" : "published";
  const postClient = hasSupabaseAdminKey() ? createAdminClient() : supabase;
  const { data: post, error: postError } = await postClient
    .from("posts")
    .insert({
      audio_url: audioUrl,
      author_id: user.id,
      caption,
      media_url: mediaUrl,
      media_urls: JSON.stringify(mediaUrls),
      status,
      type,
    })
    .select("id")
    .maybeSingle();

  if (postError) {
    await removePostMediaFiles([...mediaUrls, audioUrl]);
    await writeAuditLog({
      action: "post.create_failed",
      actorId: user.id,
      entityType: "post",
      metadata: { message: postError.message, status, type },
    }).catch(() => undefined);
    redirectWithError(target, postError.message);
  }

  await writeAuditLog({
    action: "post.created",
    actorId: user.id,
    entityId: post?.id,
    entityType: "post",
    metadata: { status, type },
  });

  revalidatePath("/feed");
  revalidatePath("/profile");
  revalidatePath("/admin");
  revalidatePath("/admin/moderation");
  if (post?.id) {
    revalidatePath(`/posts/${post.id}`);
  }

  const updated = status === "published" ? "post_published" : "post_submitted";
  if (target === "feed" && status === "published" && post?.id) {
    redirect(`/posts/${post.id}?updated=${updated}`);
  }

  redirect(target === "feed" ? `/feed?post=${post?.id ?? ""}&updated=${updated}` : `/upload?updated=${updated}`);
}
