"use server";

import { eq } from "drizzle-orm";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { profiles, referralAttributions } from "@/db/schema";
import { isPaystackActivationEnabled } from "@/lib/config/payments";
import { getDb } from "@/lib/db";
import { createUniqueReferralCode } from "@/lib/referrals";
import { createClient } from "@/lib/supabase/server";

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

export async function signUpAction(formData: FormData) {
  const displayName = readRequiredString(formData, "displayName");
  const email = readRequiredString(formData, "email");
  const password = readRequiredString(formData, "password");
  const referralCodeInput = formData.get("referralCode");
  const cookieReferralCode = (await cookies()).get("byte_earn_ref")?.value;
  const providedReferralCode =
    typeof referralCodeInput === "string" && referralCodeInput.trim().length > 0
      ? referralCodeInput.trim().toUpperCase()
      : cookieReferralCode?.trim().toUpperCase() ?? "";
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
      },
    },
  });

  if (error || !data.user) {
    redirect(`/?auth_error=${encodeURIComponent(error?.message ?? "Unable to create account. Check Supabase Auth settings.")}`);
  }

  const db = getDb();
  const referralCode = await createUniqueReferralCode();
  const referrer = providedReferralCode
    ? await db.query.profiles.findFirst({
        where: eq(profiles.referralCode, providedReferralCode),
        columns: { id: true },
      })
    : null;

  await db
    .insert(profiles)
    .values({
      id: data.user.id,
      displayName,
      referralCode,
      referredBy: referrer?.id,
      status: isPaystackActivationEnabled() ? "pending_payment" : "onboarding",
    })
    .onConflictDoUpdate({
      target: profiles.id,
      set: {
        displayName,
        referredBy: referrer?.id,
        status: isPaystackActivationEnabled() ? "pending_payment" : "onboarding",
        updatedAt: new Date(),
      },
    });

  if (providedReferralCode) {
    await db
      .insert(referralAttributions)
      .values({
        referralCode: providedReferralCode,
        referredProfileId: data.user.id,
        referrerId: referrer?.id,
      })
      .onConflictDoNothing();
  }

  redirect(isPaystackActivationEnabled() ? "/activate" : "/onboarding");
}

export async function signInAction(formData: FormData) {
  const email = readRequiredString(formData, "email");
  const password = readRequiredString(formData, "password");
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect(`/?auth_error=${encodeURIComponent(error?.message ?? "Unable to sign in.")}`);
  }

  const profile = await getDb().query.profiles.findFirst({
    where: eq(profiles.id, data.user.id),
    columns: { status: true },
  });

  if (!profile || profile.status === "pending_payment") {
    redirect("/activate");
  }

  if (profile.status === "onboarding") {
    redirect("/onboarding");
  }

  redirect("/feed");
}
