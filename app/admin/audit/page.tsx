import { AuditLogTable } from "./audit-log-table";
import { getAuditLogRows } from "@/lib/admin";

export const dynamic = "force-dynamic";

export default async function AdminAuditPage() {
  const rows = await getAuditLogRows();

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4 sm:p-5">
        <p className="text-muted">Recent admin, user, and system events captured by server actions</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Audit log</h1>
      </section>

      <AuditLogTable rows={rows} />
    </div>
  );
}
