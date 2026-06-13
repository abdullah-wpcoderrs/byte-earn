export type WalletSourceKey = "adjustment" | "admin_credit" | "referral" | "sponsored_task" | "watch_time";

export type WalletSourceBreakdown = {
  credits: number;
  label: string;
  source: WalletSourceKey;
  withdrawable: boolean;
};

export type WithdrawalStatusBreakdown = {
  approvedCredits: number;
  paidCredits: number;
  pendingCredits: number;
  rejectedCredits: number;
  reservedCredits: number;
};

export type WalletUnlockSettings = {
  adjustment_withdrawals_unlocked: boolean;
  admin_credit_withdrawals_unlocked: boolean;
  referral_withdrawals_unlocked: boolean;
  sponsored_withdrawals_unlocked: boolean;
  watch_time_withdrawals_unlocked: boolean;
};

export type WalletSourceTotals = {
  adjustmentCredits: number;
  adminCredits: number;
  referralCredits: number;
  sponsoredCredits: number;
  watchTimeCredits: number;
};

export type WithdrawalStatusRow = {
  amount_credits: number;
  status: "approved" | "paid" | "pending" | "rejected";
};

export type WalletBreakdown = {
  adminCredits: number;
  adjustmentCredits: number;
  availableCredits: number;
  lockedCredits: number;
  referralCredits: number;
  reservedWithdrawalCredits: number;
  sourceBreakdown: WalletSourceBreakdown[];
  sponsoredCredits: number;
  totalWithdrawnCredits: number;
  watchTimeCredits: number;
  withdrawalStatusBreakdown: WithdrawalStatusBreakdown;
};

export function buildWalletSourceBreakdown(wallet: WalletSourceTotals, settings: WalletUnlockSettings) {
  return [
    {
      credits: wallet.referralCredits,
      label: "Referral",
      source: "referral",
      withdrawable: settings.referral_withdrawals_unlocked,
    },
    {
      credits: wallet.sponsoredCredits,
      label: "Sponsored tasks",
      source: "sponsored_task",
      withdrawable: settings.sponsored_withdrawals_unlocked,
    },
    {
      credits: wallet.watchTimeCredits,
      label: "Watch time",
      source: "watch_time",
      withdrawable: settings.watch_time_withdrawals_unlocked,
    },
    {
      credits: wallet.adminCredits,
      label: "Admin credit",
      source: "admin_credit",
      withdrawable: settings.admin_credit_withdrawals_unlocked,
    },
    {
      credits: wallet.adjustmentCredits,
      label: "Adjustment",
      source: "adjustment",
      withdrawable: settings.adjustment_withdrawals_unlocked,
    },
  ] satisfies WalletSourceBreakdown[];
}

export function getWithdrawalStatusBreakdown(withdrawals: WithdrawalStatusRow[]) {
  const breakdown = withdrawals.reduce<WithdrawalStatusBreakdown>(
    (current, row) => {
      if (row.status === "pending") current.pendingCredits += row.amount_credits;
      if (row.status === "approved") current.approvedCredits += row.amount_credits;
      if (row.status === "paid") current.paidCredits += row.amount_credits;
      if (row.status === "rejected") current.rejectedCredits += row.amount_credits;
      return current;
    },
    {
      approvedCredits: 0,
      paidCredits: 0,
      pendingCredits: 0,
      rejectedCredits: 0,
      reservedCredits: 0,
    },
  );

  breakdown.reservedCredits = breakdown.pendingCredits + breakdown.approvedCredits;
  return breakdown;
}

export function getUnlockedGrossCredits(wallet: WalletSourceTotals, settings: WalletUnlockSettings) {
  return buildWalletSourceBreakdown(wallet, settings)
    .filter((source) => source.withdrawable)
    .reduce((total, source) => total + source.credits, 0);
}

export function getLockedCredits(wallet: WalletSourceTotals, settings: WalletUnlockSettings) {
  return buildWalletSourceBreakdown(wallet, settings)
    .filter((source) => !source.withdrawable)
    .reduce((total, source) => total + source.credits, 0);
}

export function getReservedOrPaidWithdrawalCredits(withdrawalStatusBreakdown: WithdrawalStatusBreakdown) {
  return withdrawalStatusBreakdown.reservedCredits + withdrawalStatusBreakdown.paidCredits;
}

export function getAvailableCredits(wallet: WalletSourceTotals, settings: WalletUnlockSettings, withdrawalStatusBreakdown: WithdrawalStatusBreakdown) {
  return Math.max(0, getUnlockedGrossCredits(wallet, settings) - getReservedOrPaidWithdrawalCredits(withdrawalStatusBreakdown));
}

export function getTotalCredits(wallet: WalletBreakdown) {
  return (
    wallet.referralCredits +
    wallet.sponsoredCredits +
    wallet.watchTimeCredits +
    wallet.adminCredits +
    wallet.adjustmentCredits
  );
}
