import { Search } from "lucide-react";
import { UserManagementTable } from "./user-management-table";
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

      <UserManagementTable users={users.rows} />

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
