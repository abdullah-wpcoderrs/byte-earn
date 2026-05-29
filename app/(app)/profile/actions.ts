"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { assertRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

const usernamePattern = /^[a-z0-9_]{3,24}$/;

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function normalizeUsername(value: string) {
  return value.trim().toLowerCase();
}

export async function updateOwnProfileAction(formData: FormData) {
  const displayName = readRequiredString(formData, "displayName").slice(0, 80);
  const username = normalizeUsername(readRequiredString(formData, "username"));
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  await assertRateLimit(`profile:update:${user.id}`, 20, 10 * 60 * 1000);

  if (displayName.length < 2) {
    redirect("/profile?error=invalid_name");
  }

  if (!usernamePattern.test(username)) {
    redirect("/profile?error=invalid_username");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      updated_at: new Date().toISOString(),
      username,
    })
    .eq("id", user.id);

  if (error?.code === "23505") {
    redirect("/profile?error=username_taken");
  }

  if (error) {
    redirect(`/profile?error=${encodeURIComponent(error.message)}`);
  }

  revalidatePath("/profile");
  revalidatePath("/feed");
  revalidatePath(`/u/${username}`);
  redirect("/profile?updated=profile_saved");
}
