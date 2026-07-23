"use server";

import { redirect } from "next/navigation";
import { validatePayoutDetails } from "@/lib/profile-validation";
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

  if (displayName.trim().length < 2) {
    redirect("/onboarding?error=invalid_name");
  }

  if (!payoutResult.ok) {
    redirect(`/onboarding?error=${payoutResult.code}`);
  }

  const { accountName, accountNumber, bankName } = payoutResult.value;

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
    redirect("/onboarding?error=service_unavailable");
  }

  redirect("/feed?onboarding=saved");
}
