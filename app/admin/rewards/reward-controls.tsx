"use client";

import { Coins, Pencil, Save, Settings2 } from "lucide-react";
import { useState } from "react";
import {
  updateFinanceSettingsAction,
  updateRewardRuleAction,
} from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { TextInput } from "@/components/ui/input";
import { Modal } from "@/components/ui/modal";
import type { FinanceSettings } from "@/lib/finance-settings";
import { formatNaira, formatUsd, getNgnPerCredit, getUsdPerCredit } from "@/lib/money";

type RewardRule = {
  action: string;
  credits: number;
  description: string;
  enabled: boolean;
  id: string;
  label: string;
  maxCreditsPerAction: number | null;
  minCreditsPerAction: number;
  updatedAt: string | null;
};

type RewardControlsProps = {
  financeSettings: FinanceSettings;
  rules: RewardRule[];
};

export function RewardControls({ financeSettings, rules }: RewardControlsProps) {
  const [selectedRule, setSelectedRule] = useState<RewardRule | null>(null);
  const [financeOpen, setFinanceOpen] = useState(false);
  const conversionRate = {
    creditsPerUnit: financeSettings.creditsPerUnit,
    ngnPerUsd: financeSettings.ngnPerUsd,
    usdPerUnit: financeSettings.usdPerUnit,
  };
  const usdPerCredit = getUsdPerCredit(conversionRate);
  const ngnPerCredit = getNgnPerCredit(conversionRate);

  return (
    <>
      <section className="grid gap-4 xl:grid-cols-[1.1fr_0.9fr]">
        <div className="glass p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-cyan-100">
              <Coins className="size-4" />
              <h2 className="text-base font-semibold">Reward rules</h2>
            </div>
          </div>
          <div className="grid gap-3">
            {rules.map((rule) => (
              <button
                className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3 text-left transition hover:border-cyan-200/35 hover:bg-cyan-300/8"
                key={rule.id}
                onClick={() => setSelectedRule(rule)}
                type="button"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-semibold text-slate-100">{rule.label}</p>
                    <p className="mt-1 text-slate-400">{rule.description}</p>
                    <p className="mt-2 text-[10px] uppercase tracking-[0.16em] text-slate-500">{rule.action}</p>
                  </div>
                  <span className={`rounded-[5px] px-2 py-1 font-semibold ${rule.enabled ? "bg-emerald-300/12 text-emerald-100" : "bg-slate-500/12 text-slate-400"}`}>
                    {rule.enabled ? "Enabled" : "Disabled"}
                  </span>
                </div>
                <div className="mt-3 grid gap-2 text-slate-300 sm:grid-cols-3">
                  <span>{rule.credits.toLocaleString("en-US")} credits</span>
                  <span>Min {rule.minCreditsPerAction.toLocaleString("en-US")}</span>
                  <span>Max {rule.maxCreditsPerAction ? rule.maxCreditsPerAction.toLocaleString("en-US") : "No cap"}</span>
                </div>
                <div className="mt-3 flex items-center justify-between gap-2 text-slate-500">
                  <span>Updated {rule.updatedAt ? new Date(rule.updatedAt).toLocaleDateString("en-NG") : "not yet"}</span>
                  <span className="inline-flex items-center gap-1 text-cyan-100">
                    <Pencil className="size-3.5" />
                    Edit
                  </span>
                </div>
              </button>
            ))}
          </div>
        </div>

        <div className="glass grid content-start gap-3 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-cyan-100">
              <Settings2 className="size-4" />
              <h2 className="text-base font-semibold">Credit conversion</h2>
            </div>
            <Button icon={<Pencil className="size-4" />} onClick={() => setFinanceOpen(true)} type="button" variant="secondary">
              Edit
            </Button>
          </div>

          <div className="rounded-[5px] border border-cyan-200/15 bg-cyan-300/10 p-3 text-cyan-50">
            <p className="font-semibold">Current rate preview</p>
            <p className="mt-2">{financeSettings.creditsPerUnit.toLocaleString("en-US")} credits = {formatUsd(financeSettings.usdPerUnit)}</p>
            <p className="mt-1">$1.00 = {formatNaira(financeSettings.ngnPerUsd)}</p>
            <p className="mt-1">1 credit = {formatUsd(usdPerCredit)} / {formatNaira(ngnPerCredit)}</p>
          </div>
        </div>
      </section>

      <Modal onClose={() => setSelectedRule(null)} open={Boolean(selectedRule)} title={selectedRule ? `Edit ${selectedRule.label}` : "Edit reward"}>
        {selectedRule ? (
          <form action={updateRewardRuleAction} className="grid gap-3">
            <input name="ruleId" type="hidden" value={selectedRule.id} />
            <TextInput defaultValue={selectedRule.credits} inputMode="numeric" label="Default credits" name="credits" />
            <TextInput defaultValue={selectedRule.minCreditsPerAction} inputMode="numeric" label="Minimum credits per action" name="minCreditsPerAction" />
            <TextInput defaultValue={selectedRule.maxCreditsPerAction ?? ""} inputMode="numeric" label="Maximum credits per action" name="maxCreditsPerAction" placeholder="No cap" />
            <label className="flex min-h-9 items-center justify-between gap-3 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5">
              <span className="font-medium text-slate-200">Enabled</span>
              <input className="size-4 accent-cyan-300" defaultChecked={selectedRule.enabled} name="enabled" type="checkbox" />
            </label>
            <Button icon={<Save className="size-4" />} type="submit">
              Save reward
            </Button>
          </form>
        ) : null}
      </Modal>

      <Modal onClose={() => setFinanceOpen(false)} open={financeOpen} title="Edit credit conversion">
        <form action={updateFinanceSettingsAction} className="grid gap-3">
          <TextInput defaultValue={financeSettings.creditsPerUnit} inputMode="numeric" label="Credits per unit" name="creditsPerUnit" />
          <TextInput defaultValue={financeSettings.usdPerUnit} inputMode="decimal" label="USD per unit" name="usdPerUnit" step="0.0001" type="number" />
          <TextInput defaultValue={financeSettings.ngnPerUsd} inputMode="decimal" label="NGN per USD" name="ngnPerUsd" step="0.0001" type="number" />
          <Button icon={<Save className="size-4" />} type="submit">
            Save conversion rate
          </Button>
        </form>
      </Modal>
    </>
  );
}
