import { BadgeCheck, Banknote, CircleDollarSign, XCircle } from "lucide-react";
import { reviewWithdrawalAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/input";
import { getWithdrawalRequests } from "@/lib/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminWithdrawalsPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const status = first(params.status) as "pending" | "approved" | "paid" | "rejected" | undefined;
  const selectedStatus = ["pending", "approved", "paid", "rejected"].includes(status ?? "") ? status : undefined;
  const withdrawals = await getWithdrawalRequests(selectedStatus);

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4 sm:p-5">
        <p className="text-muted">Approve, reject, and mark withdrawal requests as paid</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Withdrawal reviews</h1>
      </section>

      <form action="/admin/withdrawals" className="glass grid gap-3 p-4 sm:max-w-xs">
        <Select defaultValue={selectedStatus ?? ""} label="Review state" name="status">
          <option value="">All states</option>
          <option value="pending">Pending</option>
          <option value="approved">Approved</option>
          <option value="paid">Paid</option>
          <option value="rejected">Rejected</option>
        </Select>
        <Button type="submit">Filter</Button>
      </form>

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

            <form action={reviewWithdrawalAction} className="grid content-start gap-2">
              <input name="withdrawalId" type="hidden" value={request.id} />
              <TextInput label="Review note" name="reviewNote" placeholder="Optional note for the review record" />
              <div className="grid grid-cols-3 gap-2">
                <Button
                  disabled={request.status !== "pending"}
                  icon={<BadgeCheck className="size-4" />}
                  name="reviewAction"
                  type="submit"
                  value="approve"
                >
                  Approve
                </Button>
                <Button
                  disabled={request.status !== "approved"}
                  icon={<CircleDollarSign className="size-4" />}
                  name="reviewAction"
                  type="submit"
                  value="paid"
                  variant="secondary"
                >
                  Paid
                </Button>
                <Button
                  disabled={request.status !== "pending"}
                  icon={<XCircle className="size-4" />}
                  name="reviewAction"
                  type="submit"
                  value="reject"
                  variant="danger"
                >
                  Reject
                </Button>
              </div>
            </form>
          </article>
        ))}
      </section>

      {withdrawals.length === 0 ? (
        <div className="glass flex min-h-32 items-center justify-center gap-2 p-4 text-muted">
          <Banknote className="size-5" />
          No withdrawal requests match this filter.
        </div>
      ) : null}
    </div>
  );
}
