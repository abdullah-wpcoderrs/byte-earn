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

  const [ledgerResult, withdrawalResult, settings, financeSettings] = await Promise.all([
    supabase.from("credit_ledger").select("credits, source").eq("profile_id", user.id),
    supabase.from("withdrawals").select("amount_credits, status").eq("profile_id", user.id),
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

  wallet.totalWithdrawnCredits = ((withdrawalResult.data ?? []) as WithdrawalRow[])
    .filter((row) => row.status === "paid")
    .reduce((total, row) => total + row.amount_credits, 0);

  return {
    adminSponsoredUnlocked: settings.sponsored_withdrawals_unlocked,
    financeSettings,
    wallet,
  };
}
