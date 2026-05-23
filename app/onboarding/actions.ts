"use server";

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

export async function completeOnboardingAction(formData: FormData) {
  const displayName = readRequiredString(formData, "displayName");
  const bankName = readRequiredString(formData, "bankName");
  const accountNumber = readRequiredString(formData, "accountNumber");
  const accountName = readRequiredString(formData, "accountName");
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const { error } = await supabase
    .from("profiles")
    .update({
      account_name: accountName,
      account_number: accountNumber,
      bank_name: bankName,
      display_name: displayName,
      status: "active",
      updated_at: new Date().toISOString(),
    })
    .eq("id", user.id);

  if (error) {
    redirect(`/onboarding?error=${encodeURIComponent(error.message)}`);
  }

  redirect("/feed?onboarding=saved");
}
