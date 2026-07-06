"use client";

import { CheckCircle2, Clock, History, Lock, LucideIcon, ShieldCheck, Users, Wallet, XCircle } from "lucide-react";
import { useMemo, useState } from "react";
import { requestWithdrawalAction } from "@/app/(app)/wallet/actions";
import { Modal } from "@/components/ui/modal";
import type { FinanceSettings } from "@/lib/finance-settings";
import { creditsToNaira, formatNaira, getNgnPerCredit } from "@/lib/money";
import type { WalletActivityItem } from "@/lib/wallet-data";
import type { WalletBreakdown } from "@/lib/wallet";
import { getTotalCredits } from "@/lib/wallet";

type WalletDashboardProps = {
  bankDetails: {
    bankName: string;
    accountNumber: string;
    accountName: string;
  };
  financeSettings: FinanceSettings;
  recentActivity: WalletActivityItem[];
  wallet: WalletBreakdown;
  withdrawalError?: string;
  withdrawalStatus?: string;
};

export function WalletDashboard({ bankDetails, financeSettings, recentActivity, wallet, withdrawalError, withdrawalStatus }: WalletDashboardProps) {
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

  const primaryAmount = useMemo(() => formatNaira(creditsToNaira(availableCredits, conversionRate)), [availableCredits, conversionRate]);
  const lifetimeAmount = useMemo(() => formatNaira(creditsToNaira(totalCredits, conversionRate)), [conversionRate, totalCredits]);
  const maxWithdrawalNaira = Math.floor(creditsToNaira(availableCredits, conversionRate));
  const ngnPerCredit = getNgnPerCredit(conversionRate);
  const minimumWithdrawalNaira = 1;
  const canRequestWithdrawal = maxWithdrawalNaira >= minimumWithdrawalNaira;
  const withdrawalProgress = Math.min(100, Math.round((maxWithdrawalNaira / minimumWithdrawalNaira) * 100));

  return (
    <>
      <div className="grid gap-4 pb-20">
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
          {/* Primary balance hero */}
          <div className="flex flex-col gap-5 md:flex-row md:items-start md:justify-between">
            <div>
              <div className="mb-3 flex items-center gap-2 text-cyan-100">
                <Wallet className="size-4" />
                <span className="font-semibold">Withdrawable balance</span>
              </div>
              <p className="text-[32px] font-semibold leading-tight">{primaryAmount}</p>
              <p className="mt-2 text-slate-400" title={`1 credit = ${formatNaira(ngnPerCredit)}`}>
                {availableCredits.toLocaleString("en-US")} credits &middot; 1 credit = {formatNaira(ngnPerCredit)}
              </p>
            </div>

            <div className="flex w-full flex-col gap-2 md:w-60">
              <button
                className="inline-flex min-h-11 items-center justify-center gap-2 rounded-[5px] bg-cyan-300 px-4 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:bg-white/[0.08] disabled:text-slate-500"
                disabled={!canRequestWithdrawal}
                onClick={() => setModalOpen(true)}
                type="button"
              >
                Request Withdrawal
              </button>
              {!canRequestWithdrawal && (
                <p className="text-center leading-5 text-slate-500">
                  Minimum {formatNaira(minimumWithdrawalNaira)} required.
                </p>
              )}
              {canRequestWithdrawal && (
                <div className="mt-1">
                  <div className="h-1 overflow-hidden rounded-full bg-white/10">
                    <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${withdrawalProgress}%` }} />
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Two-source earnings summary */}
          <div className="mt-5 grid grid-cols-2 gap-2 md:grid-cols-4">
            <EarningChip
              icon={Users}
              label="Referral earnings"
              value={formatNaira(creditsToNaira(wallet.referralCredits, conversionRate))}
              accent="emerald"
            />
            <EarningChip
              label="Sponsored earnings"
              value={formatNaira(creditsToNaira(wallet.sponsoredCredits, conversionRate))}
              accent="cyan"
            />
            <EarningChip
              label="Total withdrawn"
              value={formatNaira(creditsToNaira(wallet.totalWithdrawnCredits, conversionRate))}
              accent="slate"
            />
            <EarningChip
              icon={Lock}
              label="Locked earnings"
              value={formatNaira(creditsToNaira(wallet.lockedCredits, conversionRate))}
              accent="slate"
              note="Not yet withdrawable"
            />
          </div>

          {/* Earn source policy */}
          <div className="mt-4 flex flex-wrap gap-3 text-slate-400">
            <span className="inline-flex items-center gap-1.5 text-sm">
              <ShieldCheck className="size-3.5 text-emerald-400" />
              Referrals are always withdrawable
            </span>
            <span className="inline-flex items-center gap-1.5 text-sm">
              <Lock className="size-3.5 text-slate-500" />
              Sponsored earnings unlock per platform rules
            </span>
          </div>

          {/* Balance breakdown */}
          <details className="mt-4 rounded-[5px] border border-white/10 bg-white/[0.03] p-3">
            <summary className="flex cursor-pointer list-none items-center justify-between gap-3 font-semibold text-slate-100">
              Balance breakdown
              <span className="text-slate-400">{lifetimeAmount} lifetime</span>
            </summary>
            <div className="mt-4 grid gap-2 md:grid-cols-3">
              <BalanceDetail description="Pending and approved requests are reserved so the same credits cannot be withdrawn twice." label="Reserved withdrawals" value={wallet.reservedWithdrawalCredits} />
              <BalanceDetail description="Completed payouts that have already left your withdrawable balance." label="Paid withdrawals" value={wallet.totalWithdrawnCredits} />
              <BalanceDetail description="Earnings recorded in your wallet but not yet eligible for payout." label="Locked earnings" value={wallet.lockedCredits} />
            </div>
          </details>

          <div className="mt-4 flex justify-end">
            <a href="/wallet/history" className="text-sm font-semibold text-cyan-400 hover:text-cyan-300 underline underline-offset-4">
              View full history
            </a>
          </div>
        </section>

        <section className="glass p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-cyan-100">
              <History className="size-4" />
              <h2 className="font-semibold">Recent activity</h2>
            </div>
            <a href="/wallet/history" className="font-semibold text-cyan-300 hover:text-cyan-200">
              Receipts
            </a>
          </div>
          <div className="grid gap-2">
            {recentActivity.length === 0 ? (
              <div className="rounded-[5px] border border-white/10 bg-white/[0.035] p-4 text-slate-400">
                No activity yet. Earnings and withdrawal requests will appear here.
              </div>
            ) : (
              recentActivity.map((item) => <ActivityRow conversionRate={conversionRate} item={item} key={`${item.kind}:${item.id}`} />)
            )}
          </div>
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
              Rate: 1 credit = {formatNaira(ngnPerCredit)}.
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
          <button className="mt-2 inline-flex min-h-10 items-center justify-center rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950 transition hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-50" disabled={!canRequestWithdrawal}>
            Submit Request
          </button>
        </form>
      </Modal>
    </>
  );
}

function BalanceDetail({ description, label, value }: { description: string; label: string; value: number }) {
  return (
    <div className="rounded-[5px] border border-white/10 bg-white/[0.035] p-3">
      <p className="text-slate-400">{label}</p>
      <p className="mt-1 font-semibold text-slate-100">{value.toLocaleString("en-US")} credits</p>
      <p className="mt-2 leading-5 text-slate-500">{description}</p>
    </div>
  );
}

const SOURCE_LABELS: Record<string, string> = {
  referral: "Referral earnings",
  sponsored_task: "Sponsored earnings",
  watch_time: "Sponsored earnings",
  admin_credit: "Platform credit",
  adjustment: "Balance adjustment",
};

function EarningChip({ icon: Icon, label, value, accent, note }: { icon?: LucideIcon; label: string; value: string; accent: "emerald" | "cyan" | "slate"; note?: string }) {
  const accentClass = accent === "emerald" ? "text-emerald-300" : accent === "cyan" ? "text-cyan-300" : "text-slate-300";
  return (
    <div className="rounded-[5px] border border-white/10 bg-white/[0.035] p-3">
      {Icon && <Icon className={`mb-2 size-4 ${accentClass}`} />}
      <p className="text-slate-400">{label}</p>
      <p className={`mt-1 font-semibold ${accentClass}`}>{value}</p>
      {note && <p className="mt-1 text-slate-500">{note}</p>}
    </div>
  );
}

function ActivityRow({ conversionRate, item }: { conversionRate: Parameters<typeof creditsToNaira>[1]; item: WalletActivityItem }) {
  const isWithdrawal = item.kind === "withdrawal";
  const amount = isWithdrawal ? formatNaira(item.amountNaira) : formatNaira(creditsToNaira(item.amountCredits, conversionRate));
  const label = isWithdrawal ? "Withdrawal request" : (SOURCE_LABELS[item.source] ?? item.source.replace(/_/g, " "));

  return (
    <div className="flex items-center justify-between gap-3 rounded-[5px] border border-white/10 bg-white/[0.035] p-3">
      <div className="min-w-0">
        <p className="truncate font-semibold capitalize text-slate-100">{label}</p>
        <p className="mt-1 text-slate-400">{new Date(item.createdAt).toLocaleString()}</p>
      </div>
      <div className="text-right">
        <p className={isWithdrawal ? "font-semibold text-slate-100" : "font-semibold text-cyan-300"}>
          {isWithdrawal ? "-" : "+"}{amount}
        </p>
        <ActivityStatus status={item.status} />
      </div>
    </div>
  );
}

function ActivityStatus({ status }: { status: WalletActivityItem["status"] }) {
  if (status === "credited") {
    return <span className="mt-1 inline-flex items-center justify-end gap-1 text-emerald-300"><CheckCircle2 className="size-3.5" /> Credited</span>;
  }

  if (status === "pending") {
    return <span className="mt-1 inline-flex items-center justify-end gap-1 text-yellow-300"><Clock className="size-3.5" /> Pending</span>;
  }

  if (status === "approved") {
    return <span className="mt-1 inline-flex items-center justify-end gap-1 text-blue-300"><Clock className="size-3.5" /> Approved</span>;
  }

  if (status === "paid") {
    return <span className="mt-1 inline-flex items-center justify-end gap-1 text-emerald-300"><CheckCircle2 className="size-3.5" /> Paid</span>;
  }

  return <span className="mt-1 inline-flex items-center justify-end gap-1 text-red-300"><XCircle className="size-3.5" /> Rejected</span>;
}
