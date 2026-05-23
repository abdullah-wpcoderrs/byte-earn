import { Coins, Search, UserMinus } from "lucide-react";
import { bulkUserAction } from "@/app/admin/actions";
import { Button } from "@/components/ui/button";
import { Select } from "@/components/ui/select";
import { TextInput } from "@/components/ui/input";
import { getAdminUsers } from "@/lib/admin";

export const dynamic = "force-dynamic";

type PageProps = {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
};

function first(value: string | string[] | undefined) {
  return Array.isArray(value) ? value[0] : value;
}

export default async function AdminUsersPage({ searchParams }: PageProps) {
  const params = await searchParams;
  const filters = {
    earningMax: Number(first(params.max) ?? NaN),
    earningMin: Number(first(params.min) ?? NaN),
    page: Number(first(params.page) ?? 1),
    percentile: first(params.percentile) as "top10" | "top25" | "bottom25" | undefined,
    q: first(params.q) ?? "",
  };
  const users = await getAdminUsers(filters);

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4 sm:p-5">
        <p className="text-muted">Directory, filters, and bulk account controls</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">User management</h1>
      </section>

      <form className="glass grid gap-3 p-4 md:grid-cols-[1fr_140px_140px_170px_auto]" action="/admin/users">
        <TextInput defaultValue={filters.q} icon={<Search className="size-4" />} label="Search" name="q" placeholder="Name or referral code" />
        <TextInput defaultValue={Number.isFinite(filters.earningMin) ? String(filters.earningMin) : ""} label="Min credits" name="min" inputMode="numeric" />
        <TextInput defaultValue={Number.isFinite(filters.earningMax) ? String(filters.earningMax) : ""} label="Max credits" name="max" inputMode="numeric" />
        <Select defaultValue={filters.percentile ?? ""} label="Referral rank" name="percentile">
          <option value="">All users</option>
          <option value="top10">Top 10%</option>
          <option value="top25">Top 25%</option>
          <option value="bottom25">Bottom 25%</option>
        </Select>
        <Button className="self-end" type="submit">
          Filter
        </Button>
      </form>

      <form action={bulkUserAction} className="glass overflow-hidden">
        <div className="grid gap-3 border-b border-white/10 p-4 md:grid-cols-[180px_130px_1fr_auto]">
          <Select label="Bulk action" name="bulkAction" required>
            <option value="credit">Credit selected</option>
            <option value="deduct">Deduct points</option>
            <option value="remove">Remove balance</option>
            <option value="suspend">Suspend</option>
            <option value="delete">Delete profile</option>
          </Select>
          <TextInput icon={<Coins className="size-4" />} label="Credits" name="credits" inputMode="numeric" placeholder="0" />
          <TextInput label="Reason" name="reason" placeholder="Visible ledger description" />
          <Button className="self-end" icon={<UserMinus className="size-4" />} type="submit" variant="secondary">
            Apply
          </Button>
        </div>

        <div className="hidden grid-cols-[44px_1.4fr_110px_110px_110px_120px] border-b border-white/10 px-4 py-3 font-semibold text-slate-300 md:grid">
          <span />
          <span>User</span>
          <span>Status</span>
          <span>Role</span>
          <span>Referrals</span>
          <span>Credits</span>
        </div>

        <div className="divide-y divide-white/10">
          {users.rows.map((user) => (
            <label className="grid gap-3 p-4 md:grid-cols-[44px_1.4fr_110px_110px_110px_120px] md:items-center" key={user.id}>
              <input className="size-4 accent-cyan-300" name="userIds" type="checkbox" value={user.id} />
              <span>
                <span className="block font-semibold text-slate-100">{user.displayName ?? "Unnamed user"}</span>
                <span className="text-muted">{user.referralCode}</span>
              </span>
              <span className="rounded-[5px] border border-white/10 px-2 py-1 text-center text-slate-200">{user.status}</span>
              <span className="text-slate-300">{user.role}</span>
              <span className="text-slate-300">{user.referralCount}</span>
              <span className="font-semibold text-cyan-100">{user.creditsBalance.toLocaleString()}</span>
            </label>
          ))}
        </div>
      </form>

      <div className="flex flex-wrap items-center justify-between gap-3 text-muted">
        <p>
          Page {users.page} of {users.totalPages} - {users.total} users
        </p>
        <div className="flex gap-2">
          <a className="rounded-[5px] border border-white/10 px-3 py-2 text-slate-200" href={`/admin/users?page=${Math.max(1, users.page - 1)}`}>
            Previous
          </a>
          <a className="rounded-[5px] border border-white/10 px-3 py-2 text-slate-200" href={`/admin/users?page=${Math.min(users.totalPages, users.page + 1)}`}>
            Next
          </a>
        </div>
      </div>
    </div>
  );
}
