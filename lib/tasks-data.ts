import "server-only";

import { createClient } from "@/lib/supabase/server";
import { sponsoredTasks, type SponsoredTask } from "@/lib/tasks";

type RewardRuleRow = {
  action: string;
  credits: number;
  enabled: boolean;
  max_credits_per_action: number | null;
};

function clampCredits(credits: number, maxCredits: number | null) {
  if (maxCredits === null) return Math.max(0, credits);
  return Math.min(Math.max(0, credits), maxCredits);
}

async function getTaskRewardRules() {
  const supabase = await createClient();
  const { data, error } = await supabase
    .from("reward_rules")
    .select("action, credits, enabled, max_credits_per_action")
    .in("action", ["sponsored_task_milestone", "watch_time_milestone"]);

  if (error) {
    if (error.message.includes("reward_rules")) {
      return new Map<string, RewardRuleRow>();
    }
    throw new Error(error.message);
  }

  return new Map((data ?? []).map((rule) => [rule.action, rule as RewardRuleRow]));
}

export async function getConfiguredSponsoredTasks(dailyCapSeconds: number): Promise<SponsoredTask[]> {
  const rules = await getTaskRewardRules();
  const sponsoredRule = rules.get("sponsored_task_milestone");
  const watchTimeRule = rules.get("watch_time_milestone");
  const sponsoredCredits =
    sponsoredRule?.enabled && sponsoredRule.credits > 0
      ? clampCredits(sponsoredRule.credits, sponsoredRule.max_credits_per_action)
      : null;
  const watchTimeBonusCredits =
    watchTimeRule?.enabled && watchTimeRule.credits > 0
      ? clampCredits(watchTimeRule.credits, watchTimeRule.max_credits_per_action)
      : 0;

  return sponsoredTasks.map((task) => ({
    ...task,
    dailyCapSeconds,
    milestones: task.milestones.map((milestone) => ({
      ...milestone,
      credits: sponsoredCredits ?? milestone.credits,
    })),
    watchTimeBonusCredits,
  }));
}
