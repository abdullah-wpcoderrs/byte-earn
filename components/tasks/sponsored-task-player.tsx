"use client";

import { Check, Clapperboard, Lock, Play } from "lucide-react";
import type { SyntheticEvent } from "react";
import { useMemo, useState } from "react";
import type { SponsoredTask } from "@/lib/tasks";
import { formatWatchTime } from "@/lib/tasks";

type SponsoredTaskPlayerProps = {
  tasks: SponsoredTask[];
};

type EarnToast = {
  credits: number;
  id: number;
};

export function SponsoredTaskPlayer({ tasks }: SponsoredTaskPlayerProps) {
  const [activeTaskId, setActiveTaskId] = useState(tasks[0]?.id);
  const [awardedMilestones, setAwardedMilestones] = useState<Record<string, number[]>>({});
  const [watchedSeconds, setWatchedSeconds] = useState<Record<string, number>>({});
  const [toast, setToast] = useState<EarnToast | null>(null);
  const activeTask = tasks.find((task) => task.id === activeTaskId) ?? tasks[0];
  const activeMilestones = awardedMilestones[activeTask.id] ?? [];
  const activeWatchedSeconds = watchedSeconds[activeTask.id] ?? 0;
  const totalWatchedToday = Object.values(watchedSeconds).reduce((total, seconds) => total + seconds, 0);
  const dailyCapSeconds = activeTask.dailyCapSeconds;
  const capExhausted = totalWatchedToday >= dailyCapSeconds;

  const earnedCredits = useMemo(
    () =>
      tasks.reduce((sum, task) => {
        const taskAwarded = awardedMilestones[task.id] ?? [];
        return sum + task.milestones.filter((milestone) => taskAwarded.includes(milestone.seconds)).reduce((taskSum, milestone) => taskSum + milestone.credits, 0);
      }, 0),
    [awardedMilestones, tasks],
  );

  function handleTimeUpdate(event: SyntheticEvent<HTMLVideoElement>) {
    if (capExhausted) {
      return;
    }

    const seconds = Math.floor(event.currentTarget.currentTime);
    const cappedSeconds = Math.min(seconds, dailyCapSeconds);

    setWatchedSeconds((current) => ({
      ...current,
      [activeTask.id]: Math.max(current[activeTask.id] ?? 0, cappedSeconds),
    }));

    const nextMilestone = activeTask.milestones.find((milestone) => seconds >= milestone.seconds && !activeMilestones.includes(milestone.seconds));

    if (!nextMilestone) {
      return;
    }

    setAwardedMilestones((current) => ({
      ...current,
      [activeTask.id]: [...(current[activeTask.id] ?? []), nextMilestone.seconds],
    }));
    setToast({ credits: nextMilestone.credits, id: Date.now() });
    window.setTimeout(() => setToast(null), 2600);
  }

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(360px,0.96fr)_minmax(280px,1.04fr)]">
      <section className="glass-strong overflow-hidden p-3">
        <div className="relative overflow-hidden rounded-[5px] border border-white/10 bg-slate-950">
          <video className="aspect-video w-full bg-slate-950 object-cover" controls onTimeUpdate={handleTimeUpdate} src={activeTask.videoUrl} />
          {toast ? (
            <div className="absolute right-3 top-3 rounded-[5px] border border-emerald-300/25 bg-emerald-300/12 px-3 py-2 text-emerald-50 shadow-2xl backdrop-blur">
              +{toast.credits} Credits
            </div>
          ) : null}
        </div>

        <div className="mt-4 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <p className="text-base font-semibold">{activeTask.title}</p>
            <p className="mt-1 text-muted">
              {activeTask.sponsor} - watched {formatWatchTime(activeWatchedSeconds)}
            </p>
          </div>
          <div className="rounded-[5px] border border-white/10 bg-white/[0.045] px-3 py-2 text-slate-300">
            Earned today: <span className="font-semibold text-cyan-100">{earnedCredits} credits</span>
          </div>
        </div>
      </section>

      <section className="grid gap-4">
        <div className="glass p-4">
          <div className="flex items-center gap-2 text-cyan-100">
            <Clapperboard className="size-4" />
            <h1 className="text-base font-semibold">Sponsored tasks</h1>
          </div>
          <p className="mt-2 leading-5 text-muted">
            No continuous earning ticker is shown during playback. Credits appear only when a milestone is crossed.
          </p>
          <div className="mt-4 grid gap-2">
            {tasks.map((task) => (
              <button
                className={`rounded-[5px] border p-3 text-left transition ${
                  task.id === activeTask.id ? "border-cyan-200/30 bg-cyan-300/10 text-cyan-50" : "border-white/10 bg-white/[0.045] text-slate-300 hover:bg-white/8"
                }`}
                key={task.id}
                onClick={() => setActiveTaskId(task.id)}
                type="button"
              >
                <span className="font-semibold">{task.title}</span>
                <span className="mt-1 block text-muted">{task.sponsor}</span>
              </button>
            ))}
          </div>
        </div>

        <div className="glass p-4">
          <div className="mb-4 flex items-center justify-between gap-3">
            <h2 className="text-base font-semibold">Milestones</h2>
            <p className={capExhausted ? "text-slate-500" : "text-muted"}>{capExhausted ? "Daily cap exhausted" : `${formatWatchTime(dailyCapSeconds - totalWatchedToday)} left`}</p>
          </div>
          <div className="grid gap-2 sm:grid-cols-3 lg:grid-cols-1 xl:grid-cols-3">
            {activeTask.milestones.map((milestone) => {
              const completed = activeMilestones.includes(milestone.seconds);
              const locked = capExhausted && !completed;

              return (
                <div
                  className={`rounded-[5px] border p-3 ${
                    completed
                      ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-50"
                      : locked
                        ? "border-white/8 bg-slate-500/12 text-slate-500"
                        : "border-cyan-200/15 bg-cyan-300/8 text-cyan-50"
                  }`}
                  key={milestone.seconds}
                >
                  {completed ? <Check className="mb-3 size-4" /> : locked ? <Lock className="mb-3 size-4" /> : <Play className="mb-3 size-4" />}
                  <p className="font-semibold">{formatWatchTime(milestone.seconds)}</p>
                  <p className="mt-1 text-[10px] opacity-80">{milestone.credits} Credits</p>
                </div>
              );
            })}
          </div>
        </div>
      </section>
    </div>
  );
}
