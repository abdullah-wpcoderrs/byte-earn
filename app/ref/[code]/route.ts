import { eq } from "drizzle-orm";
import { NextResponse } from "next/server";
import { profiles, referralVisits } from "@/db/schema";
import { getDb } from "@/lib/db";

export async function GET(request: Request, { params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const normalizedCode = code.trim().toUpperCase();
  const response = NextResponse.redirect(new URL(`/?ref=${encodeURIComponent(normalizedCode)}`, request.url));

  response.cookies.set("byte_earn_ref", normalizedCode, {
    httpOnly: true,
    maxAge: 60 * 60 * 24 * 30,
    path: "/",
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
  });

  try {
    const db = getDb();
    const referrer = await db.query.profiles.findFirst({
      where: eq(profiles.referralCode, normalizedCode),
      columns: { id: true },
    });

    await db.insert(referralVisits).values({
      referralCode: normalizedCode,
      referrerId: referrer?.id,
      userAgent: request.headers.get("user-agent"),
    });
  } catch {
    // Referral cookies still preserve attribution if database tracking is unavailable locally.
  }

  return response;
}
