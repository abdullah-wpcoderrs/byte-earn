import "server-only";

import { desc, eq } from "drizzle-orm";
import { creditLedger, platformSettings, withdrawals } from "@/db/schema";
import { getDb } from "@/lib/db";
import { createClient } from "@/lib/supabase/server";
import type { WalletBreakdown } from "@/lib/wallet";

export async function getWalletPageData() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    return null;
  }

  const db = getDb();
  const [ledgerRows, withdrawalRows, settings] = await Promise.all([
    db
      .select({
        credits: creditLedger.credits,
        source: creditLedger.source,
      })
      .from(creditLedger)
      .where(eq(creditLedger.profileId, user.id)),
    db
      .select({
        amountCredits: withdrawals.amountCredits,
        status: withdrawals.status,
      })
      .from(withdrawals)
      .where(eq(withdrawals.profileId, user.id)),
    db.query.platformSettings.findFirst({
      orderBy: desc(platformSettings.updatedAt),
    }),
  ]);

  const wallet: WalletBreakdown = ledgerRows.reduce(
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

  wallet.totalWithdrawnCredits = withdrawalRows
    .filter((row) => row.status === "paid")
    .reduce((total, row) => total + row.amountCredits, 0);

  return {
    adminSponsoredUnlocked: settings?.sponsoredWithdrawalsUnlocked ?? false,
    wallet,
  };
}
