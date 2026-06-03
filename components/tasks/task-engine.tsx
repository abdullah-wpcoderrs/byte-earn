"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type SponsoredTask, type TaskSessionSummary } from "@/lib/tasks-data";
import { completeInternalTask, completeInternalVisitTask, completeInternalWatchTask, startTask } from "@/app/(app)/tasks/actions";
import { Button } from "@/components/ui/button";
import { Share2, Loader2, CheckCircle2 } from "lucide-react";

interface TaskEngineProps {
  tasks: SponsoredTask[];
  progress: Map<string, number>;
  sessionSummary: Map<string, TaskSessionSummary>;
  profileId: string;
  referralCode?: string;
}

export function TaskEngine({ tasks, progress, sessionSummary, profileId, referralCode }: TaskEngineProps) {
  const router = useRouter();
  const cpaTasks = tasks.filter((t) => t.provider === "cpagrip");
  const smartLinkTasks = tasks.filter((t) => t.provider === "adsterra");
  const internalTasks = tasks.filter((t) => t.provider === "internal");
  const hasPendingSessions = Array.from(sessionSummary.values()).some((summary) => summary.pending > 0 || summary.suspicious > 0);

  useEffect(() => {
    if (!hasPendingSessions) return;

    const interval = window.setInterval(() => {
      router.refresh();
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [hasPendingSessions, router]);

  return (
    <div className="space-y-12">
      {cpaTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Partner Offers</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cpaTasks.map((task) => (
              <TaskCard key={task.id} task={task} completed={progress.get(task.id) || 0} summary={sessionSummary.get(task.id)} />
            ))}
          </div>
        </section>
      )}

      {smartLinkTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Daily Ad Rewards</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {smartLinkTasks.map((task) => (
              <AdsterraCard key={task.id} task={task} completed={progress.get(task.id) || 0} summary={sessionSummary.get(task.id)} />
            ))}
          </div>
        </section>
      )}

      {internalTasks.length > 0 && (
        <section>
          <h2 className="text-xl font-semibold mb-4">Sponsored Campaigns</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {internalTasks.map((task) => (
              <InternalTaskCard key={task.id} task={task} completed={progress.get(task.id) || 0} summary={sessionSummary.get(task.id)} profileId={profileId} referralCode={referralCode} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}

function statusText(summary?: TaskSessionSummary) {
  if (!summary) return null;
  if (summary.suspicious > 0) return "Under review";
  if (summary.pending > 0) return "Pending verification";
  if (summary.rejectedToday > 0) return "Rejected today";
  return null;
}

function TaskStatusLine({ summary, message }: { summary?: TaskSessionSummary; message?: string | null }) {
  const text = message ?? statusText(summary);
  if (!text) return null;
  return <p className="mt-3 rounded-[5px] border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs text-cyan-100">{text}</p>;
}

function errorMessage(error: unknown, fallback: string) {
  return error instanceof Error ? error.message : fallback;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function TaskCard({ task, completed, summary }: { task: SponsoredTask; completed: number; summary?: TaskSessionSummary }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isFinished = completed >= task.limitPerUser;
  const hasPending = (summary?.pending ?? 0) > 0 || (summary?.suspicious ?? 0) > 0;

  const handleStart = async () => {
    setLoading(true);
    try {
      const { url } = await startTask(task.id);
      window.open(url, "_blank");
      setMessage("Offer started. Credits issue after the partner confirms the conversion.");
    } catch (error: unknown) {
      setMessage(errorMessage(error, "Failed to start task"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
      <div>
        <h3 className="font-semibold text-lg line-clamp-1 text-slate-100">{task.title}</h3>
        <p className="mt-1 hidden text-sm text-slate-400 sm:line-clamp-2 sm:block">{task.description}</p>
        <TaskStatusLine summary={summary} message={message} />
      </div>
      <div className="flex justify-between items-center mt-6 pt-4 border-t border-slate-800/50">
        <div className="font-semibold text-cyan-400">+{task.rewardCredits} Credits</div>
        <div className="flex items-center gap-2">
          <Link className="hidden rounded-[5px] border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 sm:inline-flex" href={`/tasks/${task.id}`}>
            Details
          </Link>
          <Button onClick={handleStart} disabled={isFinished || hasPending || loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isFinished ? "Completed" : "Start Task"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdsterraCard({ task, completed, summary }: { task: SponsoredTask; completed: number; summary?: TaskSessionSummary }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const isFinished = completed >= task.limitPerUser;
  const hasPending = (summary?.pending ?? 0) > 0 || (summary?.suspicious ?? 0) > 0;
  const progressPercent = Math.min(100, Math.round((completed / task.limitPerUser) * 100));

  const handleStart = async () => {
    setLoading(true);
    try {
      const { url } = await startTask(task.id);
      window.open(url, "_blank");
      setMessage("Ad started. Rewards stay pending until Adsterra reports the click or revenue.");
    } catch (error: unknown) {
      setMessage(errorMessage(error, "Failed to start ad"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/50 p-5 flex flex-col justify-between">
      <div>
        <h3 className="font-semibold text-lg line-clamp-1 text-slate-100">{task.title}</h3>
        <p className="mt-1 hidden text-sm text-slate-400 sm:line-clamp-2 sm:block">{task.description}</p>
        <TaskStatusLine summary={summary} message={message} />
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
        <div className="font-semibold text-cyan-400 text-sm">+{task.rewardCredits} Credits after verification</div>
        <div className="flex items-center gap-2">
          <Link className="hidden rounded-[5px] border border-white/10 px-3 py-2 text-xs font-semibold text-slate-200 sm:inline-flex" href={`/tasks/${task.id}`}>
            Details
          </Link>
          <Button onClick={handleStart} disabled={isFinished || hasPending || loading}>
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isFinished ? "Completed" : "Watch Ad"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function InternalTaskCard({ task, completed, summary, profileId, referralCode }: { task: SponsoredTask; completed: number; summary?: TaskSessionSummary; profileId: string; referralCode?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [visitSessionId, setVisitSessionId] = useState<string | null>(task.taskType === "visit_url" ? summary?.latestPendingSessionId ?? null : null);
  const [watchSessionId, setWatchSessionId] = useState<string | null>(task.taskType === "watch_media" ? summary?.latestPendingSessionId ?? null : null);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [watchSubmitted, setWatchSubmitted] = useState(false);
  const isFinished = completed >= task.limitPerUser;
  const hasPending = ((summary?.pending ?? 0) > 0 && !visitSessionId && !watchSessionId) || (summary?.suspicious ?? 0) > 0;

  const submitVisitCompletion = async () => {
    if (!visitSessionId) return;
    setLoading(true);
    try {
      await completeInternalVisitTask(visitSessionId);
      setVisitSessionId(null);
      setMessage("Visit verified. Credits have been issued.");
    } catch (error: unknown) {
      setMessage(errorMessage(error, "Failed to verify visit"));
    } finally {
      setLoading(false);
    }
  };

  const submitWatchCompletion = async (seconds: number) => {
    if (!watchSessionId || watchSubmitted || loading || seconds < 30) return;
    setLoading(true);
    try {
      await completeInternalWatchTask(watchSessionId);
      setWatchSessionId(null);
      setWatchSubmitted(true);
      setMessage("Watch time verified. Credits have been issued.");
    } catch (error: unknown) {
      setMessage(errorMessage(error, "Failed to verify watch time"));
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    setLoading(true);
    const platformUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    
    // Embed and encode user's referral code inside the branded link, fallback to profileId
    const refToken = referralCode ? btoa(referralCode) : btoa(profileId);
    const shareUrl = `${platformUrl}/ref/${refToken}`;
    const shareText = `${task.title}\n\n${task.description}\n\n${shareUrl}`;

    try {
      if (task.taskType === "visit_url") {
        const { sessionId, url } = await startTask(task.id);
        setVisitSessionId(sessionId);
        window.open(url, "_blank");
        setMessage("Visit started. Return after the required dwell time to complete verification.");
        return;
      }

      if (task.taskType === "watch_media") {
        const { sessionId } = await startTask(task.id);
        setWatchSessionId(sessionId);
        setWatchedSeconds(0);
        setWatchSubmitted(false);
        setMessage("Watch started. Verification unlocks after the required watch time.");
        return;
      }

      if (navigator.share) {
        await navigator.share({
          title: task.title,
          text: task.description || undefined,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        setMessage("Link copied. The task is now waiting for admin validation.");
      }

      if (!isFinished) {
        const res = await completeInternalTask(task.id);
        if (res.success) {
          setMessage("Task submitted. Credits will be issued after validation.");
        }
      }
    } catch (error: unknown) {
      if (!isAbortError(error)) {
        setMessage(errorMessage(error, "Failed to share task"));
      }
    } finally {
      setLoading(false);
    }
  };

  const isVideoUrl = (url: string | null | undefined) => {
    if (!url) return false;
    const extension = url.split("?")[0].split(".").pop()?.toLowerCase();
    return ["mp4", "webm", "ogg", "mov", "quicktime"].includes(extension || "");
  };

  const isVideo = isVideoUrl(task.mediaUrl);

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-xl border border-slate-800 bg-slate-900/50 p-3.5 sm:p-4">
      <div>
        <h3 className="line-clamp-1 text-base font-semibold text-slate-100 sm:text-lg">{task.title}</h3>
        <p className="mt-1 hidden text-sm text-slate-400 sm:line-clamp-2 sm:block">{task.description}</p>
        <TaskStatusLine summary={summary} message={message} />
      </div>
      {task.mediaUrl && (
        <div className="relative mt-3 flex h-32 items-center justify-center overflow-hidden rounded-md border border-white/5 bg-slate-950">
          {isVideo ? (
            <video
              src={task.mediaUrl}
              controls
              muted
              playsInline
              onTimeUpdate={(event) => {
                const seconds = Math.floor(event.currentTarget.currentTime);
                setWatchedSeconds((current) => Math.max(current, seconds));
                if (task.taskType === "watch_media" && seconds >= 30) {
                  void submitWatchCompletion(seconds);
                }
              }}
              className="w-full h-full object-contain rounded-md"
            />
          ) : (
            // Native image keeps sponsored media URLs flexible across providers.
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={task.mediaUrl}
              alt={task.title}
              className="w-full h-full object-contain rounded-md"
            />
          )}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between border-t border-slate-800/50 pt-3">
        <div className="text-sm font-semibold text-cyan-400">+{task.rewardCredits} Credits</div>
        <div className="flex items-center gap-1.5">
          <Link className="hidden min-h-9 items-center rounded-[5px] border border-white/10 px-2.5 py-1.5 text-xs font-semibold text-slate-200 sm:inline-flex" href={`/tasks/${task.id}`}>
            Details
          </Link>
          <Button
            className="min-h-9 px-2.5 text-sm"
            onClick={visitSessionId ? submitVisitCompletion : watchSessionId ? () => submitWatchCompletion(watchedSeconds) : handleShare}
            disabled={isFinished || hasPending || loading || (task.taskType === "watch_media" && Boolean(watchSessionId) && (watchSubmitted || watchedSeconds < 30))}
            variant={isFinished ? "secondary" : "primary"}
          >
            {loading ? <Loader2 className="w-4 h-4 mr-2 animate-spin" /> : null}
            {isFinished ? (
              <><CheckCircle2 className="w-4 h-4 mr-2" /> Submitted</>
            ) : visitSessionId ? (
              <>Complete Visit</>
            ) : task.taskType === "visit_url" ? (
              <>Visit</>
            ) : task.taskType === "watch_media" ? (
              <>{watchSubmitted ? "Submitted" : watchSessionId ? "Complete Watch" : "Start Watch"}</>
            ) : (
              <><Share2 className="w-4 h-4 mr-2" /> Share</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}
