"use server";

import { redirect } from "next/navigation";
import { platformSettings, posts } from "@/db/schema";
import { writeAuditLog } from "@/lib/audit";
import { getDb } from "@/lib/db";
import { assertRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { desc } from "drizzle-orm";

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

function assertFile(file: File | null, message: string) {
  if (!file) {
    redirect(`/upload?error=${encodeURIComponent(message)}`);
  }
  return file;
}

function extensionFor(file: File) {
  const extension = file.name.split(".").pop()?.toLowerCase();
  return extension && /^[a-z0-9]+$/.test(extension) ? extension : "bin";
}

async function uploadPublicFile({
  bucket,
  file,
  userId,
}: {
  bucket: "post-audio" | "post-images" | "post-videos";
  file: File;
  userId: string;
}) {
  const supabase = await createClient();
  const path = `${userId}/${crypto.randomUUID()}.${extensionFor(file)}`;
  const { error } = await supabase.storage.from(bucket).upload(path, file, {
    contentType: file.type,
    upsert: false,
  });

  if (error) {
    redirect(`/upload?error=${encodeURIComponent(error.message)}`);
  }

  const { data } = supabase.storage.from(bucket).getPublicUrl(path);
  return data.publicUrl;
}

export async function createPostAction(formData: FormData) {
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
    redirect("/upload?error=invalid_post_type");
  }

  const mediaFile = assertFile(optionalFile(formData, "mediaFile"), "Media file is required.");
  const audioFile = optionalFile(formData, "audioFile");
  const mediaBucket = type === "video_text" ? "post-videos" : "post-images";
  const mediaUrl = await uploadPublicFile({ bucket: mediaBucket, file: mediaFile, userId: user.id });
  const audioUrl =
    type === "image_audio"
      ? await uploadPublicFile({ bucket: "post-audio", file: assertFile(audioFile, "Audio file is required for image plus MP3 posts."), userId: user.id })
      : null;
  const latestSettings = await getDb().query.platformSettings.findFirst({
    orderBy: desc(platformSettings.updatedAt),
  });
  const status = latestSettings?.postApprovalRequired === false ? "published" : "pending";
  const [post] = await getDb()
    .insert(posts)
    .values({
      audioUrl,
      authorId: user.id,
      caption,
      mediaUrl,
      status,
      type,
    })
    .returning({ id: posts.id });

  await writeAuditLog({
    action: "post.created",
    actorId: user.id,
    entityId: post?.id,
    entityType: "post",
    metadata: { status, type },
  });

  redirect(`/upload?updated=${status === "published" ? "post_published" : "post_submitted"}`);
}
