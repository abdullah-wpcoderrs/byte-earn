import { ArrowLeft, Clock, CheckCircle2, XCircle, ArrowUpRight, ArrowDownRight } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import { getActiveFinanceSettings } from "@/lib/finance-settings";
import { creditsToNaira, formatNaira } from "@/lib/money";
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

      <section className="glass-strong overflow-hidden rounded-xl">
        <div className="border-b border-white/5 bg-slate-900/50 p-4 font-semibold text-slate-200">
          Withdrawal Requests
        </div>
        <div className="overflow-x-auto">
          {withdrawalResult.data.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No withdrawals found.</div>
          ) : (
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
                      {withdrawal.status === "pending" && <span className="inline-flex items-center gap-1.5 rounded-full bg-yellow-400/10 px-2.5 py-1 text-xs font-medium text-yellow-400"><Clock className="size-3.5" /> Pending</span>}
                      {withdrawal.status === "approved" && <span className="inline-flex items-center gap-1.5 rounded-full bg-blue-400/10 px-2.5 py-1 text-xs font-medium text-blue-400"><Clock className="size-3.5" /> Processing</span>}
                      {withdrawal.status === "paid" && <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-400/10 px-2.5 py-1 text-xs font-medium text-emerald-400"><CheckCircle2 className="size-3.5" /> Paid</span>}
                      {withdrawal.status === "rejected" && <span className="inline-flex items-center gap-1.5 rounded-full bg-red-400/10 px-2.5 py-1 text-xs font-medium text-red-400"><XCircle className="size-3.5" /> Rejected</span>}
                    </td>
                    <td className="px-4 py-3 text-slate-400">
                      {withdrawal.review_note || "-"}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>

      <section className="glass-strong overflow-hidden rounded-xl">
        <div className="border-b border-white/5 bg-slate-900/50 p-4 font-semibold text-slate-200">
          Transaction Ledger
        </div>
        <div className="overflow-x-auto">
          {ledgerResult.data.length === 0 ? (
            <div className="p-6 text-center text-slate-500">No transactions found.</div>
          ) : (
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
          )}
        </div>
      </section>
    </div>
  );
}
