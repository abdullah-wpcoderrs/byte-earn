"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";
import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";
import { writeAuditLog } from "@/lib/audit";

async function getSupabaseClient() {
  return hasSupabaseAdminKey() ? createAdminClient() : await createClient();
}

function fileValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return value instanceof File && value.size > 0 ? value : null;
}

function textValue(formData: FormData, key: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.trim() ? value.trim() : null;
}

function providerMetadata(formData: FormData, provider: string) {
  return {
    provider_placement_id: textValue(formData, "provider_placement_id"),
    provider_domain_id: textValue(formData, "provider_domain_id"),
    provider_tracking_param: textValue(formData, "provider_tracking_param") ?? (provider === "adsterra" ? "psid" : "subid"),
    provider_reconciliation_mode: textValue(formData, "provider_reconciliation_mode") ?? (provider === "adsterra" ? "api_reconciliation" : "postback"),
    provider_status: textValue(formData, "provider_status") ?? (provider === "adsterra" ? "needs_api_reconciliation" : "not_configured"),
  };
}

function taskTypeForProvider(formData: FormData, provider: string) {
  const taskType = textValue(formData, "task_type");
  if (provider === "internal") return taskType ?? "manual_review";
  if (provider === "adsterra") return "smartlink";
  if (provider === "cpagrip") return "offer";
  return "manual_review";
}

type SponsoredTaskActivation = {
  provider: string;
  task_type?: string | null;
  task_url?: string | null;
  media_url?: string | null;
  provider_placement_id?: string | null;
  provider_domain_id?: string | null;
  provider_tracking_param?: string | null;
  reward_credits: number;
  limit_per_user: number;
};

function assertActivationReady(task: SponsoredTaskActivation) {
  if (task.reward_credits < 0) throw new Error("Reward credits cannot be negative");
  if (!task.limit_per_user || task.limit_per_user < 1) throw new Error("Daily cap must be at least 1");

  if (task.provider === "adsterra") {
    if (!task.task_url) throw new Error("Adsterra tasks require a SmartLink URL");
    if (!task.provider_placement_id) throw new Error("Adsterra tasks require a placement ID");
    if (!task.provider_domain_id) throw new Error("Adsterra tasks require a domain ID");
    if (task.provider_tracking_param !== "psid") throw new Error("Adsterra tasks must use psid tracking");
  }

  if (task.provider === "cpagrip") {
    if (!task.task_url) throw new Error("CPAGrip tasks require an offer URL");
    if (!task.provider_placement_id) throw new Error("CPAGrip tasks require an offer or campaign ID");
    if (!task.provider_tracking_param) throw new Error("CPAGrip tasks require a tracking parameter");
  }

  if (task.provider === "internal") {
    if (!task.task_type) throw new Error("Internal tasks require a task type");
    if (task.task_type === "visit_url" && !task.task_url) {
      throw new Error("Visit tasks require a destination URL");
    }
    if (task.task_type === "watch_media" && !task.media_url) throw new Error("Watch media tasks require a media file or media URL");
  }
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
  const global_cap = parseInt(formData.get("global_cap") as string, 10);

  if (!title || !provider || isNaN(reward_credits)) {
    throw new Error("Missing required fields");
  }

  if (!["internal", "adsterra", "cpagrip"].includes(provider)) {
    throw new Error("Invalid provider");
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

  const { data: task, error } = await supabase.from("sponsored_tasks").insert({
    provider,
    task_type: taskTypeForProvider(formData, provider),
    title,
    description: description || null,
    task_url: task_url || null,
    media_url: media_url || null,
    reward_credits,
    limit_per_user: isNaN(limit_per_user) ? 1 : limit_per_user,
    global_cap: isNaN(global_cap) ? null : global_cap,
    ...providerMetadata(formData, provider),
    status: "draft",
  }).select("id").single();

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/tasks");
  await writeAuditLog({
    action: "admin.sponsored_task.created",
    actorId: admin.id,
    actorType: "admin",
    entityId: task?.id ?? null,
    entityType: "sponsored_task",
    metadata: { provider },
  });
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
  const global_cap = parseInt(formData.get("global_cap") as string, 10);

  if (!title || !provider || isNaN(reward_credits)) {
    throw new Error("Missing required fields");
  }

  if (!["internal", "adsterra", "cpagrip"].includes(provider)) {
    throw new Error("Invalid provider");
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
      task_type: taskTypeForProvider(formData, provider),
      title,
      description: description || null,
      task_url: task_url || null,
      media_url: media_url || null,
      reward_credits,
      limit_per_user: isNaN(limit_per_user) ? 1 : limit_per_user,
      global_cap: isNaN(global_cap) ? null : global_cap,
      ...providerMetadata(formData, provider),
      updated_at: new Date().toISOString(),
    })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/tasks");
  revalidatePath("/tasks");
  await writeAuditLog({
    action: "admin.sponsored_task.updated",
    actorId: admin.id,
    actorType: "admin",
    entityId: taskId,
    entityType: "sponsored_task",
    metadata: { provider },
  });
}

export async function toggleSponsoredTaskStatus(formData: FormData) {
  const admin = await requireAdmin();
  const taskId = formData.get("taskId") as string;
  const currentStatus = formData.get("currentStatus") as string;

  if (!taskId) {
    throw new Error("Missing task ID");
  }

  const nextStatus = currentStatus === "active" ? "paused" : "active";

  const supabase = await getSupabaseClient();
  if (nextStatus === "active") {
    const { data: task, error: taskError } = await supabase
      .from("sponsored_tasks")
      .select("*")
      .eq("id", taskId)
      .single();

    if (taskError || !task) {
      throw new Error(taskError?.message ?? "Task not found");
    }

    assertActivationReady(task);
  }

  const { error } = await supabase
    .from("sponsored_tasks")
    .update({ status: nextStatus, updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/tasks");
  revalidatePath("/tasks");
  await writeAuditLog({
    action: nextStatus === "active" ? "admin.sponsored_task.activated" : "admin.sponsored_task.paused",
    actorId: admin.id,
    actorType: "admin",
    entityId: taskId,
    entityType: "sponsored_task",
    metadata: { previousStatus: currentStatus, nextStatus },
  });
}

export async function deleteSponsoredTask(formData: FormData) {
  const admin = await requireAdmin();
  const taskId = formData.get("taskId") as string;

  if (!taskId) {
    throw new Error("Missing task ID");
  }

  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from("sponsored_tasks")
    .update({ status: "archived", updated_at: new Date().toISOString() })
    .eq("id", taskId);

  if (error) {
    throw new Error(error.message);
  }

  revalidatePath("/admin/tasks");
  revalidatePath("/tasks");
  await writeAuditLog({
    action: "admin.sponsored_task.archived",
    actorId: admin.id,
    actorType: "admin",
    entityId: taskId,
    entityType: "sponsored_task",
  });
}

export async function approveSponsoredTaskSession(formData: FormData) {
  const admin = await requireAdmin();
  const sessionId = formData.get("sessionId") as string;

  if (!sessionId) throw new Error("Missing session ID");

  const supabase = await getSupabaseClient();
  await supabase
    .from("task_sessions")
    .update({ status: "pending", updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .eq("status", "suspicious");

  const { data, error } = await supabase.rpc("complete_sponsored_task_session", {
    session_id_param: sessionId,
    provider_event_id_param: `admin-approved:${sessionId}`,
    raw_payload_param: JSON.stringify({ approvedBy: admin.id }),
  });

  if (error) throw new Error(error.message);

  await writeAuditLog({
    action: "admin.sponsored_task_session.approved",
    actorId: admin.id,
    actorType: "admin",
    entityId: sessionId,
    entityType: "task_session",
    metadata: { result: data?.[0] ?? null },
  });

  revalidatePath("/admin/tasks");
  revalidatePath("/tasks");
}

export async function rejectSponsoredTaskSession(formData: FormData) {
  const admin = await requireAdmin();
  const sessionId = formData.get("sessionId") as string;

  if (!sessionId) throw new Error("Missing session ID");

  const supabase = await getSupabaseClient();
  const { error } = await supabase
    .from("task_sessions")
    .update({ status: "rejected", updated_at: new Date().toISOString() })
    .eq("id", sessionId)
    .in("status", ["pending", "suspicious"]);

  if (error) throw new Error(error.message);

  await supabase
    .from("sponsored_task_provider_events")
    .update({ status: "rejected", processed_at: new Date().toISOString() })
    .eq("session_id", sessionId);

  await writeAuditLog({
    action: "admin.sponsored_task_session.rejected",
    actorId: admin.id,
    actorType: "admin",
    entityId: sessionId,
    entityType: "task_session",
  });

  revalidatePath("/admin/tasks");
}
