"use server";

import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { withdrawals } from "@/db/schema";
import { getDb } from "@/lib/db";
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

  const [request] = await getDb().insert(withdrawals).values({
    accountName,
    accountNumber,
    amountCredits: Math.round(nairaToCredits(amountNaira)),
    amountNaira: amountNaira.toFixed(2),
    bankName,
    profileId: user.id,
  }).returning({ id: withdrawals.id });

  await writeAuditLog({
    action: "withdrawal.requested",
    actorId: user.id,
    entityId: request?.id,
    entityType: "withdrawal",
    metadata: { amountNaira },
  });

  redirect("/wallet?withdrawal=requested");
}
