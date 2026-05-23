import { eq } from "drizzle-orm";
import { profiles } from "@/db/schema";
import { getDb } from "@/lib/db";

const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(length = 8) {
  let code = "BE";

  for (let index = 0; index < length; index += 1) {
    code += REFERRAL_ALPHABET[Math.floor(Math.random() * REFERRAL_ALPHABET.length)];
  }

  return code;
}

export async function createUniqueReferralCode() {
  const db = getDb();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = generateReferralCode();
    const existing = await db.query.profiles.findFirst({
      where: eq(profiles.referralCode, referralCode),
      columns: { id: true },
    });

    if (!existing) {
      return referralCode;
    }
  }

  return `${generateReferralCode()}${Date.now().toString(36).toUpperCase()}`;
}
