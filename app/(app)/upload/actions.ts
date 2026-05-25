"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { getPlatformSettings } from "@/lib/platform-settings";
import { assertRateLimit } from "@/lib/rate-limit";
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

function assertAcceptedFile(file: File, target: "feed" | "upload", category: "audio" | "image" | "video") {
  const type = file.type.toLowerCase();
  const name = file.name.toLowerCase();

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
  const supabase = await createClient();
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

  assertRateLimit(`post:create:${user.id}`, 20, 60 * 60 * 1000);

  const type = requiredString(formData, "postType") as UploadPostType;
  const caption = requiredString(formData, "caption").slice(0, 600);

  if (!postTypes.has(type)) {
    redirectWithError(target, "invalid_post_type");
  }

  const mediaFile = assertFile(optionalFile(formData, "mediaFile"), target, "media_required");
  const audioFile = optionalFile(formData, "audioFile");
  const mediaBucket = type === "video_text" ? "post-videos" : "post-images";
  assertAcceptedFile(mediaFile, target, type === "video_text" ? "video" : "image");
  if (audioFile) {
    assertAcceptedFile(audioFile, target, "audio");
  }
  const mediaUrl = await uploadPublicFile({ bucket: mediaBucket, file: mediaFile, target, userId: user.id });
  const audioUrl = type === "image_audio"
    ? await uploadPublicFile({ bucket: "post-audio", file: assertFile(audioFile, target, "audio_required"), target, userId: user.id })
    : null;
  const settings = await getPlatformSettings();
  const status = settings.post_approval_required ? "pending" : "published";
  const { data: post, error: postError } = await supabase
    .from("posts")
    .insert({
      audio_url: audioUrl,
      author_id: user.id,
      caption,
      media_url: mediaUrl,
      status,
      type,
    })
    .select("id")
    .maybeSingle();

  if (postError) {
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
  if (post?.id) {
    revalidatePath(`/posts/${post.id}`);
  }

  const updated = status === "published" ? "post_published" : "post_submitted";
  redirect(target === "feed" ? `/feed?post=${post?.id ?? ""}&updated=${updated}` : `/upload?updated=${updated}`);
}
