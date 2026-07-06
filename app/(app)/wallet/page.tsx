import { redirect } from "next/navigation";
import { WalletDashboard } from "@/components/wallet/wallet-dashboard";
import { getWalletPageData } from "@/lib/wallet-data";

export const dynamic = "force-dynamic";

export default async function WalletPage({
  searchParams,
}: {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
}) {
  const params = await searchParams;
  const withdrawalError = typeof params.withdrawal_error === "string" ? params.withdrawal_error : undefined;
  const withdrawalStatus = typeof params.withdrawal === "string" ? params.withdrawal : undefined;
  const data = await getWalletPageData();

  if (!data) {
    redirect("/");
  }

  return (
    <WalletDashboard
      bankDetails={data.bankDetails}
      financeSettings={data.financeSettings}
      recentActivity={data.recentActivity}
      wallet={data.wallet}
      withdrawalError={withdrawalError}
      withdrawalStatus={withdrawalStatus}
    />
  );
}
