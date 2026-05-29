"use client";

import { useState } from "react";
import { type SponsoredTask, type TaskProvider } from "@/lib/tasks-data";
import { startTask, completeInternalTask } from "@/app/(app)/tasks/actions";
import { Button } from "@/components/ui/button";
import { ExternalLink, Share2, Loader2, CheckCircle2 } from "lucide-react";

interface TaskEngineProps {
  tasks: SponsoredTask[];
  progress: Map<string, number>;
  profileId: string;
}

export function TaskEngine({ tasks, progress, profileId }: TaskEngineProps) {
  const cpaTasks = tasks.filter((t) => t.provider === "cpagrip");
  const monetagTasks = tasks.filter((t) => t.provider === "monetag");
  const internalTasks = tasks.filter((t) => t.provider === "internal");

  return (
    <div className="space-y-12">
      {cpaTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Partner Offers</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cpaTasks.map((task) => (
              <TaskCard key={task.id} task={task} completed={progress.get(task.id) || 0} />
            ))}
          </div>
        </section>
      )}

      {monetagTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Daily Ads Rewards</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {monetagTasks.map((task) => (
              <MonetagCard key={task.id} task={task} completed={progress.get(task.id) || 0} />
            ))}
          </div>
        </section>
      )}

      {internalTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Sponsored Campaigns</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {internalTasks.map((task) => (
              <InternalTaskCard key={task.id} task={task} completed={progress.get(task.id) || 0} profileId={profileId} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function TaskCard({ task, completed }: { task: SponsoredTask; completed: number }) {
  const [loading, setLoading] = useState(false);
  const isFinished = completed >= task.limitPerUser;

  const handleStart = async () => {
    setLoading(true);
    try {
      const { url } = await startTask(task.id, task.provider);
      window.open(url, "_blank");
      alert("Offer Started: Complete the offer to earn credits. It may take a few minutes to verify.");
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
      <div>
        <h3 className="font-semibold text-lg line-clamp-1 text-slate-100">{task.title}</h3>
        <p className="text-sm text-slate-400 mt-1 line-clamp-2">{task.description}</p>
      </div>
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-800/50">
        <div className="font-semibold text-cyan-400">+{task.rewardCredits} Credits</div>
        <Button onClick={handleStart} disabled={isFinished || loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {isFinished ? "Completed" : "Start Task"}
        </Button>
      </div>
    </div>
  );
}

function MonetagCard({ task, completed }: { task: SponsoredTask; completed: number }) {
  const [loading, setLoading] = useState(false);
  const isFinished = completed >= task.limitPerUser;
  const progressPercent = Math.min(100, Math.round((completed / task.limitPerUser) * 100));

  const handleStart = async () => {
    setLoading(true);
    try {
      const { url } = await startTask(task.id, task.provider);
      window.open(url, "_blank");
      alert("Ad Started: Watch the ad completely. Refresh the page afterwards to see your progress update.");
    } catch (error: any) {
      alert(`Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
      <div>
        <h3 className="font-semibold text-lg line-clamp-1 text-slate-100">{task.title}</h3>
        <p className="text-sm text-slate-400 mt-1 line-clamp-2">{task.description}</p>
      </div>
      <div className="mt-4 mb-2">
        <div className="flex justify-between text-xs mb-2 font-medium text-slate-300">
          <span>Progress</span>
          <span>{completed} / {task.limitPerUser}</span>
        </div>
        <div className="w-full bg-slate-800 rounded-full h-2">
          <div className="bg-cyan-500 h-2 rounded-full transition-all duration-300" style={{ width: `${progressPercent}%` }}></div>
        </div>
      </div>
      <div className="flex justify-between items-center mt-4 pt-4 border-t border-slate-800/50">
        <div className="font-semibold text-cyan-400 text-sm">+{task.rewardCredits} Credits (At {task.limitPerUser})</div>
        <Button onClick={handleStart} disabled={isFinished || loading}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {isFinished ? "Completed" : "Watch Ad"}
        </Button>
      </div>
    </div>
  );
}

function InternalTaskCard({ task, completed, profileId }: { task: SponsoredTask; completed: number; profileId: string }) {
  const [loading, setLoading] = useState(false);
  const isFinished = completed >= task.limitPerUser;

  const handleShare = async () => {
    setLoading(true);
    const platformUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const shareUrl = `${platformUrl}/?ref=${profileId}`;
    const shareText = `${task.title}\n\n${task.description}\n\n${shareUrl}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: task.title,
          text: task.description || undefined,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        alert("Link Copied! Share this link on your social media.");
      }

      if (!isFinished) {
        const res = await completeInternalTask(task.id);
        if (res.success) {
          alert(`Task Completed: You earned ${res.credits} credits!`);
        }
      }
    } catch (error: any) {
      if (error.name !== "AbortError") {
        alert(`Error: ${error.message || "Failed to share task"}`);
      }
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between overflow-hidden">
      <div>
        <h3 className="font-semibold text-lg line-clamp-1 text-slate-100">{task.title}</h3>
        <p className="text-sm text-slate-400 mt-1 line-clamp-2">{task.description}</p>
      </div>
      {task.mediaUrl && (
        <div className="mt-4 -mx-5 px-5">
          <img src={task.mediaUrl} alt={task.title} className="w-full h-32 object-cover rounded-md" />
        </div>
      )}
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-800/50">
        <div className="font-semibold text-cyan-400">+{task.rewardCredits} Credits</div>
        <Button onClick={handleShare} disabled={isFinished || loading} variant={isFinished ? "secondary" : "primary"}>
          {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
          {isFinished ? (
            <><CheckCircle2 className="w-4 h-4 mr-2" /> Shared</>
          ) : (
            <><Share2 className="w-4 h-4 mr-2" /> Share</>
          )}
        </Button>
      </div>
    </div>
  );
}
