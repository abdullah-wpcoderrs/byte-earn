import "server-only";

import { getActiveFinanceSettings } from "@/lib/finance-settings";
import { creditsToNaira } from "@/lib/money";
import { createAdminClient, hasSupabaseAdminKey } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

type ReferralAttributionSummaryRow = {
  reward_credits: number | null;
  status: "pending" | "qualified" | "rejected";
};

type ReferralLedgerRow = {
  credits: number | null;
};

type ReferralRewardRuleRow = {
  credits: number | null;
  enabled: boolean | null;
};

function sumCredits<T extends { credits?: number | null; reward_credits?: number | null }>(rows: T[], key: "credits" | "reward_credits") {
  return rows.reduce((total, row) => total + Number(row[key] ?? 0), 0);
}

export async function getReferralProgramSummary(profileId: string) {
  const supabase = hasSupabaseAdminKey() ? createAdminClient() : await createClient();
  const financeSettings = await getActiveFinanceSettings();

  const [rewardRuleResult, attributionResult, visitCountResult, referralLedgerResult] = await Promise.all([
    supabase
      .from("reward_rules")
      .select("credits, enabled")
      .eq("action", "referral_qualified")
      .maybeSingle(),
    supabase
      .from("referral_attributions")
      .select("status, reward_credits")
      .eq("referrer_id", profileId),
    supabase
      .from("referral_visits")
      .select("id", { count: "exact", head: true })
      .eq("referrer_id", profileId),
    supabase
      .from("credit_ledger")
      .select("credits")
      .eq("profile_id", profileId)
      .eq("source", "referral"),
  ]);

  if (rewardRuleResult.error) {
    throw new Error(rewardRuleResult.error.message);
  }

  if (attributionResult.error) {
    throw new Error(attributionResult.error.message);
  }

  if (visitCountResult.error) {
    throw new Error(visitCountResult.error.message);
  }

  if (referralLedgerResult.error) {
    throw new Error(referralLedgerResult.error.message);
  }

  const rewardRule = rewardRuleResult.data as ReferralRewardRuleRow | null;
  const referralBonusCredits = rewardRule?.enabled === false ? 0 : Number(rewardRule?.credits ?? 0);
  const attributions = (attributionResult.data ?? []) as ReferralAttributionSummaryRow[];
  const referralLedgerRows = (referralLedgerResult.data ?? []) as ReferralLedgerRow[];

  const pendingCount = attributions.filter((row) => row.status === "pending").length;
  const qualifiedCount = attributions.filter((row) => row.status === "qualified").length;
  const rejectedCount = attributions.filter((row) => row.status === "rejected").length;
  const rewardCreditsTotal = sumCredits(attributions, "reward_credits");
  const referralLedgerCredits = sumCredits(referralLedgerRows, "credits");

  return {
    financeSettings,
    referralBonusCredits,
    referralBonusNaira: creditsToNaira(referralBonusCredits, financeSettings),
    referralLedgerCredits,
    referralLedgerNaira: creditsToNaira(referralLedgerCredits, financeSettings),
    rewardCreditsTotal,
    rewardCreditsTotalNaira: creditsToNaira(rewardCreditsTotal, financeSettings),
    stats: {
      pendingCount,
      qualifiedCount,
      rejectedCount,
      totalAttributions: attributions.length,
      visitCount: visitCountResult.count ?? 0,
    },
  };
}
