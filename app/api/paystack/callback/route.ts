import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");
  const clientIp = getClientIp(request.headers);

  if (!reference) {
    return NextResponse.redirect(new URL("/activate?payment_error=missing_reference", request.url));
  }

  const limit = checkRateLimit(`paystack:callback:${clientIp}:${reference}`, 8, 10 * 60 * 1000);
  if (!limit.allowed) {
    return NextResponse.redirect(new URL("/activate?payment_error=rate_limited", request.url));
  }

  const verified = await verifyPaystackTransaction(reference);
  const isSuccessful = verified?.status === "success";
  const supabase = await createClient();
  const { data: payment, error: paymentError } = await supabase
    .from("signup_payments")
    .select("id, profile_id, amount_kobo, currency")
    .eq("reference", reference)
    .maybeSingle();

  if (paymentError || !payment) {
    return NextResponse.redirect(new URL("/activate?payment_error=unknown_reference", request.url));
  }

  const { error: updatePaymentError } = await supabase
    .from("signup_payments")
    .update({
      amount_kobo: verified?.amount ?? payment.amount_kobo,
      currency: verified?.currency ?? payment.currency,
      paid_at: verified?.paid_at ? new Date(verified.paid_at).toISOString() : null,
      provider_message: isSuccessful ? "Verification successful" : "Payment was not successful",
      status: isSuccessful ? "success" : "failed",
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.id);

  if (updatePaymentError) {
    return NextResponse.redirect(new URL(`/activate?payment_error=${encodeURIComponent(updatePaymentError.message)}`, request.url));
  }

  await writeAuditLog({
    action: isSuccessful ? "payment.verified" : "payment.failed",
    actorId: payment.profile_id,
    entityId: payment.id,
    entityType: "signup_payment",
    metadata: { reference },
  });

  if (!isSuccessful) {
    return NextResponse.redirect(new URL("/activate?payment_error=not_successful", request.url));
  }

  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      status: "onboarding",
      updated_at: new Date().toISOString(),
    })
    .eq("id", payment.profile_id);

  if (profileError) {
    return NextResponse.redirect(new URL(`/activate?payment_error=${encodeURIComponent(profileError.message)}`, request.url));
  }

  return NextResponse.redirect(new URL("/onboarding?updated=payment_verified", request.url));
}
