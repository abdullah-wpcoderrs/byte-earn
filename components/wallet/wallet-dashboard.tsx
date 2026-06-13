"use client";

import { Banknote, ChartNoAxesCombined, ChevronDown, Clapperboard, Lock, ShieldCheck, Users, Wallet } from "lucide-react";
import { useMemo, useState } from "react";
import { requestWithdrawalAction } from "@/app/(app)/wallet/actions";
import { Modal } from "@/components/ui/modal";
import type { FinanceSettings } from "@/lib/finance-settings";
import { creditsToNaira, creditsToUsd, formatNaira, formatUsd } from "@/lib/money";
import type { WalletBreakdown } from "@/lib/wallet";
import { getTotalCredits } from "@/lib/wallet";

type FiatMode = "NGN" | "USD";

type WalletDashboardProps = {
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  financeSettings: FinanceSettings;
  wallet: WalletBreakdown;
  withdrawalError?: string;
  withdrawalStatus?: string;
};

export function WalletDashboard({ bankDetails, financeSettings, wallet, withdrawalError, withdrawalStatus }: WalletDashboardProps) {
  const [fiatMode, setFiatMode] = useState<FiatMode>("NGN");
  const [modalOpen, setModalOpen] = useState(false);
  const totalCredits = getTotalCredits(wallet);
  const availableCredits = wallet.availableCredits;
  const hasCompleteBankDetails = Boolean(bankDetails.bankName && bankDetails.accountNumber && bankDetails.accountName);
  const conversionRate = useMemo(
    () => ({
      creditsPerUnit: financeSettings.creditsPerUnit,
      ngnPerUsd: financeSettings.ngnPerUsd,
      usdPerUnit: financeSettings.usdPerUnit,
    }),
    [financeSettings.creditsPerUnit, financeSettings.ngnPerUsd, financeSettings.usdPerUnit],
  );

  const primaryAmount = useMemo(() => {
    const amount = fiatMode === "NGN" ? creditsToNaira(availableCredits, conversionRate) : creditsToUsd(availableCredits, conversionRate);
    return fiatMode === "NGN" ? formatNaira(amount) : formatUsd(amount);
  }, [availableCredits, conversionRate, fiatMode]);
  const lifetimeAmount = useMemo(() => formatNaira(creditsToNaira(totalCredits, conversionRate)), [conversionRate, totalCredits]);
  const maxWithdrawalNaira = Math.floor(creditsToNaira(availableCredits, conversionRate));

  const kpis = [
    {
      icon: Users,
      label: "Referral Earnings",
      meta: "From referring friends",
      value: formatNaira(creditsToNaira(wallet.referralCredits, conversionRate)),
    },
    {
      icon: Clapperboard,
      label: "Sponsored Tasks Earnings",
      meta: "From completing tasks",
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
        {withdrawalError ? (
          <div className="rounded-[5px] border border-red-500/20 bg-red-500/10 p-3 text-red-200 text-xs font-semibold">
            {withdrawalError === "invalid_amount" && "Enter a valid withdrawal amount."}
            {withdrawalError === "invalid_bank_name" && "Bank name must be between 2 and 100 characters."}
            {withdrawalError === "invalid_account_number" && "Account number must be numeric and exactly 10 digits."}
            {withdrawalError === "invalid_account_name" && "Account name must be between 2 and 100 characters."}
            {withdrawalError === "insufficient_available_balance" && "You do not have enough available balance for this request."}
            {!["invalid_amount", "invalid_bank_name", "invalid_account_number", "invalid_account_name", "insufficient_available_balance"].includes(withdrawalError) && decodeURIComponent(withdrawalError)}
          </div>
        ) : null}
        {withdrawalStatus === "requested" ? (
          <div className="rounded-[5px] border border-emerald-500/20 bg-emerald-500/10 p-3 text-emerald-200 text-xs font-semibold">
            Withdrawal request submitted successfully.
          </div>
        ) : null}
        <section className="glass-strong p-4">
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-cyan-100">
                <Wallet className="size-4" />
                <span className="font-semibold">Available for withdrawal</span>
              </div>
              <p className="text-[28px] font-semibold leading-tight">{primaryAmount}</p>
              <p className="mt-2 text-muted">
                {availableCredits.toLocaleString("en-US")} withdrawable credits. Lifetime earnings: {totalCredits.toLocaleString("en-US")} credits ({lifetimeAmount}).
              </p>
              <p className="mt-2 max-w-2xl leading-5 text-slate-400">
                Available balance excludes locked earning sources plus pending, approved, and paid withdrawals.
              </p>
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
                disabled={availableCredits <= 0}
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
            <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3 text-slate-300">
              <Lock className="mb-3 size-5" />
              Some earnings may be locked according to platform rules.
            </div>
          </div>

          <div className="mt-4 grid gap-2 md:grid-cols-3">
            <BalanceDetail label="Reserved withdrawals" value={wallet.reservedWithdrawalCredits} />
            <BalanceDetail label="Paid withdrawals" value={wallet.totalWithdrawnCredits} />
            <BalanceDetail label="Locked earnings" value={wallet.lockedCredits} />
          </div>

          <div className="mt-4 grid gap-2">
            {wallet.sourceBreakdown.map((source) => (
              <div className="flex items-center justify-between gap-3 rounded-[5px] border border-white/10 bg-white/[0.035] p-3" key={source.source}>
                <div>
                  <p className="font-semibold text-slate-100">{source.label}</p>
                  <p className={source.withdrawable ? "text-emerald-300" : "text-slate-400"}>
                    {source.withdrawable ? "Withdrawable" : "Locked"}
                  </p>
                </div>
                <div className="text-right">
                  <p className="font-semibold text-slate-100">{source.credits.toLocaleString("en-US")} credits</p>
                  <p className="text-slate-400">{formatNaira(creditsToNaira(source.credits, conversionRate))}</p>
                </div>
              </div>
            ))}
          </div>
          
          <div className="mt-4 flex justify-end">
             <a href="/wallet/history" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-4">
               View Transaction & Withdrawal History
             </a>
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
          <div className="rounded-[5px] border border-cyan-200/20 bg-cyan-300/10 p-3 text-cyan-50">
            <p className="font-semibold">{formatNaira(maxWithdrawalNaira)} available</p>
            <p className="mt-1 leading-5 text-cyan-50/80">
              {availableCredits.toLocaleString("en-US")} credits are withdrawable. Reserved withdrawals: {wallet.reservedWithdrawalCredits.toLocaleString("en-US")} credits.
            </p>
          </div>
          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Amount to Withdraw</span>
            <input className="min-h-9 border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/55" max={maxWithdrawalNaira || 1} min="1" name="amountNaira" placeholder="5000" required type="number" />
            <span className="text-slate-400">
              Rate: {financeSettings.creditsPerUnit.toLocaleString("en-US")} credits = {formatUsd(financeSettings.usdPerUnit)} = {formatNaira(financeSettings.usdPerUnit * financeSettings.ngnPerUsd)}.
            </span>
          </label>
          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Bank Name</span>
            <input defaultValue={bankDetails.bankName} className="min-h-9 border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/55" maxLength={100} minLength={2} name="bankName" placeholder="Access Bank" required type="text" />
          </label>
          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Account Number</span>
            <input defaultValue={bankDetails.accountNumber} className="min-h-9 border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/55" maxLength={10} minLength={10} name="accountNumber" pattern="[0-9]{10}" placeholder="0123456789" required type="text" />
          </label>
          <label className="grid gap-2">
            <span className="font-medium text-slate-200">Account Name</span>
            <input defaultValue={bankDetails.accountName} className="min-h-9 border border-white/10 bg-white/[0.055] px-2.5 text-white outline-none placeholder:text-slate-500 focus:border-cyan-200/55" maxLength={100} minLength={2} name="accountName" placeholder="Amina Kareem" required type="text" />
          </label>
          <p className="leading-5 text-slate-400">
            Bank details are prefilled from your profile. Submitted withdrawals enter pending review before payout.
          </p>
          {!hasCompleteBankDetails ? (
            <a className="inline-flex min-h-10 items-center justify-center rounded-[5px] border border-white/10 bg-white/[0.055] px-3 font-semibold text-slate-100 transition hover:bg-white/10" href="/profile">
              Update payout profile
            </a>
          ) : null}
          <button className="mt-2 inline-flex min-h-10 items-center justify-center rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50" disabled={availableCredits <= 0}>
            Submit Request
          </button>
        </form>
      </Modal>
    </>
  );
}

function BalanceDetail({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-[5px] border border-white/10 bg-white/[0.035] p-3">
      <p className="text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-100">{value.toLocaleString("en-US")} credits</p>
    </div>
  );
}
