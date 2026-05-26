import { FileClock } from "lucide-react";
import { getAuditLogRows } from "@/lib/admin";

export const dynamic = "force-dynamic";

function formatMetadata(value: string | null) {
  if (!value) return "No metadata";

  try {
    return JSON.stringify(JSON.parse(value), null, 2);
  } catch {
    return value;
  }
}

export default async function AdminAuditPage() {
  const rows = await getAuditLogRows();

  return (
    <div className="grid gap-4">
      <section className="glass-strong p-4 sm:p-5">
        <p className="text-muted">Recent admin, user, and system events captured by server actions</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Audit log</h1>
      </section>

      <section className="glass overflow-hidden">
        <div className="hidden grid-cols-[1.1fr_0.8fr_0.8fr_1.2fr_170px] border-b border-white/10 px-4 py-3 font-semibold text-slate-300 lg:grid">
          <span>Action</span>
          <span>Actor</span>
          <span>Entity</span>
          <span>Metadata</span>
          <span>Created</span>
        </div>
        <div className="divide-y divide-white/10">
          {rows.map((row) => (
            <article className="grid gap-3 p-4 lg:grid-cols-[1.1fr_0.8fr_0.8fr_1.2fr_170px] lg:items-start" key={row.id}>
              <div>
                <p className="font-semibold text-slate-100">{row.action}</p>
                <p className="mt-1 text-muted">{row.actorType}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-200">{row.actorName ?? "Unknown actor"}</p>
                <p className="mt-1 break-all text-slate-500">{row.actorId ?? "System"}</p>
              </div>
              <div>
                <p className="font-semibold text-slate-200">{row.entityType}</p>
                <p className="mt-1 break-all text-slate-500">{row.entityId ?? "Not set"}</p>
              </div>
              <pre className="app-scrollbar max-h-32 overflow-auto whitespace-pre-wrap rounded-[5px] border border-white/10 bg-white/[0.045] p-2 text-[10px] leading-4 text-slate-300">
                {formatMetadata(row.metadata)}
              </pre>
              <time className="text-slate-400">{row.createdAt.toLocaleString("en-NG")}</time>
            </article>
          ))}
        </div>
        {rows.length === 0 ? (
          <div className="grid min-h-40 place-items-center gap-2 p-4 text-center text-muted">
            <FileClock className="size-5" />
            No audit entries are available yet.
          </div>
        ) : null}
      </section>
    </div>
  );
}
