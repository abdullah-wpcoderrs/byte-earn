import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { profiles, signupPayments } from "@/db/schema";
import { getDb } from "@/lib/db";
import { verifyPaystackTransaction } from "@/lib/paystack";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const reference = url.searchParams.get("reference");

  if (!reference) {
    return NextResponse.redirect(new URL("/activate?payment_error=missing_reference", request.url));
  }

  const verified = await verifyPaystackTransaction(reference);
  const isSuccessful = verified?.status === "success";
  const db = getDb();
  const payment = await db.query.signupPayments.findFirst({
    where: eq(signupPayments.reference, reference),
  });

  if (!payment) {
    return NextResponse.redirect(new URL("/activate?payment_error=unknown_reference", request.url));
  }

  await db
    .update(signupPayments)
    .set({
      amountKobo: verified?.amount ?? payment.amountKobo,
      currency: verified?.currency ?? payment.currency,
      paidAt: verified?.paid_at ? new Date(verified.paid_at) : null,
      providerMessage: isSuccessful ? "Verification successful" : "Payment was not successful",
      status: isSuccessful ? "success" : "failed",
      updatedAt: new Date(),
    })
    .where(eq(signupPayments.id, payment.id));

  if (!isSuccessful) {
    return NextResponse.redirect(new URL("/activate?payment_error=not_successful", request.url));
  }

  await db
    .update(profiles)
    .set({
      status: "onboarding",
      updatedAt: new Date(),
    })
    .where(eq(profiles.id, payment.profileId));

  return NextResponse.redirect(new URL("/onboarding", request.url));
}
