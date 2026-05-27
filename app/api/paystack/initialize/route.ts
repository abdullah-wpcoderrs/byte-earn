import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { SIGNUP_FEE_KOBO } from "@/lib/config/pricing";
import { initializePaystackTransaction } from "@/lib/paystack";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const clientIp = getClientIp(request.headers);
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const limit = await checkRateLimit(`paystack:init:${clientIp}:${user.id}`, 4, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.redirect(new URL("/activate?payment_error=rate_limited", request.url));
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, status")
    .eq("id", user.id)
    .maybeSingle();

  if (profileError || !profile) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (profile.role === "admin") {
    return NextResponse.redirect(new URL("/admin", request.url));
  }

  if (profile.status === "active") {
    return NextResponse.redirect(new URL("/feed", request.url));
  }

  if (profile.status === "onboarding") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  const amountKobo = SIGNUP_FEE_KOBO;
  const reference = `be-signup-${user.id.slice(0, 8)}-${Date.now()}`;
  const callbackUrl = new URL(`/api/paystack/callback`, request.url).toString();
  const transaction = await initializePaystackTransaction({
    amountKobo,
    callbackUrl,
    email: user.email,
    profileId: user.id,
    reference,
  });

  const { data: payment, error: paymentError } = await supabase.from("signup_payments").insert({
    access_code: transaction.access_code,
    amount_kobo: amountKobo,
    authorization_url: transaction.authorization_url,
    profile_id: user.id,
    reference,
  }).select("id").maybeSingle();

  if (paymentError) {
    return NextResponse.redirect(new URL(`/activate?payment_error=${encodeURIComponent(paymentError.message)}`, request.url));
  }

  await writeAuditLog({
    action: "payment.initialized",
    actorId: user.id,
    entityId: payment?.id,
    entityType: "signup_payment",
    metadata: { amountKobo, reference },
  });

  return NextResponse.redirect(transaction.authorization_url!);
}
