"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";

async function getSupabaseClient() {
  return hasSupabaseAdminKey() ? createAdminClient() : await createClient();
}

function fileValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

export async function createSponsoredTask(formData: FormData) {
  const admin = await requireAdmin();

  const provider = formData.get("provider") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const task_url = formData.get("task_url") as string;
  let media_url = formData.get("media_url") as string;
  const reward_credits = parseInt(formData.get("reward_credits") as string, 10);
  const limit_per_user = parseInt(formData.get("limit_per_user") as string, 10);

  if (!title || !provider || isNaN(reward_credits)) {
    throw new Error("Missing required fields");
  }

  const supabase = await getSupabaseClient();

  const mediaFile = fileValue(formData, "mediaFile");
  if (mediaFile) {
    if (!mediaFile.type.startsWith("image/") && !mediaFile.type.startsWith("video/")) {
      throw new Error("Invalid file type. Only image or video files are allowed.");
    }
    if (mediaFile.size > 50 * 1024 * 1024) {
      throw new Error("File size is too large. Maximum size is 50MB.");
    }
    const extension = mediaFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const mediaPath = `${admin.id}/${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from("task-media").upload(mediaPath, mediaFile, {
      cacheControl: "31536000",
      contentType: mediaFile.type,
      upsert: false,
    });

    if (upload.error) {
      throw new Error("Failed to upload media: " + upload.error.message);
    }

    const { data: publicMedia } = supabase.storage.from("task-media").getPublicUrl(mediaPath);
    media_url = publicMedia.publicUrl;
  }

  const { error } = await supabase.from("sponsored_tasks").insert({
    provider,
    title,
    description: description || null,
    task_url: task_url || null,
    media_url: media_url || null,
    reward_credits,
    limit_per_user: isNaN(limit_per_user) ? 1 : limit_per_user,
    status: "draft",
  });

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/tasks");
  redirect("/admin/tasks");
}

export async function updateSponsoredTask(formData: FormData) {
  const admin = await requireAdmin();
  const taskId = formData.get("taskId") as string;

  if (!taskId) {
    throw new Error("Missing task ID");
  }

  const provider = formData.get("provider") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const task_url = formData.get("task_url") as string;
  let media_url = formData.get("media_url") as string;
  const reward_credits = parseInt(formData.get("reward_credits") as string, 10);
  const limit_per_user = parseInt(formData.get("limit_per_user") as string, 10);

  if (!title || !provider || isNaN(reward_credits)) {
    throw new Error("Missing required fields");
  }

  const supabase = await getSupabaseClient();

  const mediaFile = fileValue(formData, "mediaFile");
  if (mediaFile) {
    if (!mediaFile.type.startsWith("image/") && !mediaFile.type.startsWith("video/")) {
      throw new Error("Invalid file type. Only image or video files are allowed.");
    }
    if (mediaFile.size > 50 * 1024 * 1024) {
      throw new Error("File size is too large. Maximum size is 50MB.");
    }
    const extension = mediaFile.name.split(".").pop()?.toLowerCase().replace(/[^a-z0-9]/g, "") || "png";
    const mediaPath = `${admin.id}/${crypto.randomUUID()}.${extension}`;
    const upload = await supabase.storage.from("task-media").upload(mediaPath, mediaFile, {
      cacheControl: "31536000",
      contentType: mediaFile.type,
      upsert: false,
    });

    if (upload.error) {
      throw new Error("Failed to upload media: " + upload.error.message);
    }

    const { data: publicMedia } = supabase.storage.from("task-media").getPublicUrl(mediaPath);
    media_url = publicMedia.publicUrl;
  }

  const { error } = await supabase
    .from("sponsored_tasks")
    .update({
      provider,
      title,
      description: description || null,
      task_url: task_url || null,
      media_url: media_url || null,
      reward_credits,
      limit_per_user: isNaN(limit_per_user) ? 1 : limit_per_user,
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/tasks");
  revalidatePath("/tasks");
}

export async function toggleSponsoredTaskStatus(formData: FormData) {
  await requireAdmin();
  const taskId = formData.get("taskId") as string;
  const currentStatus = formData.get("currentStatus") as string;

  if (!taskId) {
    throw new Error("Missing task ID");
  }

  const nextStatus = currentStatus === "active" ? "paused" : "active";

  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from("sponsored_tasks")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/tasks");
  revalidatePath("/tasks");
}

export async function deleteSponsoredTask(formData: FormData) {
  await requireAdmin();
  const taskId = formData.get("taskId") as string;

  if (!taskId) {
    throw new Error("Missing task ID");
  }

  const supabase = await getSupabaseClient();
  
  // First delete any sessions referencing this task to avoid foreign key violations
  await supabase.from("task_sessions").delete().eq("task_id", taskId);

  const { error } = await supabase
    .from("sponsored_tasks")
    .delete()
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/tasks");
  revalidatePath("/tasks");
}
