"use server";

import { redirect } from "next/navigation";
import { writeAuditLog } from "@/lib/audit";
import { getActiveFinanceSettings } from "@/lib/finance-settings";
import { nairaToCredits } from "@/lib/money";
import { getPlatformSettings } from "@/lib/platform-settings";
import { validatePayoutDetails } from "@/lib/profile-validation";
import { assertRateLimit } from "@/lib/rate-limit";
import { createClient } from "@/lib/supabase/server";
import { type WalletBreakdown } from "@/lib/wallet";

type WithdrawalBalanceBreakdown = Pick<
  WalletBreakdown,
  "referralCredits" | "sponsoredCredits" | "watchTimeCredits" | "adminCredits" | "adjustmentCredits"
>;

function readRequiredString(formData: FormData, key: string) {
  const value = formData.get(key);

  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(`${key} is required.`);
  }

  return value.trim();
}

export async function requestWithdrawalAction(formData: FormData) {
  const amountNaira = Number(readRequiredString(formData, "amountNaira").replace(/,/g, ""));
  const payoutResult = validatePayoutDetails({
    accountName: readRequiredString(formData, "accountName"),
    accountNumber: readRequiredString(formData, "accountNumber"),
    bankName: readRequiredString(formData, "bankName"),
  });

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

  await assertRateLimit(`wallet:withdrawal:${user.id}`, 3, 60 * 60 * 1000);

  if (!payoutResult.ok) {
    redirect(`/wallet?withdrawal_error=${payoutResult.code}`);
  }

  const { accountName, accountNumber, bankName } = payoutResult.value;

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

  const wallet = (ledgerResult.data ?? []).reduce<WithdrawalBalanceBreakdown>(
    (current, row) => {
      if (row.source === "referral") current.referralCredits += row.credits;
      if (row.source === "sponsored_task") current.sponsoredCredits += row.credits;
      if (row.source === "watch_time") current.watchTimeCredits += row.credits;
      if (row.source === "admin_credit") current.adminCredits += row.credits;
      if (row.source === "adjustment") current.adjustmentCredits += row.credits;
      return current;
    },
    {
      referralCredits: 0,
      sponsoredCredits: 0,
      watchTimeCredits: 0,
      adminCredits: 0,
      adjustmentCredits: 0,
    },
  );

  const pendingOrPaidCredits = (withdrawalResult.data ?? [])
    .filter((row) => row.status === "pending" || row.status === "approved" || row.status === "paid")
    .reduce((total, row) => total + row.amount_credits, 0);

  const unlockedGross = 
    (settings.referral_withdrawals_unlocked ? wallet.referralCredits : 0) +
    (settings.sponsored_withdrawals_unlocked ? wallet.sponsoredCredits : 0) +
    (settings.watch_time_withdrawals_unlocked ? wallet.watchTimeCredits : 0) +
    (settings.admin_credit_withdrawals_unlocked ? wallet.adminCredits : 0) +
    (settings.adjustment_withdrawals_unlocked ? wallet.adjustmentCredits : 0);

  const availableCredits = Math.max(0, unlockedGross - pendingOrPaidCredits);
  const requestedCredits = Math.ceil(nairaToCredits(amountNaira, financeSettings));
  const ngnPerCredit = (financeSettings.usdPerUnit / financeSettings.creditsPerUnit) * financeSettings.ngnPerUsd;

  if (requestedCredits > availableCredits) {
    redirect("/wallet?withdrawal_error=insufficient_available_balance");
  }

  const withdrawalRequestArgs = {
    request_account_name: accountName,
    request_account_number: accountNumber,
    request_amount_credits: requestedCredits,
    request_amount_naira: amountNaira.toFixed(2),
    request_bank_name: bankName,
    request_credits_per_unit_snapshot: financeSettings.creditsPerUnit,
    request_ngn_per_credit_snapshot: ngnPerCredit.toFixed(4),
    request_ngn_per_usd_snapshot: financeSettings.ngnPerUsd.toFixed(4),
    request_profile_id: user.id,
    request_usd_per_unit_snapshot: financeSettings.usdPerUnit.toFixed(4),
  };
  const { data: request, error } = await supabase.rpc("request_withdrawal_atomically", withdrawalRequestArgs);

  if (error) {
    const knownBalanceError = error.message.includes("insufficient_available_balance");
    redirect(`/wallet?withdrawal_error=${encodeURIComponent(knownBalanceError ? "insufficient_available_balance" : error.message)}`);
  }

  const createdRequest = request?.[0];

  await writeAuditLog({
    action: "withdrawal.requested",
    actorId: user.id,
    entityId: createdRequest?.withdrawal_id,
    entityType: "withdrawal",
    metadata: { amountNaira, requestedCredits, rate: financeSettings },
  });

  redirect("/wallet?withdrawal=requested");
}
