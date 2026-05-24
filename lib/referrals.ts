import { createClient } from "@/lib/supabase/server";

const REFERRAL_ALPHABET = "ABCDEFGHJKLMNPQRSTUVWXYZ23456789";

export function generateReferralCode(length = 8) {
  let code = "BE";

  for (let index = 0; index < length; index += 1) {
    code += REFERRAL_ALPHABET[Math.floor(Math.random() * REFERRAL_ALPHABET.length)];
  }

  return code;
}

export async function createUniqueReferralCode() {
  const supabase = await createClient();

  for (let attempt = 0; attempt < 5; attempt += 1) {
    const referralCode = generateReferralCode();
    const { data: existing, error } = await supabase
      .from("profiles")
      .select("id")
      .eq("referral_code", referralCode)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!existing) {
      return referralCode;
    }
  }

  return `${generateReferralCode()}${Date.now().toString(36).toUpperCase()}`;
}
