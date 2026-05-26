import { BadgeCheck, Banknote, CircleDollarSign, History, ListChecks, XCircle } from "lucide-react";
import { reviewWithdrawalAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { SubmitButton } from "@/components/ui/submit-button";
import { TextInput } from "@/components/ui/input";
import { getWithdrawalRequests } from "@/lib/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

function statusLabel(status: string) {
  return status[0]?.toUpperCase() + status.slice(1);
}

export default async function AdminWithdrawalsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const tab = first(params.tab) === "history" ? "history" : "requests";
  const status = first(params.status) as "pending" | "approved" | "paid" | "rejected" | undefined;
  const allowedStatuses = tab === "history" ? ["paid", "rejected"] : ["pending", "approved"];
  const selectedStatus = allowedStatuses.includes(status ?? "") ? status : undefined;
  const withdrawals = await getWithdrawalRequests({ scope: tab, status: selectedStatus });

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4 sm:p-5">
        <p className="text-muted">Approve, reject, mark paid, and review completed withdrawal records</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Withdrawal reviews</h1>
      </section>

      <div className="grid gap-3 lg:grid-cols-[1fr_auto] lg:items-end">
        <div className="grid grid-cols-2 border-y border-white/10">
          {[
            { href: "/admin/withdrawals", icon: ListChecks, key: "requests", label: "Requests" },
            { href: "/admin/withdrawals?tab=history", icon: History, key: "history", label: "Transaction History" },
          ].map((item) => {
            const active = tab === item.key;
            return (
              <a
                className={`relative inline-flex min-h-12 items-center justify-center gap-2 px-3 font-semibold transition ${
                  active ? "text-cyan-100" : "text-slate-400 hover:text-slate-100"
                }`}
                href={item.href}
                key={item.key}
              >
                <item.icon className="size-4" />
                {item.label}
                {active ? <span className="absolute inset-x-8 bottom-0 h-px bg-cyan-200" /> : null}
              </a>
            );
          })}
        </div>

        <form action="/admin/withdrawals" className="glass grid gap-3 p-4 sm:min-w-72">
          <input name="tab" type="hidden" value={tab} />
          <Select defaultValue={selectedStatus ?? ""} label="Review state" name="status">
            <option value="">All {tab === "history" ? "history" : "requests"}</option>
            {allowedStatuses.map((item) => (
              <option key={item} value={item}>{statusLabel(item)}</option>
            ))}
          </Select>
          <Button type="submit">Filter</Button>
        </form>
      </div>

      <section className="grid gap-3">
        {withdrawals.map((request) => (
          <article className="glass grid gap-4 p-4 xl:grid-cols-[1fr_320px]" key={request.id}>
            <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr]">
              <div>
                <p className="text-muted">Creator</p>
                <p className="mt-1 font-semibold text-slate-100">{request.displayName ?? "Unnamed user"}</p>
                <p className="mt-1 text-slate-400">{request.profileId}</p>
              </div>
              <div>
                <p className="text-muted">Payout account</p>
                <p className="mt-1 font-semibold text-slate-100">{request.accountName}</p>
                <p className="mt-1 text-slate-300">
                  {request.bankName} - {request.accountNumber}
                </p>
              </div>
              <div>
                <p className="text-muted">Amount</p>
                <p className="mt-1 text-base font-semibold text-cyan-100">NGN {Number(request.amountNaira).toLocaleString("en-NG")}</p>
                <p className="mt-1 text-slate-300">{request.amountCredits.toLocaleString()} credits</p>
              </div>
              <div>
                <p className="text-muted">State</p>
                <p className="mt-1 inline-flex rounded-[5px] border border-cyan-200/20 bg-cyan-300/10 px-2 py-1 font-semibold text-cyan-100">
                  {request.status}
                </p>
              </div>
              <div>
                <p className="text-muted">Requested</p>
                <p className="mt-1 text-slate-300">{request.createdAt.toLocaleString("en-NG")}</p>
              </div>
              <div>
                <p className="text-muted">Last review</p>
                <p className="mt-1 text-slate-300">{request.reviewedAt ? request.reviewedAt.toLocaleString("en-NG") : "Not reviewed"}</p>
                {request.reviewNote ? <p className="mt-1 text-slate-400">{request.reviewNote}</p> : null}
              </div>
            </div>

            {tab === "requests" ? (
              <form action={reviewWithdrawalAction} className="grid content-start gap-2">
                <input name="withdrawalId" type="hidden" value={request.id} />
                <TextInput label="Review note" name="reviewNote" placeholder="Optional note for the review record" />
                <div className="grid grid-cols-3 gap-2">
                  <SubmitButton disabled={request.status !== "pending"} icon={<BadgeCheck className="size-4" />} name="reviewAction" pendingLabel="Saving..." type="submit" value="approve">
                    Approve
                  </SubmitButton>
                  <SubmitButton disabled={request.status !== "approved"} icon={<CircleDollarSign className="size-4" />} name="reviewAction" pendingLabel="Saving..." type="submit" value="paid" variant="secondary">
                    Paid
                  </SubmitButton>
                  <SubmitButton disabled={request.status !== "pending"} icon={<XCircle className="size-4" />} name="reviewAction" pendingLabel="Saving..." type="submit" value="reject" variant="danger">
                    Reject
                  </SubmitButton>
                </div>
              </form>
            ) : (
              <div className="grid content-start gap-2 rounded-[5px] border border-white/10 bg-white/[0.045] p-3">
                <p className="font-semibold text-slate-100">Transaction record</p>
                <p className="leading-5 text-muted">Completed and rejected withdrawals are kept here for audit and reconciliation.</p>
              </div>
            )}
          </article>
        ))}
      </section>

      {withdrawals.length === 0 ? (
        <div className="glass flex min-h-32 items-center justify-center gap-2 p-4 text-muted">
          <Banknote className="size-5" />
          No withdrawal {tab === "history" ? "transactions" : "requests"} match this filter.
        </div>
      ) : null}
    </div>
  );
}
