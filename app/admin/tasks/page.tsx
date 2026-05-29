import Link from "next/link";
import { PlusCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { Button } from "@/components/ui/button";
import { toggleSponsoredTaskStatus, deleteSponsoredTask } from "./actions";

export const dynamic = "force-dynamic";

export default async function AdminTasksPage() {
  const supabase = await createClient();

  const { data: tasks, error } = await supabase
    .from("sponsored_tasks")
    .select("id, title, provider, status, reward_credits, completions_count")
    .order("created_at", { ascending: false });

  if (error) {
    console.error("Error fetching tasks:", error);
  }

  return (
    <div className="grid gap-4">
      <section className="glass-strong flex flex-wrap items-center justify-between gap-4 p-4 sm:p-5">
        <div>
          <p className="text-muted">Manage sponsored tasks and campaigns</p>
          <h1 className="mt-1 text-[28px] font-semibold leading-tight">Sponsored Tasks</h1>
        </div>
        <Link href="/admin/tasks/create">
          <Button icon={<PlusCircle className="size-4" />} type="button">
            Create Task
          </Button>
        </Link>
      </section>

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
                    <div className="flex items-center justify-end gap-2">
                      <form action={toggleSponsoredTaskStatus}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <input type="hidden" name="currentStatus" value={task.status || ""} />
                        <button
                          type="submit"
                          className={`rounded-[5px] cursor-pointer border px-2.5 py-1 text-[11px] font-semibold transition ${
                            task.status === "active"
                              ? "border-amber-500/20 bg-amber-500/10 text-amber-400 hover:bg-amber-500/20"
                              : "border-green-500/20 bg-green-500/10 text-green-400 hover:bg-green-500/20"
                          }`}
                        >
                          {task.status === "active" ? "Pause" : "Activate"}
                        </button>
                      </form>
                      
                      <form action={deleteSponsoredTask}>
                        <input type="hidden" name="taskId" value={task.id} />
                        <button
                          type="submit"
                          className="rounded-[5px] cursor-pointer border border-red-500/20 bg-red-500/10 px-2.5 py-1 text-[11px] font-semibold text-red-400 transition hover:bg-red-500/20"
                        >
                          Delete
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

