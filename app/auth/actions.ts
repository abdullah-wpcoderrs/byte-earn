"use server";

import { cookies } from "next/headers";
import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { validateUsername } from "@/lib/profile-validation";
import { isPaystackActivationEnabled } from "@/lib/config/payments";
import { assertRateLimit, getClientIp } from "@/lib/rate-limit";
import { createUniqueReferralCode } from "@/lib/referrals";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

function localRedirectTarget(formData: FormData, key: string, fallback: string) {
  const value = formData.get(key);
  return typeof value === "string" && value.startsWith("/") ? value : fallback;
}

function withQuery(pathname: string, key: string, value: string) {
  const [path, query = ""] = pathname.split("?");
  const params = new URLSearchParams(query);
  params.set(key, value);
  const search = params.toString();
  return search ? `${path}?${search}` : path;
}

function authErrorCode(message?: string) {
  const normalized = message?.toLowerCase() ?? "";

  if (normalized.includes("password") && normalized.includes("6")) return "weak_password";
  if (normalized.includes("password")) return "weak_password";
  if (normalized.includes("invalid login") || normalized.includes("invalid credentials")) return "invalid_credentials";
  if (normalized.includes("already") || normalized.includes("registered")) return "email_unavailable";
  if (normalized.includes("rate limit") || normalized.includes("too many")) return "rate_limited";

  return "service_unavailable";
}

export async function signUpAction(formData: FormData) {
  const displayName = readRequiredString(formData, "displayName");
  const usernameResult = validateUsername(readRequiredString(formData, "username"));
  const email = readRequiredString(formData, "email");
  const password = readRequiredString(formData, "password");

  if (!usernameResult.ok) {
    redirect(
      usernameResult.code === "reserved_username"
        ? "/?auth_error=reserved_username"
        : "/?auth_error=invalid_username",
    );
  }

  const username = usernameResult.value;

  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  await assertRateLimit(`auth:signup:${clientIp}:${email.toLowerCase()}`, 5, 10 * 60 * 1000);
  const referralCodeInput = formData.get("referralCode");
  const cookieReferralCode = (await cookies()).get("byte_earn_ref")?.value;
  const providedReferralCode =
    typeof referralCodeInput === "string" && referralCodeInput.trim().length > 0
      ? referralCodeInput.trim().toUpperCase()
      : cookieReferralCode?.trim().toUpperCase() ?? "";
  const adminSupabase = createAdminClient();
  const supabase = await createClient();
  const { data: existingUsername, error: existingUsernameError } = await adminSupabase
    .from("profiles")
    .select("id")
    .eq("username", username)
    .maybeSingle();

  if (existingUsernameError) {
    redirect("/?auth_error=service_unavailable");
  }

  if (existingUsername) {
    redirect("/?auth_error=username_taken");
  }

  const { data, error } = await supabase.auth.signUp({
    email,
    password,
    options: {
      data: {
        display_name: displayName,
        username,
      },
    },
  });

  if (error || !data.user) {
    redirect(`/?auth_error=${authErrorCode(error?.message)}`);
  }

  const referralCode = await createUniqueReferralCode();
  const { data: referrer, error: referrerError } = providedReferralCode
    ? await adminSupabase.from("profiles").select("id").eq("referral_code", providedReferralCode).maybeSingle()
    : { data: null, error: null };

  if (referrerError) {
    redirect("/?auth_error=service_unavailable");
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
      username,
    });

  if (profileError) {
    redirect("/?auth_error=service_unavailable");
  }

  if (providedReferralCode && referrer?.id && referrer.id !== data.user.id) {
    const { error: attributionError } = await supabase.from("referral_attributions").insert({
      referral_code: providedReferralCode,
      referred_profile_id: data.user.id,
      referrer_id: referrer?.id,
    });

    if (attributionError && attributionError.code !== "23505") {
      redirect("/?auth_error=service_unavailable");
    }
  }

  redirect(isPaystackActivationEnabled() ? "/activate?updated=account_created" : "/onboarding?updated=account_created");
}

export async function signInAction(formData: FormData) {
  const email = readRequiredString(formData, "email");
  const password = readRequiredString(formData, "password");
  const errorRedirectTo = localRedirectTarget(formData, "errorRedirectTo", "/");
  const requestHeaders = await headers();
  const clientIp = getClientIp(requestHeaders);
  await assertRateLimit(`auth:signin:${clientIp}:${email.toLowerCase()}`, 8, 10 * 60 * 1000);
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  });

  if (error || !data.user) {
    redirect(withQuery(errorRedirectTo, "auth_error", authErrorCode(error?.message)));
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
    redirect(withQuery(errorRedirectTo, "auth_error", "account_suspended"));
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

export async function signOutAction() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/?auth=logged_out");
}
