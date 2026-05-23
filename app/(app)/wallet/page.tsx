import { redirect } from "next/navigation";
import { WalletDashboard } from "@/components/wallet/wallet-dashboard";
import { getWalletPageData } from "@/lib/wallet-data";

export const dynamic = "force-dynamic";

export default async function WalletPage() {
  const data = await getWalletPageData();

  if (!data) {
    redirect("/");
  }

  return <WalletDashboard adminSponsoredUnlocked={data.adminSponsoredUnlocked} wallet={data.wallet} />;
}
