import { NextResponse } from "next/server";
import { writeAuditLog } from "@/lib/audit";
import { SIGNUP_FEE_CURRENCY, SIGNUP_FEE_KOBO } from "@/lib/config/pricing";
import { verifyPaystackTransaction } from "@/lib/paystack";
import { checkRateLimit, getClientIp } from "@/lib/rate-limit";
import { createAdminClient } from "@/lib/supabase/admin";

type VerifiedPaystackTransaction = Awaited<ReturnType<typeof verifyPaystackTransaction>>;

function hasExpectedPaymentValue(verified: VerifiedPaystackTransaction) {
  return verified?.amount === SIGNUP_FEE_KOBO && verified?.currency?.toUpperCase() === SIGNUP_FEE_CURRENCY;
}

function paymentUpdateErrorCode(message: string) {
  if (message.includes("Payment reference not found")) return "unknown_reference";
  if (message.includes("Payment amount or currency mismatch")) return "amount_mismatch";
  return "payment_verification_failed";
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");
  const clientIp = getClientIp(request.headers);

  if (!reference) {
    return NextResponse.redirect(new URL("/activate?payment_error=missing_reference", request.url));
  }

  try {
    const limit = await checkRateLimit(`paystack:callback:${clientIp}:${reference}`, 8, 10 * 60 * 1000);
    if (!limit.allowed) {
      return NextResponse.redirect(new URL("/activate?payment_error=rate_limited", request.url));
    }
  } catch {
    return NextResponse.redirect(new URL("/activate?payment_error=service_unavailable", request.url));
  }

  let verified: VerifiedPaystackTransaction;
  try {
    verified = await verifyPaystackTransaction(reference);
  } catch {
    return NextResponse.redirect(new URL("/activate?payment_error=payment_verification_failed", request.url));
  }

  const isSuccessful = verified?.status === "success";
  if (isSuccessful && !hasExpectedPaymentValue(verified)) {
    await writeAuditLog({
      action: "payment.amount_mismatch",
      entityType: "signup_payment",
      metadata: {
        expectedAmountKobo: SIGNUP_FEE_KOBO,
        expectedCurrency: SIGNUP_FEE_CURRENCY,
        reference,
        verifiedAmountKobo: verified?.amount ?? null,
        verifiedCurrency: verified?.currency ?? null,
      },
    }).catch(() => undefined);
    return NextResponse.redirect(new URL("/activate?payment_error=amount_mismatch", request.url));
  }

  const supabase = createAdminClient();
  const { data: paymentUpdate, error: paymentUpdateError } = await supabase.rpc("mark_signup_payment_result", {
    next_amount_kobo: verified?.amount ?? null,
    next_currency: verified?.currency ?? null,
    next_paid_at: verified?.paid_at ? new Date(verified.paid_at).toISOString() : null,
    next_provider_message: isSuccessful ? "Verification successful" : "Payment was not successful",
    next_status: isSuccessful ? "success" : "failed",
    target_reference: reference,
  });

  const payment = paymentUpdate?.[0];

  if (paymentUpdateError) {
    return NextResponse.redirect(new URL(`/activate?payment_error=${paymentUpdateErrorCode(paymentUpdateError.message)}`, request.url));
  }

  if (!payment) {
    return NextResponse.redirect(new URL("/activate?payment_error=unknown_reference", request.url));
  }

  await writeAuditLog({
    action: isSuccessful ? "payment.verified" : "payment.failed",
    actorId: payment.profile_id,
    entityId: payment.payment_id,
    entityType: "signup_payment",
    metadata: { reference },
  });

  if (!isSuccessful) {
    return NextResponse.redirect(new URL("/activate?payment_error=not_successful", request.url));
  }

  if (payment.profile_status !== "onboarding" && payment.profile_status !== "active") {
    return NextResponse.redirect(new URL("/activate?payment_error=profile_not_ready", request.url));
  }

  return NextResponse.redirect(new URL("/onboarding?updated=payment_verified", request.url));
}