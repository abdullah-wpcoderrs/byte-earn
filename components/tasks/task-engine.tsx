"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { type SponsoredTask, type TaskSessionSummary } from "@/lib/tasks-data";
import { completeInternalShareTask, completeInternalVisitTask, completeInternalWatchTask, startTask } from "@/app/(app)/tasks/actions";
import { Button } from "@/components/ui/button";
import { CheckCircle2, Loader2, Share2 } from "lucide-react";

interface TaskEngineProps {
  tasks: SponsoredTask[];
  progress: Map<string, number>;
  sessionSummary: Map<string, TaskSessionSummary>;
  profileId: string;
  referralCode?: string;
}

export function TaskEngine({ tasks, progress, sessionSummary, profileId, referralCode }: TaskEngineProps) {
  const router = useRouter();
  const cpaTasks = tasks.filter((task) => task.provider === "cpagrip");
  const smartLinkTasks = tasks.filter((task) => task.provider === "adsterra");
  const internalTasks = tasks.filter((task) => task.provider === "internal");
  const hasPendingSessions = Array.from(sessionSummary.values()).some((summary) => summary.pending > 0 || summary.suspicious > 0);

  useEffect(() => {
    if (!hasPendingSessions) return;

    const interval = window.setInterval(() => {
      router.refresh();
    }, 30_000);

    return () => window.clearInterval(interval);
  }, [hasPendingSessions, router]);

  return (
    <div className="space-y-8">
      {cpaTasks.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Partner Offers</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {cpaTasks.map((task) => (
              <TaskCard key={task.id} task={task} completed={progress.get(task.id) || 0} summary={sessionSummary.get(task.id)} />
            ))}
          </div>
        </section>
      )}

      {smartLinkTasks.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Daily Ad Rewards</h2>
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {smartLinkTasks.map((task) => (
              <AdsterraCard key={task.id} task={task} completed={progress.get(task.id) || 0} summary={sessionSummary.get(task.id)} />
            ))}
          </div>
        </section>
      )}

      {internalTasks.length > 0 && (
        <section>
          <h2 className="mb-4 text-lg font-semibold">Sponsored Campaigns</h2>
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

function TaskStatusLine({ fallbackUrl, summary, message }: { fallbackUrl?: string | null; summary?: TaskSessionSummary; message?: string | null }) {
  const text = message ?? statusText(summary);
  if (!text) return null;

  return (
    <p className="mt-3 rounded-[5px] border border-cyan-500/20 bg-cyan-500/10 px-3 py-2 text-xs leading-5 text-cyan-100">
      {text}
      {fallbackUrl ? (
        <a className="ml-2 font-semibold underline underline-offset-4" href={fallbackUrl} rel="noreferrer" target="_blank">
          Open task
        </a>
      ) : null}
    </p>
  );
}

function errorMessage(error: unknown, fallback: string) {
  if (!(error instanceof Error)) return fallback;

  const safeFragments = [
    "Daily limit reached",
    "New accounts have",
    "Please wait",
    "Sponsored tasks are currently disabled",
    "Task limit reached",
    "Task URL is not configured",
    "This visit session has expired",
    "This watch session has expired",
    "You already have this task pending verification",
    "You have reached today",
    "at least 30 seconds",
    "at least 60 seconds",
  ];

  return safeFragments.some((fragment) => error.message.includes(fragment)) ? error.message : fallback;
}

function isAbortError(error: unknown) {
  return error instanceof Error && error.name === "AbortError";
}

function openPendingTaskWindow() {
  const popup = window.open("about:blank", "_blank");
  if (popup) {
    popup.opener = null;
  }
  return popup;
}

function sendTaskWindow(popup: Window | null, url: string) {
  if (popup && !popup.closed) {
    popup.location.href = url;
    return true;
  }

  return Boolean(window.open(url, "_blank"));
}

function closePendingTaskWindow(popup: Window | null) {
  if (popup && !popup.closed) {
    popup.close();
  }
}

function TaskCard({ task, completed, summary }: { task: SponsoredTask; completed: number; summary?: TaskSessionSummary }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const isFinished = completed >= task.limitPerUser;
  const hasPending = (summary?.pending ?? 0) > 0 || (summary?.suspicious ?? 0) > 0;

  const handleStart = async () => {
    const popup = openPendingTaskWindow();
    setFallbackUrl(null);
    setLoading(true);

    try {
      const { url } = await startTask(task.id);
      const opened = sendTaskWindow(popup, url);
      setFallbackUrl(opened ? null : url);
      setMessage(opened ? "Offer started. Credits issue after the partner confirms the conversion." : "Offer session started, but the new tab was blocked.");
    } catch (error: unknown) {
      closePendingTaskWindow(popup);
      setMessage(errorMessage(error, "Failed to start task"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-[5px] border border-white/10 bg-white/[0.045] p-4 transition hover:border-cyan-200/25 hover:bg-white/[0.06]">
      <div>
        <h3 className="line-clamp-1 text-base font-semibold text-slate-100 sm:text-lg">{task.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-400">{task.description}</p>
        <TaskStatusLine fallbackUrl={fallbackUrl} summary={summary} message={message} />
      </div>
      <div className="mt-5 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="font-semibold text-cyan-300">+{task.rewardCredits} credits</div>
        <div className="flex items-center gap-2">
          <Link className="inline-flex min-h-10 items-center rounded-[5px] px-2.5 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100 sm:px-3" href={`/tasks/${task.id}`}>
            Details
          </Link>
          <Button className="min-h-11 px-4" onClick={handleStart} disabled={isFinished || hasPending || loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {isFinished ? "Completed" : "Start"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function AdsterraCard({ task, completed, summary }: { task: SponsoredTask; completed: number; summary?: TaskSessionSummary }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const isFinished = completed >= task.limitPerUser;
  const hasPending = (summary?.pending ?? 0) > 0 || (summary?.suspicious ?? 0) > 0;
  const progressPercent = Math.min(100, Math.round((completed / task.limitPerUser) * 100));

  const handleStart = async () => {
    const popup = openPendingTaskWindow();
    setFallbackUrl(null);
    setLoading(true);

    try {
      const { url } = await startTask(task.id);
      const opened = sendTaskWindow(popup, url);
      setFallbackUrl(opened ? null : url);
      setMessage(opened ? "Ad started. Rewards stay pending until Adsterra reports the click or revenue." : "Ad session started, but the new tab was blocked.");
    } catch (error: unknown) {
      closePendingTaskWindow(popup);
      setMessage(errorMessage(error, "Failed to start ad"));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="flex flex-col justify-between rounded-[5px] border border-white/10 bg-white/[0.045] p-4 transition hover:border-cyan-200/25 hover:bg-white/[0.06]">
      <div>
        <h3 className="line-clamp-1 text-base font-semibold text-slate-100 sm:text-lg">{task.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-400">{task.description}</p>
        <TaskStatusLine fallbackUrl={fallbackUrl} summary={summary} message={message} />
      </div>
      <div className="mb-2 mt-4">
        <div className="mb-2 flex justify-between text-xs font-medium text-slate-300">
          <span>Progress</span>
          <span>{completed} / {task.limitPerUser}</span>
        </div>
        <div className="h-2 w-full rounded-full bg-white/10">
          <div className="h-2 rounded-full bg-cyan-500 transition-all duration-300" style={{ width: `${progressPercent}%` }} />
        </div>
      </div>
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-4">
        <div className="text-sm font-semibold text-cyan-300">+{task.rewardCredits} credits</div>
        <div className="flex items-center gap-2">
          <Link className="inline-flex min-h-10 items-center rounded-[5px] px-2.5 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100 sm:px-3" href={`/tasks/${task.id}`}>
            Details
          </Link>
          <Button className="min-h-11 px-4" onClick={handleStart} disabled={isFinished || hasPending || loading}>
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {isFinished ? "Completed" : "Watch"}
          </Button>
        </div>
      </div>
    </div>
  );
}

function InternalTaskCard({ task, completed, summary, profileId, referralCode }: { task: SponsoredTask; completed: number; summary?: TaskSessionSummary; profileId: string; referralCode?: string }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [fallbackUrl, setFallbackUrl] = useState<string | null>(null);
  const [visitSessionId, setVisitSessionId] = useState<string | null>(task.taskType === "visit_url" ? summary?.latestPendingSessionId ?? null : null);
  const [watchSessionId, setWatchSessionId] = useState<string | null>(task.taskType === "watch_media" ? summary?.latestPendingSessionId ?? null : null);
  const [watchedSeconds, setWatchedSeconds] = useState(0);
  const [watchSubmitted, setWatchSubmitted] = useState(false);
  const [shareSessionId, setShareSessionId] = useState<string | null>(task.taskType !== "visit_url" && task.taskType !== "watch_media" ? summary?.latestPendingSessionId ?? null : null);
  const [shareSeconds, setShareSeconds] = useState(60);
  const isFinished = completed >= task.limitPerUser;
  const hasPending = ((summary?.pending ?? 0) > 0 && !visitSessionId && !watchSessionId && !shareSessionId) || (summary?.suspicious ?? 0) > 0;

  useEffect(() => {
    let interval: ReturnType<typeof setInterval> | undefined;
    if (shareSessionId && shareSeconds > 0) {
      interval = setInterval(() => {
        setShareSeconds((previous) => previous - 1);
      }, 1000);
    }
    return () => {
      if (interval) clearInterval(interval);
    };
  }, [shareSessionId, shareSeconds]);

  const submitVisitCompletion = async () => {
    if (!visitSessionId) return;
    setLoading(true);
    try {
      await completeInternalVisitTask(visitSessionId);
      setVisitSessionId(null);
      setFallbackUrl(null);
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

  const submitShareCompletion = async () => {
    if (!shareSessionId || shareSeconds > 0) return;
    setLoading(true);
    try {
      await completeInternalShareTask(shareSessionId);
      setShareSessionId(null);
      setMessage("Share verified. Credits have been issued.");
    } catch (error: unknown) {
      setMessage(errorMessage(error, "Failed to verify share"));
    } finally {
      setLoading(false);
    }
  };

  const handleShare = async () => {
    setLoading(true);
    const platformUrl = process.env.NEXT_PUBLIC_APP_URL || window.location.origin;
    const refToken = referralCode ? btoa(referralCode) : btoa(profileId);
    const shareUrl = `${platformUrl}/ref/${refToken}`;
    const shareText = `${task.title}\n\n${task.description}\n\n${shareUrl}`;

    try {
      if (task.taskType === "visit_url") {
        const popup = openPendingTaskWindow();
        const { sessionId, url } = await startTask(task.id);
        setVisitSessionId(sessionId);
        const opened = sendTaskWindow(popup, url);
        setFallbackUrl(opened ? null : url);
        setMessage(opened ? "Visit started. Return after the required dwell time to complete verification." : "Visit session started, but the new tab was blocked.");
        return;
      }

      if (task.taskType === "watch_media") {
        setFallbackUrl(null);
        const { sessionId } = await startTask(task.id);
        setWatchSessionId(sessionId);
        setWatchedSeconds(0);
        setWatchSubmitted(false);
        setMessage("Watch started. Verification unlocks after the required watch time.");
        return;
      }

      if (!shareSessionId && !isFinished && !hasPending) {
        setFallbackUrl(null);
        const { sessionId } = await startTask(task.id);
        setShareSessionId(sessionId);
        setShareSeconds(60);
      }

      if (navigator.share) {
        await navigator.share({
          title: task.title,
          text: task.description || undefined,
          url: shareUrl,
        });
      } else {
        await navigator.clipboard.writeText(shareText);
        setMessage("Link copied. Please wait 60 seconds to claim your reward.");
      }
    } catch (error: unknown) {
      if (!isAbortError(error)) {
        setMessage(errorMessage(error, "Failed to share task"));
      }
    } finally {
      setLoading(false);
    }
  };

  const isVideo = isVideoUrl(task.mediaUrl);

  return (
    <div className="flex flex-col justify-between overflow-hidden rounded-[5px] border border-white/10 bg-white/[0.045] p-3.5 transition hover:border-cyan-200/25 hover:bg-white/[0.06] sm:p-4">
      <div>
        <h3 className="line-clamp-1 text-base font-semibold text-slate-100 sm:text-lg">{task.title}</h3>
        <p className="mt-1 line-clamp-2 text-sm text-slate-400">{task.description}</p>
        <TaskStatusLine fallbackUrl={fallbackUrl} summary={summary} message={message} />
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
              className="h-full w-full rounded-md object-contain"
            />
          ) : (
            // Native image keeps sponsored media URLs flexible across providers.
            // eslint-disable-next-line @next/next/no-img-element
            <img src={task.mediaUrl} alt={task.title} className="h-full w-full rounded-md object-contain" />
          )}
        </div>
      )}
      <div className="mt-4 flex items-center justify-between gap-3 border-t border-white/10 pt-3">
        <div className="text-sm font-semibold text-cyan-300">+{task.rewardCredits} credits</div>
        <div className="flex items-center gap-1.5">
          <Link className="inline-flex min-h-10 items-center rounded-[5px] px-2.5 py-2 text-xs font-semibold text-slate-400 transition hover:bg-white/[0.06] hover:text-slate-100 sm:px-3" href={`/tasks/${task.id}`}>
            Details
          </Link>
          <Button
            className="min-h-11 px-3.5 text-sm"
            onClick={
              visitSessionId ? submitVisitCompletion :
              watchSessionId ? () => submitWatchCompletion(watchedSeconds) :
              shareSessionId ? (shareSeconds <= 0 ? submitShareCompletion : undefined) :
              handleShare
            }
            disabled={
              isFinished || hasPending || loading ||
              (task.taskType === "watch_media" && Boolean(watchSessionId) && (watchSubmitted || watchedSeconds < 30)) ||
              (Boolean(shareSessionId) && shareSeconds > 0)
            }
            variant={isFinished ? "secondary" : "primary"}
          >
            {loading ? <Loader2 className="mr-2 size-4 animate-spin" /> : null}
            {isFinished ? (
              <><CheckCircle2 className="mr-2 size-4" /> Submitted</>
            ) : visitSessionId ? (
              <>Complete Visit</>
            ) : task.taskType === "visit_url" ? (
              <>Visit</>
            ) : task.taskType === "watch_media" ? (
              <>{watchSubmitted ? "Submitted" : watchSessionId ? "Complete Watch" : "Start Watch"}</>
            ) : shareSessionId ? (
              <>{shareSeconds > 0 ? `Wait ${shareSeconds}s` : "Complete Share"}</>
            ) : (
              <><Share2 className="mr-2 size-4" /> Share</>
            )}
          </Button>
        </div>
      </div>
    </div>
  );
}

function isVideoUrl(url: string | null | undefined) {
  if (!url) return false;
  const extension = url.split("?")[0].split(".").pop()?.toLowerCase();
  return ["mp4", "webm", "ogg", "mov", "quicktime"].includes(extension || "");
}