export type WalletBreakdown = {
  referralCredits: number;
  sponsoredCredits: number;
  watchTimeCredits: number;
  adminCredits: number;
  adjustmentCredits: number;
  totalWithdrawnCredits: number;
  availableCredits: number;
};

export function getTotalCredits(wallet: WalletBreakdown) {
  return (
    wallet.referralCredits +
    wallet.sponsoredCredits +
    wallet.watchTimeCredits +
    wallet.adminCredits +
    wallet.adjustmentCredits
  );
}
