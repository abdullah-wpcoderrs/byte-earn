import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const rawCode = code.trim();
  let resolvedCode = rawCode;

  // Try to decode from Base64
  try {
    const decoded = Buffer.from(rawCode, "base64").toString("utf8");
    const isValidCode = /^[a-z0-9_]{3,24}$/i.test(decoded);
    const isValidUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(decoded);

    if (isValidCode || isValidUUID) {
      resolvedCode = decoded;
    }
  } catch {
    // Fallback to original raw parameter if Base64 fails to decode
  }

  const supabase = await createClient();
  let referrerId: string | null = null;
  let referralCode = resolvedCode.toUpperCase();

  // If resolvedCode is a UUID (profileId fallback), resolve their clean alphanumeric referral code
  const isUUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i.test(resolvedCode);

  try {
    if (isUUID) {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id, referral_code")
        .eq("id", resolvedCode)
        .maybeSingle();

      if (referrer) {
        referrerId = referrer.id;
        referralCode = referrer.referral_code.toUpperCase();
      }
    } else {
      const { data: referrer } = await supabase
        .from("profiles")
        .select("id")
        .eq("referral_code", referralCode)
        .maybeSingle();

      if (referrer) {
        referrerId = referrer.id;
      }
    }
  } catch (err) {
    console.error("Error resolving referrer profile:", err);
  }

  // Obfuscate the referralCode in the redirect query parameter to keep it invisible in address bar
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
    const limit = await checkRateLimit(`referral:${clientIp}:${referralCode}`, 30, 60 * 60 * 1000);
    if (!limit.allowed) {
      return response;
    }

    await supabase.from("referral_visits").insert({
      referral_code: referralCode,
      referrer_id: referrerId,
      user_agent: request.headers.get("user-agent"),
    });
  } catch {
    // Referral cookies still preserve attribution if database tracking is unavailable locally.
  }

  return response;
}
