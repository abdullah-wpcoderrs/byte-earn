import { RewardControls } from "./reward-controls";
import { getRewardConfiguration } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminRewardsPage() {
  const { financeSettings, rules } = await getRewardConfiguration();

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4 sm:p-5">
        <p className="text-muted">Server-side reward amounts and platform-wide credit conversion</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Reward controls</h1>
      </section>

      <RewardControls financeSettings={financeSettings} rules={rules} />
    </div>
  );
}
