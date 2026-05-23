export type WalletBreakdown = {
  referralCredits: number;
  sponsoredCredits: number;
  totalWithdrawnCredits: number;
};

export function isThirdSaturday(date = new Date()) {
  const dayOfMonth = date.getDate();
  const isSaturday = date.getDay() === 6;

  return isSaturday && dayOfMonth >= 15 && dayOfMonth <= 21;
}

export function areSponsoredWithdrawalsUnlocked(adminUnlocked: boolean, date = new Date()) {
  return adminUnlocked || isThirdSaturday(date);
}

export function getAvailableWithdrawalCredits(wallet: WalletBreakdown, sponsoredUnlocked: boolean) {
  return wallet.referralCredits + (sponsoredUnlocked ? wallet.sponsoredCredits : 0);
}

export function getTotalCredits(wallet: WalletBreakdown) {
  return wallet.referralCredits + wallet.sponsoredCredits;
}
