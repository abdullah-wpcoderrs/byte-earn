import { createClient } from "@/lib/supabase/server";
import { CreateTaskModal } from "@/components/admin/create-task-modal";
import { approveSponsoredTaskSession, rejectSponsoredTaskSession, toggleSponsoredTaskStatus, deleteSponsoredTask } from "./actions";
import { Archive, Check, Pause, Play, X } from "lucide-react";

export const dynamic = "force-dynamic";

type PendingSessionTask = {
  title?: string | null;
  task_type?: string | null;
  reward_credits?: number | null;
};

type TaskModalTask = NonNullable<Parameters<typeof CreateTaskModal>[0]["task"]>;

function firstRelatedTask(value: unknown): PendingSessionTask | null {
  if (Array.isArray(value)) return (value[0] as PendingSessionTask | undefined) ?? null;
  return (value as PendingSessionTask | null) ?? null;
}

function formatReviewReason(reason?: string | null) {
  if (!reason) return "Manual review";
  return reason
    .split("_")
    .map((part) => part.charAt(0).toUpperCase() + part.slice(1))
    .join(" ");
}

export default async function AdminTasksPage() {
  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from("sponsored_tasks")
    .select("id, title, provider, status, reward_credits, completions_count, description, task_url, media_url, limit_per_user, global_cap, task_type, provider_placement_id, provider_domain_id, provider_tracking_param")
    .order("created_at", { ascending: false });

  const { data: events } = await supabase
    .from("sponsored_task_provider_events")
    .select("provider, status, reported_clicks, reported_impressions, reported_revenue, payout_amount, created_at")
    .order("created_at", { ascending: false })
    .limit(500);

  const { data: pendingSessions } = await supabase
    .from("task_sessions")
    .select("id, provider, profile_id, status, ip_address, country_code, fraud_reason, fraud_metadata, created_at, sponsored_tasks(title, task_type, reward_credits)")
    .in("status", ["pending", "suspicious"])
    .order("created_at", { ascending: false })
    .limit(20);

  if (error) {
    console.error("Error fetching tasks:", error);
  }

  const analytics = (events ?? []).reduce(
    (current, event) => {
      current.events += 1;
      current.clicks += event.reported_clicks ?? 0;
      current.impressions += event.reported_impressions ?? 0;
      current.revenue += Number(event.reported_revenue ?? 0);
      current.payout += Number(event.payout_amount ?? 0);
      if (event.status === "rejected") current.rejected += 1;
      if (event.status === "suspicious") current.suspicious += 1;
      if (event.status === "rewarded" || event.status === "confirmed") current.confirmed += 1;
      return current;
    },
    { clicks: 0, confirmed: 0, events: 0, impressions: 0, payout: 0, rejected: 0, revenue: 0, suspicious: 0 },
  );

  return (
    <div className="grid gap-4">
      <section className="glass-strong flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div>
          <p className="text-muted">Manage sponsored tasks and campaigns</p>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight">Sponsored Tasks</h1>
        </div>
        <CreateTaskModal />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          ["Provider events", analytics.events],
          ["Confirmed", analytics.confirmed],
          ["Rejected", analytics.rejected],
          ["Suspicious", analytics.suspicious],
          ["Adsterra clicks", analytics.clicks],
          ["Impressions", analytics.impressions],
          ["Revenue", `$${analytics.revenue.toFixed(4)}`],
          ["CPA payout", `$${analytics.payout.toFixed(4)}`],
          ["Validation queue", pendingSessions?.length ?? 0],
        ].map(([label, value]) => (
          <div className="rounded-[5px] border border-white/10 bg-white/[0.04] p-3" key={label}>
            <p className="text-xs uppercase text-slate-500">{label}</p>
            <p className="mt-1 text-lg font-semibold text-slate-100">{value}</p>
          </div>
        ))}
      </section>

      {pendingSessions && pendingSessions.length > 0 ? (
        <section className="glass grid gap-3 p-4">
          <h2 className="text-base font-semibold">Task validation queue</h2>
          <div className="grid gap-2">
            {pendingSessions.map((session) => {
              const task = firstRelatedTask(session.sponsored_tasks);
              return (
                <div className="flex flex-wrap items-center justify-between gap-3 rounded-[5px] border border-white/10 bg-white/[0.035] p-3" key={session.id}>
                  <div>
                    <p className="font-medium text-slate-100">{task?.title ?? "Unknown task"}</p>
                    <p className="text-xs text-slate-500">
                      {session.provider} - {task?.task_type ?? "task"} - {task?.reward_credits ?? 0} credits - {session.status}
                      {session.ip_address ? ` - ${session.ip_address}` : ""}
                      {session.country_code ? ` - ${session.country_code}` : ""}
                    </p>
                    <p className="mt-1 text-xs text-amber-200">
                      {formatReviewReason(session.fraud_reason)}
                    </p>
                  </div>
                  <div className="flex gap-2">
                    <form action={approveSponsoredTaskSession}>
                      <input name="sessionId" type="hidden" value={session.id} />
                      <button className="grid size-8 place-items-center rounded-[5px] border border-emerald-500/20 bg-emerald-500/10 text-emerald-300" title="Approve" type="submit">
                        <Check className="size-4" />
                      </button>
                    </form>
                    <form action={rejectSponsoredTaskSession}>
                      <input name="sessionId" type="hidden" value={session.id} />
                      <button className="grid size-8 place-items-center rounded-[5px] border border-red-500/20 bg-red-500/10 text-red-300" title="Reject" type="submit">
                        <X className="size-4" />
                      </button>
                    </form>
                  </div>
                </div>
              );
            })}
          </div>
        </section>
      ) : null}

      <div className="glass overflow-x-auto rounded-lg">
        <table className="w-full text-sm text-left text-slate-300">
          <thead className="text-xs uppercase bg-slate-800/50 text-slate-400 border-b border-slate-700">
            <tr>
              <th scope="col" className="px-6 py-4 font-medium">Title</th>
              <th scope="col" className="px-6 py-4 font-medium">Provider</th>
              <th scope="col" className="px-6 py-4 font-medium">Status</th>
              <th scope="col" className="px-6 py-4 font-medium">Reward Credits</th>
              <th scope="col" className="px-6 py-4 font-medium text-right">Completions</th>
              <th scope="col" className="px-6 py-4 font-medium text-right">Actions</th>
            </tr>
          </thead>
          <tbody>
            {tasks && tasks.length > 0 ? (
              tasks.map((task) => (
                <tr key={task.id} className="border-b border-slate-700/50 hover:bg-slate-800/30 transition-colors">
                  <td className="px-6 py-4 font-medium text-slate-100">{task.title}</td>
                  <td className="px-6 py-4 capitalize">{task.provider}</td>
                  <td className="px-6 py-4">
                    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ${
                      task.status === "active" ? "bg-green-500/10 text-green-400" :
                      task.status === "paused" ? "bg-yellow-500/10 text-yellow-400" :
                      "bg-slate-500/10 text-slate-400"
                    }`}>
                      {task.status || "Unknown"}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-cyan-400 font-semibold">{task.reward_credits}</td>
                  <td className="px-6 py-4 text-right">{task.completions_count ?? 0}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="flex items-center justify-end gap-1.5">
                      {/* Inline Edit Campaign Trigger Modal */}
                      <CreateTaskModal task={task as TaskModalTask} />

                      {/* Toggle Status Icon Button */}
                      <form action={toggleSponsoredTaskStatus}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="currentStatus" value={task.status || ""} />
                        <button
                          type="submit"
                          className={`grid size-7 cursor-pointer place-items-center rounded-[5px] border transition ${
                            task.status === "active"
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                              : "border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                          }`}
                          title={task.status === "active" ? "Pause Task" : "Activate Task"}
                        >
                          {task.status === "active" ? (
                            <Pause className="size-3.5" />
                          ) : (
                            <Play className="size-3.5" />
                          )}
                        </button>
                      </form>
                      
                      {/* Archive Icon Button */}
                      <form action={deleteSponsoredTask}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <button
                          type="submit"
                          className="grid size-7 cursor-pointer place-items-center rounded-[5px] border border-red-500/20 bg-red-500/10 text-red-400 transition hover:bg-red-500/20"
                          title="Archive Task"
                        >
                          <Archive className="size-3.5" />
                        </button>
                      </form>
                    </div>
                  </td>
                </tr>
              ))
            ) : (
              <tr>
                <td colSpan={6} className="px-6 py-8 text-center text-slate-500">
                  No tasks found.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}

