import "server-only";

import { getActiveFinanceSettings } from "@/lib/finance-settings";
import { getPlatformSettings } from "@/lib/platform-settings";
import { createClient } from "@/lib/supabase/server";
import {
  buildWalletSourceBreakdown,
  getAvailableCredits,
  getLockedCredits,
  getWithdrawalStatusBreakdown,
  type WalletBreakdown,
} from "@/lib/wallet";

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
      lockedCredits: 0,
      reservedWithdrawalCredits: 0,
      sourceBreakdown: [],
      withdrawalStatusBreakdown: {
        approvedCredits: 0,
        paidCredits: 0,
        pendingCredits: 0,
        rejectedCredits: 0,
        reservedCredits: 0,
      },
    },
  );

  const withdrawals = (withdrawalResult.data ?? []) as WithdrawalRow[];
  const withdrawalStatusBreakdown = getWithdrawalStatusBreakdown(withdrawals);

  wallet.withdrawalStatusBreakdown = withdrawalStatusBreakdown;
  wallet.totalWithdrawnCredits = withdrawalStatusBreakdown.paidCredits;
  wallet.reservedWithdrawalCredits = withdrawalStatusBreakdown.reservedCredits;
  wallet.sourceBreakdown = buildWalletSourceBreakdown(wallet, settings);
  wallet.lockedCredits = getLockedCredits(wallet, settings);
  wallet.availableCredits = getAvailableCredits(wallet, settings, withdrawalStatusBreakdown);

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
