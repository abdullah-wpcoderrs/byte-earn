"use server";

import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { getActiveFinanceSettings } from "@/lib/finance-settings";
import { nairaToCredits } from "@/lib/money";
import { getPlatformSettings } from "@/lib/platform-settings";
import { assertRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { areSponsoredWithdrawalsUnlocked, getAvailableWithdrawalCredits, type WalletBreakdown } from "@/lib/wallet";

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

  const [ledgerResult, withdrawalResult, settings, financeSettings] = await Promise.all([
    supabase.from("credit_ledger").select("credits, source").eq("profile_id", user.id),
    supabase.from("withdrawals").select("amount_credits, status").eq("profile_id", user.id),
    getPlatformSettings(),
    getActiveFinanceSettings(),
  ]);

  if (ledgerResult.error) {
    redirect(`/wallet?withdrawal_error=${encodeURIComponent(ledgerResult.error.message)}`);
  }

  if (withdrawalResult.error) {
    redirect(`/wallet?withdrawal_error=${encodeURIComponent(withdrawalResult.error.message)}`);
  }

  const wallet = (ledgerResult.data ?? []).reduce<WalletBreakdown>(
    (current, row) => {
      if (row.source === "referral") {
        current.referralCredits += row.credits;
      }
      if (row.source === "sponsored_task" || row.source === "watch_time") {
        current.sponsoredCredits += row.credits;
      }
      return current;
    },
    { referralCredits: 0, sponsoredCredits: 0, totalWithdrawnCredits: 0 },
  );
  const pendingOrPaidCredits = (withdrawalResult.data ?? [])
    .filter((row) => row.status === "pending" || row.status === "approved" || row.status === "paid")
    .reduce((total, row) => total + row.amount_credits, 0);
  const sponsoredUnlocked = areSponsoredWithdrawalsUnlocked(settings.sponsored_withdrawals_unlocked);
  const availableCredits = Math.max(0, getAvailableWithdrawalCredits(wallet, sponsoredUnlocked) - pendingOrPaidCredits);
  const requestedCredits = Math.ceil(nairaToCredits(amountNaira, financeSettings));
  const ngnPerCredit = (financeSettings.usdPerUnit / financeSettings.creditsPerUnit) * financeSettings.ngnPerUsd;

  if (requestedCredits > availableCredits) {
    redirect("/wallet?withdrawal_error=insufficient_available_balance");
  }

  const { data: request, error } = await supabase
    .from("withdrawals")
    .insert({
      account_name: accountName,
      account_number: accountNumber,
      amount_credits: requestedCredits,
      amount_naira: amountNaira.toFixed(2),
      bank_name: bankName,
      credits_per_unit_snapshot: financeSettings.creditsPerUnit,
      ngn_per_credit_snapshot: ngnPerCredit.toFixed(4),
      ngn_per_usd_snapshot: financeSettings.ngnPerUsd.toFixed(4),
      profile_id: user.id,
      usd_per_unit_snapshot: financeSettings.usdPerUnit.toFixed(4),
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
    metadata: { amountNaira, requestedCredits, rate: financeSettings },
  });

  redirect("/wallet?withdrawal=requested");
}
