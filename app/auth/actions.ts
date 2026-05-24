"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { isPaystackActivationEnabled } from "@/lib/config/payments";
import { assertRateLimit, getClientIp } from "@/lib/rate-limit";
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
  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  assertRateLimit(`auth:signup:${clientIp}:${email.toLowerCase()}`, 5, 10 * 60 * 1000);
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

  const referralCode = await createUniqueReferralCode();
  const { data: referrer, error: referrerError } = providedReferralCode
    ? await supabase.from("profiles").select("id").eq("referral_code", providedReferralCode).maybeSingle()
    : { data: null, error: null };

  if (referrerError) {
    redirect(`/?auth_error=${encodeURIComponent(referrerError.message)}`);
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .upsert({
      id: data.user.id,
      display_name: displayName,
      referral_code: referralCode,
      referred_by: referrer?.id,
      status: isPaystackActivationEnabled() ? "pending_payment" : "onboarding",
      updated_at: new Date().toISOString(),
    });

  if (profileError) {
    redirect(`/?auth_error=${encodeURIComponent(profileError.message)}`);
  }

  if (providedReferralCode) {
    await supabase.from("referral_attributions").insert({
      referral_code: providedReferralCode,
      referred_profile_id: data.user.id,
      referrer_id: referrer?.id,
    });
  }

  redirect(isPaystackActivationEnabled() ? "/activate?updated=account_created" : "/onboarding?updated=account_created");
}

export async function signInAction(formData: FormData) {
  const email = readRequiredString(formData, "email");
  const password = readRequiredString(formData, "password");
  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  assertRateLimit(`auth:signin:${clientIp}:${email.toLowerCase()}`, 8, 10 * 60 * 1000);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect(`/?auth_error=${encodeURIComponent(error?.message ?? "Unable to sign in.")}`);
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", data.user.id)
    .maybeSingle();

  if (profileError || !profile) {
    redirect("/activate");
  }

  if (profile.status === "suspended") {
    redirect(`/?auth_error=${encodeURIComponent("Account suspended.")}`);
  }

  if (profile.role === "admin") {
    redirect("/admin?updated=login");
  }

  if (profile.status === "pending_payment") {
    redirect("/activate");
  }

  if (profile.status === "onboarding") {
    redirect("/onboarding");
  }

  redirect("/feed?updated=login");
}
