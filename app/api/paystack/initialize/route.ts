import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { profiles, signupPayments } from "@/db/schema";
import { SIGNUP_FEE_KOBO } from "@/lib/config/pricing";
import { getDb } from "@/lib/db";
import { initializePaystackTransaction } from "@/lib/paystack";
import { createClient } from "@/lib/supabase/server";

export async function POST(request: Request) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user?.email) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  const db = getDb();
  const profile = await db.query.profiles.findFirst({
    where: eq(profiles.id, user.id),
  });

  if (!profile) {
    return NextResponse.redirect(new URL("/", request.url));
  }

  if (profile.status === "onboarding") {
    return NextResponse.redirect(new URL("/onboarding", request.url));
  }

  if (profile.status === "active") {
    return NextResponse.redirect(new URL("/feed", request.url));
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

  await db.insert(signupPayments).values({
    accessCode: transaction.access_code,
    amountKobo,
    authorizationUrl: transaction.authorization_url,
    profileId: user.id,
    reference,
  });

  return NextResponse.redirect(transaction.authorization_url!);
}
