import "server-only";

import { getActiveFinanceSettings } from "@/lib/finance-settings";
import { getPlatformSettings } from "@/lib/platform-settings";
import { createClient } from "@/lib/supabase/server";
import type { WalletBreakdown } from "@/lib/wallet";

type LedgerRow = {
  credits: number;
  source: "adjustment" | "admin_credit" | "referral" | "sponsored_task" | "watch_time";
};

type WithdrawalRow = {
  amount_credits: number;
  status: "approved" | "paid" | "pending" | "rejected";
};

export async function getWalletPageData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const [ledgerResult, withdrawalResult, profileResult, settings, financeSettings] = await Promise.all([
    supabase.from("credit_ledger").select("credits, source").eq("profile_id", user.id),
    supabase.from("withdrawals").select("amount_credits, status").eq("profile_id", user.id),
    supabase.from("profiles").select("bank_name, account_number, account_name").eq("id", user.id).single(),
    getPlatformSettings(),
    getActiveFinanceSettings(),
  ]);

  if (ledgerResult.error) {
    throw new Error(ledgerResult.error.message);
  }

  if (withdrawalResult.error) {
    throw new Error(withdrawalResult.error.message);
  }

  const wallet: WalletBreakdown = ((ledgerResult.data ?? []) as LedgerRow[]).reduce(
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
      totalWithdrawnCredits: 0,
      availableCredits: 0,
    },
  );

  wallet.totalWithdrawnCredits = ((withdrawalResult.data ?? []) as WithdrawalRow[])
    .filter((row) => row.status === "paid")
    .reduce((total, row) => total + row.amount_credits, 0);

  const pendingOrPaidCredits = ((withdrawalResult.data ?? []) as WithdrawalRow[])
    .filter((row) => row.status === "pending" || row.status === "approved" || row.status === "paid")
    .reduce((total, row) => total + row.amount_credits, 0);

  const unlockedGross = 
    (settings.referral_withdrawals_unlocked ? wallet.referralCredits : 0) +
    (settings.sponsored_withdrawals_unlocked ? wallet.sponsoredCredits : 0) +
    (settings.watch_time_withdrawals_unlocked ? wallet.watchTimeCredits : 0) +
    (settings.admin_credit_withdrawals_unlocked ? wallet.adminCredits : 0) +
    (settings.adjustment_withdrawals_unlocked ? wallet.adjustmentCredits : 0);

  wallet.availableCredits = Math.max(0, unlockedGross - pendingOrPaidCredits);

  return {
    financeSettings,
    settings,
    wallet,
    bankDetails: {
      bankName: profileResult.data?.bank_name ?? "",
      accountNumber: profileResult.data?.account_number ?? "",
      accountName: profileResult.data?.account_name ?? "",
    },
  };
}
