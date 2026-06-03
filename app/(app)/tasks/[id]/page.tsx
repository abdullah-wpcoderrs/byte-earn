import { ArrowLeft, Clock3, ShieldCheck } from "lucide-react";
import Link from "next/link";
import { redirect } from "next/navigation";
import type { ReactNode } from "react";
import { createClient } from "@/lib/supabase/server";
import { getUserTaskSessionSummary } from "@/lib/tasks-data";

export const dynamic = "force-dynamic";

export default async function TaskDetailPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) redirect("/auth/sign-in");

  const { data: task } = await supabase
    .from("sponsored_tasks")
    .select("id, title, description, provider, task_type, media_url, reward_credits, limit_per_user, status")
    .eq("id", id)
    .eq("status", "active")
    .maybeSingle();

  if (!task) redirect("/tasks");

  const summary = (await getUserTaskSessionSummary(user.id)).get(id);
  const status = summary?.suspicious
    ? "Under review"
    : summary?.pending
      ? "Pending verification"
      : summary?.rejectedToday
        ? "Rejected today"
        : "Ready";

  return (
    <div className="mx-auto grid max-w-4xl gap-4 p-4">
      <Link className="inline-flex min-h-10 w-fit items-center justify-center gap-2 rounded-[5px] border border-white/10 bg-white/[0.065] px-3 font-semibold text-slate-100" href="/tasks">
        <ArrowLeft className="size-4" />
        Back to tasks
      </Link>

      <section className="glass-strong overflow-hidden p-4 sm:p-6">
        <div className="flex flex-wrap items-start justify-between gap-4">
          <div>
            <p className="text-xs uppercase text-cyan-200">{task.provider} - {task.task_type}</p>
            <h1 className="mt-2 text-2xl font-semibold leading-tight text-white">{task.title}</h1>
          </div>
          <div className="rounded-[5px] border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-sm font-semibold text-cyan-100">
            +{task.reward_credits} credits
          </div>
        </div>

        {task.media_url ? (
          <div className="mt-5 overflow-hidden rounded-[5px] border border-white/10 bg-slate-950">
            {isVideoUrl(task.media_url) ? (
              <video className="max-h-[60vh] w-full object-contain" controls muted playsInline src={task.media_url} />
            ) : (
              // Native image keeps third-party task media working without extra host config.
              // eslint-disable-next-line @next/next/no-img-element
              <img alt={task.title} className="max-h-[60vh] w-full object-contain" src={task.media_url} />
            )}
          </div>
        ) : null}

        <div className="mt-5 grid gap-3 sm:grid-cols-2">
          <Detail icon={<ShieldCheck className="size-4" />} label="Verification" value={status} />
          <Detail icon={<Clock3 className="size-4" />} label="Daily cap" value={`${summary?.completedToday ?? 0} / ${task.limit_per_user}`} />
        </div>

        {task.description ? (
          <section className="mt-5 rounded-[5px] border border-white/10 bg-white/[0.04] p-4">
            <h2 className="text-sm font-semibold text-slate-100">Instructions</h2>
            <p className="mt-3 whitespace-pre-wrap text-sm leading-6 text-slate-300">{task.description}</p>
          </section>
        ) : null}
      </section>
    </div>
  );
}

function isVideoUrl(url: string) {
  const extension = url.split("?")[0].split(".").pop()?.toLowerCase();
  return ["mp4", "webm", "ogg", "mov", "quicktime"].includes(extension || "");
}

function Detail({ icon, label, value }: { icon: ReactNode; label: string; value: string }) {
  return (
    <div className="rounded-[5px] border border-white/10 bg-white/[0.04] p-3">
      <div className="flex items-center gap-2 text-cyan-100">
        {icon}
        <span className="text-xs font-semibold">{label}</span>
      </div>
      <p className="mt-2 text-sm text-slate-200">{value}</p>
    </div>
  );
}
