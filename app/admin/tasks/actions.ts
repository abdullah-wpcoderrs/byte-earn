"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin";

export async function createSponsoredTask(formData: FormData) {
  const admin = await requireAdmin();

  const provider = formData.get("provider") as string;
  const title = formData.get("title") as string;
  const description = formData.get("description") as string;
  const task_url = formData.get("task_url") as string;
  const media_url = formData.get("media_url") as string;
  const reward_credits = parseInt(formData.get("reward_credits") as string, 10);
  const limit_per_user = parseInt(formData.get("limit_per_user") as string, 10);

  if (!title || !provider || isNaN(reward_credits)) {
    throw new Error("Missing required fields");
  }

  const supabase = await createClient();
  
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

export async function toggleSponsoredTaskStatus(formData: FormData) {
  await requireAdmin();
  const taskId = formData.get("taskId") as string;
  const currentStatus = formData.get("currentStatus") as string;

  if (!taskId) {
    throw new Error("Missing task ID");
  }

  const nextStatus = currentStatus === "active" ? "paused" : "active";

  const supabase = await createClient();
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

  const supabase = await createClient();
  
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
