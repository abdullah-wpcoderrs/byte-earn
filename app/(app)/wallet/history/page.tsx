import { ArrowLeft, CheckCircle2, Clock, XCircle } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveFinanceSettings } from "@/lib/finance-settings";
import { creditsToNaira, formatNaira, formatUsd } from "@/lib/money";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function WalletHistoryPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  if (!user) {
    redirect("/");
  }

  const [financeSettings, ledgerResult, withdrawalResult] = await Promise.all([
    getActiveFinanceSettings(),
    supabase
      .from("credit_ledger")
      .select("id, source, credits, description, created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(100),
    supabase
      .from("withdrawals")
      .select("id, amount_credits, amount_naira, status, review_note, created_at")
      .eq("profile_id", user.id)
      .order("created_at", { ascending: false })
      .limit(50),
  ]);

  if (ledgerResult.error) throw new Error(ledgerResult.error.message);
  if (withdrawalResult.error) throw new Error(withdrawalResult.error.message);

  const conversionRate = {
    creditsPerUnit: financeSettings.creditsPerUnit,
    ngnPerUsd: financeSettings.ngnPerUsd,
    usdPerUnit: financeSettings.usdPerUnit,
  };

  return (
    <div className="grid gap-6 pb-20">
      <div className="flex items-center gap-3">
        <Link href="/wallet" className="flex size-9 items-center justify-center rounded-full bg-slate-800/50 text-slate-300 transition hover:bg-slate-800 hover:text-white">
          <ArrowLeft className="size-5" />
        </Link>
        <h1 className="text-2xl font-bold text-slate-100">Wallet History</h1>
      </div>

      <section className="rounded-[5px] border border-white/10 bg-white/[0.045] p-4">
        <p className="font-semibold text-slate-100">Active conversion rate</p>
        <p className="mt-1 text-slate-300">
          {financeSettings.creditsPerUnit.toLocaleString("en-US")} credits = {formatUsd(financeSettings.usdPerUnit)} = {formatNaira(financeSettings.usdPerUnit * financeSettings.ngnPerUsd)}
        </p>
      </section>

      <section className="glass-strong overflow-hidden rounded-xl">
        <div className="border-b border-white/5 bg-slate-900/50 p-4 font-semibold text-slate-200">
          Withdrawal Requests
        </div>
        <div>
          {withdrawalResult.data.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No withdrawals found.</div>
          ) : (
            <>
              <div className="grid gap-2 p-3 md:hidden">
                {withdrawalResult.data.map((withdrawal) => (
                  <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3" key={withdrawal.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold text-slate-100">{formatNaira(Number(withdrawal.amount_naira))}</p>
                        <p className="mt-1 text-slate-400">{withdrawal.amount_credits.toLocaleString("en-US")} credits</p>
                      </div>
                      <WithdrawalStatusBadge status={withdrawal.status} />
                    </div>
                    <div className="mt-3 grid gap-2 text-slate-300">
                      <p>{new Date(withdrawal.created_at).toLocaleDateString()}</p>
                      <p className="break-words text-slate-400">{withdrawal.review_note || "No review note."}</p>
                    </div>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/40 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Amount</th>
                      <th className="px-4 py-3">Status</th>
                      <th className="px-4 py-3">Note</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {withdrawalResult.data.map((withdrawal) => (
                      <tr key={withdrawal.id} className="transition-colors hover:bg-white/[0.02]">
                        <td className="whitespace-nowrap px-4 py-3">
                          {new Date(withdrawal.created_at).toLocaleDateString()}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 font-medium text-slate-200">
                          {formatNaira(Number(withdrawal.amount_naira))}
                          <div className="text-xs text-slate-500">{withdrawal.amount_credits} credits</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3">
                          <WithdrawalStatusBadge status={withdrawal.status} />
                        </td>
                        <td className="px-4 py-3 text-slate-400">
                          {withdrawal.review_note || "-"}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>

      <section className="glass-strong overflow-hidden rounded-xl">
        <div className="border-b border-white/5 bg-slate-900/50 p-4 font-semibold text-slate-200">
          Transaction Ledger
        </div>
        <div>
          {ledgerResult.data.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No transactions found.</div>
          ) : (
            <>
              <div className="grid gap-2 p-3 md:hidden">
                {ledgerResult.data.map((ledger) => (
                  <div className="rounded-[5px] border border-white/10 bg-white/[0.045] p-3" key={ledger.id}>
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <p className="font-semibold capitalize text-slate-100">{ledger.source.replace("_", " ")}</p>
                        <p className="mt-1 break-words text-slate-400">{ledger.description}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-semibold text-cyan-300">+{ledger.credits.toLocaleString("en-US")}</p>
                        <p className="mt-1 text-slate-400">{formatNaira(creditsToNaira(ledger.credits, conversionRate))}</p>
                      </div>
                    </div>
                    <p className="mt-3 text-slate-500">{new Date(ledger.created_at).toLocaleString()}</p>
                  </div>
                ))}
              </div>
              <div className="hidden overflow-x-auto md:block">
                <table className="w-full text-left text-sm text-slate-300">
                  <thead className="bg-slate-900/40 text-xs uppercase text-slate-400">
                    <tr>
                      <th className="px-4 py-3">Date</th>
                      <th className="px-4 py-3">Description</th>
                      <th className="px-4 py-3 text-right">Credits</th>
                      <th className="px-4 py-3 text-right">Value</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-white/5">
                    {ledgerResult.data.map((ledger) => (
                      <tr key={ledger.id} className="transition-colors hover:bg-white/[0.02]">
                        <td className="whitespace-nowrap px-4 py-3 text-slate-400">
                          {new Date(ledger.created_at).toLocaleString()}
                        </td>
                        <td className="px-4 py-3">
                          <div className="font-medium text-slate-200">{ledger.source.replace("_", " ")}</div>
                          <div className="text-xs text-slate-500">{ledger.description}</div>
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right font-semibold text-cyan-400">
                          +{ledger.credits}
                        </td>
                        <td className="whitespace-nowrap px-4 py-3 text-right text-slate-400">
                          {formatNaira(creditsToNaira(ledger.credits, conversionRate))}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </>
          )}
        </div>
      </section>
    </div>
  );
}

function WithdrawalStatusBadge({ status }: { status: "approved" | "paid" | "pending" | "rejected" }) {
  if (status === "pending") {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/10 px-2.5 py-1 text-xs font-medium text-yellow-400"><Clock className="size-3.5" /> Pending</span>;
  }

  if (status === "approved") {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-400/10 px-2.5 py-1 text-xs font-medium text-blue-400"><Clock className="size-3.5" /> Processing</span>;
  }

  if (status === "paid") {
    return <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-400"><CheckCircle2 className="size-3.5" /> Paid</span>;
  }

  return <span className="inline-flex items-center gap-1.5 rounded-full bg-red-400/10 px-2.5 py-1 text-xs font-medium text-red-400"><XCircle className="size-3.5" /> Rejected</span>;
}
