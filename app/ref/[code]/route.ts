import { NextResponse } from "next/server";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();
  const response = NextResponse.redirect(new URL(`/?ref=${encodeURIComponent(normalizedCode)}`, request.url));
  const clientIp = getClientIp(request.headers);

  response.cookies.set("byte_earn_ref", normalizedCode, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  try {
    const limit = checkRateLimit(`referral:${clientIp}:${normalizedCode}`, 30, 60 * 60 * 1000);
    if (!limit.allowed) {
      return response;
    }

    const supabase = await createClient();
    const { data: referrer } = await supabase.from("profiles").select("id").eq("referral_code", normalizedCode).maybeSingle();

    await supabase.from("referral_visits").insert({
      referral_code: normalizedCode,
      referrer_id: referrer?.id,
      user_agent: request.headers.get("user-agent"),
    });
  } catch {
    // Referral cookies still preserve attribution if database tracking is unavailable locally.
  }

  return response;
}
