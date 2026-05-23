"use server";

import { eq } from "drizzle-orm";
import { redirect } from "next/navigation";
import { profiles } from "@/db/schema";
import { getDb } from "@/lib/db";
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

  await getDb()
    .update(profiles)
    .set({
      accountName,
      accountNumber,
      bankName,
      displayName,
      status: "active",
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, user.id));

  redirect("/feed");
}
