"use server";

import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { nairaToCredits } from "@/lib/money";
import { assertRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

export async function requestWithdrawalAction(formData: FormData) {
  const amountNaira = Number(readRequiredString(formData, "amountNaira").replace(/,/g, ""));
  const bankName = readRequiredString(formData, "bankName");
  const accountNumber = readRequiredString(formData, "accountNumber");
  const accountName = readRequiredString(formData, "accountName");

  if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
    redirect("/wallet?withdrawal_error=invalid_amount");
  }

  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  assertRateLimit(`wallet:withdrawal:${user.id}`, 3, 60 * 60 * 1000);

  const { data: request, error } = await supabase
    .from("withdrawals")
    .insert({
      account_name: accountName,
      account_number: accountNumber,
      amount_credits: Math.round(nairaToCredits(amountNaira)),
      amount_naira: amountNaira.toFixed(2),
      bank_name: bankName,
      profile_id: user.id,
    })
    .select("id")
    .maybeSingle();

  if (error) {
    redirect(`/wallet?withdrawal_error=${encodeURIComponent(error.message)}`);
  }

  await writeAuditLog({
    action: "withdrawal.requested",
    actorId: user.id,
    entityId: request?.id,
    entityType: "withdrawal",
    metadata: { amountNaira },
  });

  redirect("/wallet?withdrawal=requested");
}
