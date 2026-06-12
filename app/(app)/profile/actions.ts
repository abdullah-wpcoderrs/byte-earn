"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { validatePayoutDetails, validateUsername } from "@/lib/profile-validation";
import { assertRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

export async function updateOwnProfileAction(formData: FormData) {
  const displayName = readRequiredString(formData, "displayName").slice(0, 80);
  const usernameResult = validateUsername(readRequiredString(formData, "username"));
  const payoutResult = validatePayoutDetails({
    accountName: readRequiredString(formData, "accountName"),
    accountNumber: readRequiredString(formData, "accountNumber"),
    bankName: readRequiredString(formData, "bankName"),
  });

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

  if (!usernameResult.ok) {
    redirect(`/profile?error=${usernameResult.code}`);
  }

  if (!payoutResult.ok) {
    redirect(`/profile?error=${payoutResult.code}`);
  }

  const username = usernameResult.value;
  const { accountName, accountNumber, bankName } = payoutResult.value;

  const { error } = await supabase
    .from("profiles")
    .update({
      display_name: displayName,
      username,
      bank_name: bankName,
      account_number: accountNumber,
      account_name: accountName,
      updated_at: new Date().toISOString(),
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
