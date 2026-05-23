import { WalletDashboard } from "@/components/wallet/wallet-dashboard";
import type { WalletBreakdown } from "@/lib/wallet";

const demoWallet: WalletBreakdown = {
  referralCredits: 285000,
  sponsoredCredits: 76000,
  totalWithdrawnCredits: 168000,
};

export default function WalletPage() {
  return <WalletDashboard adminSponsoredUnlocked={false} wallet={demoWallet} />;
}
