import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const rawCode = code.trim();
  let resolvedCode = rawCode;

  try {
    const decoded = Buffer.from(rawCode, "base64").toString("utf8");
    const isValidCode = /^[a-z0-9_]{3,24}$/i.test(decoded);
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(decoded);

    if (isValidCode || isValidUUID) {
      resolvedCode = decoded;
    }
  } catch {
    // Keep the original referral parameter when decoding is not possible.
  }

  const supabase = await createClient();
  const lookupClient = hasSupabaseAdminKey() ? createAdminClient() : supabase;
  let referrerId: string | null = null;
  let referralCode = resolvedCode.toUpperCase();
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(resolvedCode);

  try {
    if (isUUID) {
      const { data: referrer } = await lookupClient
        .from("profiles")
        .select("id, referral_code")
        .eq("id", resolvedCode)
        .maybeSingle();

      if (referrer) {
        referrerId = referrer.id;
        referralCode = referrer.referral_code.toUpperCase();
      }
    } else {
      const { data: referrer } = await lookupClient
        .from("profiles")
        .select("id")
        .eq("referral_code", referralCode)
        .maybeSingle();

      if (referrer) {
        referrerId = referrer.id;
      }
    }
  } catch (error) {
    console.error("Error resolving referrer profile:", error);
  }

  const encodedRefParam = btoa(referralCode);
  const response = NextResponse.redirect(new URL(`/?ref=${encodeURIComponent(encodedRefParam)}`, request.url));
  const clientIp = getClientIp(request.headers);

  response.cookies.set("byte_earn_ref", referralCode, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  try {
    const {
      data: { user },
    } = await supabase.auth.getUser();

    if (user && user.id === referrerId) {
      return response;
    }

    if (referrerId) {
      const { data: lastReferrerSession } = await lookupClient
        .from("task_sessions")
        .select("ip_address")
        .eq("profile_id", referrerId)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();

      if (lastReferrerSession?.ip_address && lastReferrerSession.ip_address === clientIp) {
        return response;
      }
    }

    const limit = await checkRateLimit(`referral:${clientIp}:${referralCode}`, 30, 60 * 60 * 1000);
    if (!limit.allowed || !hasSupabaseAdminKey()) {
      return response;
    }

    const adminSupabase = createAdminClient();
    await adminSupabase.from("referral_visits").insert({
      referral_code: referralCode,
      referrer_id: referrerId,
      visitor_profile_id: user?.id ?? null,
      user_agent: request.headers.get("user-agent"),
    });
  } catch {
    // Referral cookies preserve signup attribution if analytics is unavailable locally.
  }

  return response;
}
