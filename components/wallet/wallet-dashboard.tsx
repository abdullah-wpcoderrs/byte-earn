"use client";

import { Banknote, ChartNoAxesCombined, ChevronDown, Clapperboard, Lock, ShieldCheck, Users, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { requestWithdrawalAction } from "@/app/(app)/wallet/actions";
import { Modal } from "@/components/ui/modal";
import type { FinanceSettings } from "@/lib/finance-settings";
import { creditsToNaira, creditsToUsd, formatNaira, formatUsd } from "@/lib/money";
import type { WalletBreakdown } from "@/lib/wallet";
import { areSponsoredWithdrawalsUnlocked, getAvailableWithdrawalCredits, getTotalCredits } from "@/lib/wallet";

type FiatMode = "NGN" | "USD";

type WalletDashboardProps = {
  adminSponsoredUnlocked: boolean;
  financeSettings: FinanceSettings;
  wallet: WalletBreakdown;
};

export function WalletDashboard({ adminSponsoredUnlocked, financeSettings, wallet }: WalletDashboardProps) {
  const [fiatMode, setFiatMode] = useState<FiatMode>("NGN");
  const [modalOpen, setModalOpen] = useState(false);
  const sponsoredUnlocked = areSponsoredWithdrawalsUnlocked(adminSponsoredUnlocked);
  const totalCredits = getTotalCredits(wallet);
  const availableCredits = getAvailableWithdrawalCredits(wallet, sponsoredUnlocked);
  const conversionRate = {
    creditsPerUnit: financeSettings.creditsPerUnit,
    ngnPerUsd: financeSettings.ngnPerUsd,
    usdPerUnit: financeSettings.usdPerUnit,
  };

  const primaryAmount = useMemo(() => {
    const amount = fiatMode === "NGN" ? creditsToNaira(totalCredits, conversionRate) : creditsToUsd(totalCredits, conversionRate);
    return fiatMode === "NGN" ? formatNaira(amount) : formatUsd(amount);
  }, [conversionRate, fiatMode, totalCredits]);

  const kpis = [
    {
      icon: Users,
      label: "Referral Earnings",
      meta: "Unlocked anytime",
      value: formatNaira(creditsToNaira(wallet.referralCredits, conversionRate)),
    },
    {
      icon: Clapperboard,
      label: "Sponsored Tasks Earnings",
      meta: sponsoredUnlocked ? "Unlocked for payout" : "Locked until admin unlock or third Saturday",
      value: formatNaira(creditsToNaira(wallet.sponsoredCredits, conversionRate)),
    },
    {
      icon: Banknote,
      label: "Available for Withdrawal",
      meta: `${availableCredits.toLocaleString("en-US")} credits`,
      value: formatNaira(creditsToNaira(availableCredits, conversionRate)),
    },
    {
      icon: ChartNoAxesCombined,
      label: "Total Withdrawn",
      meta: `${wallet.totalWithdrawnCredits.toLocaleString("en-US")} credits`,
      value: formatNaira(creditsToNaira(wallet.totalWithdrawnCredits, conversionRate)),
    },
  ];

  return (
    <>
      <div className="grid gap-4">
        <section className="glass-strong p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-cyan-100">
                <Wallet className="size-4" />
                <span className="font-semibold">Master balance</span>
              </div>
              <p className="text-[28px] font-semibold leading-tight">{primaryAmount}</p>
              <p className="mt-2 text-muted">{totalCredits.toLocaleString("en-US")} credits</p>
            </div>

            <div className="flex flex-col gap-2 sm:flex-row">
              <label className="relative">
                <select
                  className="min-h-9 appearance-none rounded-[5px] border border-white/10 bg-white/[0.065] px-2.5 pr-8 font-semibold text-slate-100 outline-none"
                  onChange={(event) => setFiatMode(event.target.value as FiatMode)}
                  value={fiatMode}
                >
                  <option value="NGN">Naira</option>
                  <option value="USD">USD</option>
                </select>
                <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-300" />
              </label>
              <button
                className="inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
                onClick={() => setModalOpen(true)}
                type="button"
              >
                Request Withdrawal
              </button>
            </div>
          </div>

          <div className="mt-5 grid gap-2 md:grid-cols-2">
            <div className="rounded-[5px] border border-emerald-300/20 bg-emerald-300/10 p-3 text-emerald-50">
              <ShieldCheck className="mb-3 size-5" />
              Referral earnings are withdrawable at any time.
            </div>
            <div className={`rounded-[5px] border p-3 ${sponsoredUnlocked ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-50" : "border-white/10 bg-white/[0.045] text-slate-400"}`}>
              <Lock className="mb-3 size-5" />
              Sponsored earnings {sponsoredUnlocked ? "are currently unlocked." : "remain locked for now."}
            </div>
          </div>
        </section>

        <section className="grid gap-3 md:grid-cols-2 xl:grid-cols-4">
          {kpis.map((kpi) => (
            <div className="glass p-4" key={kpi.label}>
              <kpi.icon className="mb-4 size-5 text-cyan-200" />
              <p className="text-muted">{kpi.label}</p>
              <p className="mt-2 text-base font-semibold">{kpi.value}</p>
              <p className="mt-1 leading-5 text-slate-400">{kpi.meta}</p>
            </div>
          ))}
        </section>
      </div>

      <Modal onClose={() => setModalOpen(false)} open={modalOpen} title="Request Withdrawal">
        <form action={requestWithdrawalAction} className="grid gap-3">
          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Amount to Withdraw</span>
            <input className="min-h-9 border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/55" name="amountNaira" placeholder="5000" type="number" />
          </label>
          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Bank Name</span>
            <input className="min-h-9 border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/55" name="bankName" placeholder="Access Bank" type="text" />
          </label>
          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Account Number</span>
            <input className="min-h-9 border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/55" name="accountNumber" placeholder="0123456789" type="text" />
          </label>
          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Account Name</span>
            <input className="min-h-9 border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/55" name="accountName" placeholder="Amina Kareem" type="text" />
          </label>
          <button className="mt-2 inline-flex min-h-10 items-center justify-center rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950 transition hover:bg-cyan-200">
            Submit Request
          </button>
        </form>
      </Modal>
    </>
  );
}
