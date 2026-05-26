"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { Toast } from "@/components/ui/toast";

type ToastMessage = {
  body: string;
  id: string;
  title: string;
  tone: "info" | "success" | "warning";
};

function getToastMessages(searchParams: URLSearchParams): ToastMessage[] {
  const messages: ToastMessage[] = [];
  const authError = searchParams.get("auth_error");
  const paymentError = searchParams.get("payment_error");
  const error = searchParams.get("error");
  const withdrawal = searchParams.get("withdrawal");
  const withdrawalError = searchParams.get("withdrawal_error");
  const updated = searchParams.get("updated");
  const admin = searchParams.get("admin");
  const onboarding = searchParams.get("onboarding");
  const auth = searchParams.get("auth");

  if (authError) {
    messages.push({ body: authError, id: `auth_error:${authError}`, title: "Authentication failed", tone: "warning" });
  }

  if (paymentError) {
    const copy: Record<string, string> = {
      missing_reference: "The payment callback did not include a reference.",
      not_successful: "The payment was not successful. Please try again.",
      rate_limited: "Too many payment attempts. Please wait and try again.",
      unknown_reference: "We could not match this payment reference.",
    };
    messages.push({ body: copy[paymentError] ?? paymentError.replace(/_/g, " "), id: `payment_error:${paymentError}`, title: "Payment update", tone: "warning" });
  }

  if (error) {
    const copy: Record<string, { body: string; title: string }> = {
      invalid_action: { body: "That action is not available for this item.", title: "Action unavailable" },
      invalid_badge: { body: "Badge name and description are required.", title: "Badge not created" },
      invalid_blast: { body: "This email blast id is invalid.", title: "Email not sent" },
      invalid_credits: { body: "Enter a credit amount greater than zero.", title: "Invalid credit amount" },
      invalid_email: { body: "Check the email fields and try again.", title: "Invalid email details" },
      invalid_finance_settings: { body: "Enter positive values for credits, USD, and NGN rate.", title: "Rates not saved" },
      invalid_notification: { body: "Notification title, body, and audience are required.", title: "Notification not sent" },
      invalid_profile_badge: { body: "Choose a valid user and badge before assigning.", title: "Badge action failed" },
      invalid_audio_file: { body: "Audio posts require an MP3 audio file.", title: "Audio file not supported" },
      invalid_media_file: { body: "Choose a media file that matches the selected post type.", title: "Media file not supported" },
      invalid_post: { body: "This post id is invalid.", title: "Moderation failed" },
      invalid_post_type: { body: "Choose one of the supported post types.", title: "Post not submitted" },
      invalid_reward: { body: "Choose a valid reward and non-negative credit amount.", title: "Reward not saved" },
      invalid_transition: { body: "This item cannot move to that state.", title: "Invalid review state" },
      audio_required: { body: "Add an audio file for image plus MP3 posts.", title: "Audio file required" },
      file_too_large: { body: "This file is above the platform upload limit set by admin.", title: "File too large" },
      media_required: { body: "Add a media file before submitting your post.", title: "Media file required" },
      missing_reward: { body: "This reward rule no longer exists.", title: "Reward not found" },
      invalid_withdrawal: { body: "This withdrawal id is invalid.", title: "Review failed" },
      missing_post: { body: "This post no longer exists.", title: "Post not found" },
      already_sending: { body: "This email blast is already sending.", title: "Email already in progress" },
      missing_blast: { body: "This email blast no longer exists.", title: "Email not found" },
      missing_name: { body: "Enter a display name for this user.", title: "User not created" },
      missing_service_role: { body: "Configure the Supabase service role key before sending email blasts.", title: "Email not sent" },
      missing_withdrawal: { body: "This withdrawal no longer exists.", title: "Withdrawal not found" },
      no_users: { body: "Select at least one user before applying a bulk action.", title: "No users selected" },
      reward_above_maximum: { body: "This credit amount is above the configured admin reward limit.", title: "Reward limit exceeded" },
      reward_below_minimum: { body: "This credit amount is below the configured admin reward minimum.", title: "Reward below minimum" },
      reward_disabled: { body: "This reward action is currently disabled by admin configuration.", title: "Reward disabled" },
      weak_password: { body: "Use a password with at least 8 characters.", title: "Password too weak" },
    };
    const selected = copy[error] ?? { body: error.replace(/_/g, " "), title: "Request failed" };
    messages.push({ body: selected.body, id: `error:${error}`, title: selected.title, tone: "warning" });
  }

  if (withdrawalError) {
    const copy: Record<string, string> = {
      invalid_amount: "Enter a valid withdrawal amount.",
    };
    messages.push({ body: copy[withdrawalError] ?? withdrawalError.replace(/_/g, " "), id: `withdrawal_error:${withdrawalError}`, title: "Withdrawal not submitted", tone: "warning" });
  }

  if (withdrawal === "requested") {
    messages.push({ body: "Your withdrawal request was submitted for admin review.", id: "withdrawal:requested", title: "Withdrawal requested", tone: "success" });
  }

  if (updated) {
    const copy: Record<string, { body: string; title: string }> = {
      account_created: { body: "Your account was created. Continue through the activation flow.", title: "Account created" },
      login: { body: "You are signed in and ready to continue.", title: "Welcome back" },
      leaderboard: { body: "Leaderboard rules were saved.", title: "Leaderboard updated" },
      moderation: { body: "The moderation decision was saved.", title: "Moderation updated" },
      notification: { body: "The platform notification was created.", title: "Notification created" },
      notification_archived: { body: "The notification was archived and hidden from user trays.", title: "Notification archived" },
      notification_deleted: { body: "The notification was deleted.", title: "Notification deleted" },
      email_blast: { body: "The email blast was saved.", title: "Email blast saved" },
      email_blast_deleted: { body: "The draft or failed email blast was deleted.", title: "Email blast deleted" },
      email_blast_duplicated: { body: "A draft copy of the email blast was created.", title: "Email blast duplicated" },
      email_blast_updated: { body: "The email blast draft was updated.", title: "Email blast updated" },
      email_sent: { body: "The email blast was sent to eligible recipients.", title: "Email sent" },
      badge: { body: "The custom badge was created.", title: "Badge created" },
      badge_assigned: { body: "The badge was assigned to the user.", title: "Badge assigned" },
      badge_removed: { body: "The badge was removed from the user.", title: "Badge removed" },
      payment_verified: { body: "Payment verified. Complete onboarding to enter the app.", title: "Payment verified" },
      platform: { body: "Platform settings were saved.", title: "Platform updated" },
      post_published: { body: "Your post is live in the feed.", title: "Post published" },
      post_submitted: { body: "Your post was submitted for moderation.", title: "Post submitted" },
      finance_settings: { body: "Credit conversion rates were saved.", title: "Rates updated" },
      reward_rule: { body: "Reward rule was saved.", title: "Reward updated" },
      users: { body: "The selected user records were updated.", title: "Users updated" },
      user_created: { body: "The user account was created.", title: "User created" },
      withdrawal: { body: "The withdrawal review was saved.", title: "Withdrawal updated" },
    };
    const selected = copy[updated] ?? { body: `${updated.replace(/_/g, " ")} was updated successfully.`, title: "Saved" };
    messages.push({ body: selected.body, id: `updated:${updated}`, title: selected.title, tone: "success" });
  }

  if (admin === "forbidden") {
    messages.push({ body: "Your account does not have admin access.", id: "admin:forbidden", title: "Access restricted", tone: "warning" });
  }

  if (onboarding === "saved") {
    messages.push({ body: "Your profile and payout details are saved.", id: "onboarding:saved", title: "Onboarding complete", tone: "success" });
  }

  if (auth === "required") {
    messages.push({ body: "Sign in to continue.", id: "auth:required", title: "Session required", tone: "info" });
  }

  if (auth === "logged_out") {
    messages.push({ body: "You have been signed out.", id: "auth:logged_out", title: "Signed out", tone: "success" });
  }

  return messages;
}

export function ToastViewport() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const messages = useMemo(() => getToastMessages(searchParams), [searchParams]);
  const handledKeyRef = useRef("");
  const [dismissed, setDismissed] = useState<string[]>([]);
  const [queuedMessages, setQueuedMessages] = useState<ToastMessage[]>([]);

  const visible = queuedMessages.filter((message) => !dismissed.includes(message.id));

  useEffect(() => {
    const toastKeys = ["admin", "auth", "auth_error", "error", "onboarding", "payment_error", "updated", "withdrawal", "withdrawal_error"];
    const handledKey = `${pathname}?${searchParams.toString()}`;

    if (messages.length === 0 || handledKeyRef.current === handledKey) {
      return;
    }

    setQueuedMessages((current) => {
      const next = [...current];
      messages.forEach((message) => {
        const existingIndex = next.findIndex((queued) => queued.id === message.id);
        if (existingIndex >= 0) {
          next[existingIndex] = message;
        } else {
          next.push(message);
        }
      });
      return next.slice(-4);
    });
    setDismissed((current) => current.filter((id) => !messages.some((message) => message.id === id)));

    const nextParams = new URLSearchParams(searchParams.toString());
    toastKeys.forEach((key) => nextParams.delete(key));
    handledKeyRef.current = handledKey;

    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    window.setTimeout(() => router.replace(nextUrl, { scroll: false }), 50);
  }, [messages, messages.length, pathname, router, searchParams]);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-50 grid w-[min(360px,calc(100vw-2rem))] gap-2" role="status" aria-live="polite">
      {visible.map((message) => (
        <ToastItem key={message.id} message={message} onDismiss={() => setDismissed((current) => [...current, message.id])} />
      ))}
    </div>
  );
}

type ToastItemProps = {
  message: ToastMessage;
  onDismiss: () => void;
};

function ToastItem({ message, onDismiss }: ToastItemProps) {
  const [dragX, setDragX] = useState(0);
  const [isInteracting, setIsInteracting] = useState(false);
  const startXRef = useRef(0);
  const timeoutRef = useRef<number | null>(null);

  const clearDismissTimer = useCallback(() => {
    if (timeoutRef.current) {
      window.clearTimeout(timeoutRef.current);
      timeoutRef.current = null;
    }
  }, []);

  useEffect(() => {
    clearDismissTimer();

    if (!isInteracting) {
      timeoutRef.current = window.setTimeout(onDismiss, 3000);
    }

    return clearDismissTimer;
  }, [clearDismissTimer, isInteracting, message.id, onDismiss]);

  const finishDrag = useCallback(() => {
    if (Math.abs(dragX) > 96) {
      onDismiss();
      return;
    }

    setDragX(0);
    setIsInteracting(false);
  }, [dragX, onDismiss]);

  return (
    <div
      className="relative transition-[opacity,transform] duration-150"
      onBlur={() => setIsInteracting(false)}
      onFocus={() => setIsInteracting(true)}
      onMouseEnter={() => setIsInteracting(true)}
      onMouseLeave={() => setIsInteracting(false)}
      onPointerCancel={() => {
        setDragX(0);
        setIsInteracting(false);
      }}
      onPointerDown={(event) => {
        startXRef.current = event.clientX;
        setIsInteracting(true);
        event.currentTarget.setPointerCapture(event.pointerId);
      }}
      onPointerMove={(event) => {
        if (!isInteracting) return;
        setDragX(event.clientX - startXRef.current);
      }}
      onPointerUp={finishDrag}
      style={{
        opacity: Math.max(0.35, 1 - Math.abs(dragX) / 220),
        transform: `translateX(${dragX}px)`,
        touchAction: "pan-y",
      }}
    >
      <Toast title={message.title} tone={message.tone}>
        {message.body}
      </Toast>
      <button
        aria-label="Dismiss notification"
        className="absolute right-2 top-2 grid size-8 place-items-center rounded-[5px] text-slate-300 transition hover:bg-white/10 hover:text-white"
        onClick={(event) => {
          event.stopPropagation();
          onDismiss();
        }}
        type="button"
      >
        <X className="size-4" />
      </button>
    </div>
  );
}
