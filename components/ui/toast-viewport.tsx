"use client";

import { X } from "lucide-react";
import { usePathname, useRouter, useSearchParams } from "next/navigation";
import { useEffect, useMemo, useRef, useState } from "react";
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
      invalid_credits: { body: "Enter a credit amount greater than zero.", title: "Invalid credit amount" },
      invalid_email: { body: "Email subject, body, and audience are required.", title: "Email blast not saved" },
      invalid_notification: { body: "Notification title, body, and audience are required.", title: "Notification not sent" },
      invalid_post: { body: "This post id is invalid.", title: "Moderation failed" },
      invalid_post_type: { body: "Choose one of the supported post types.", title: "Post not submitted" },
      invalid_transition: { body: "This withdrawal cannot move to that state.", title: "Invalid review state" },
      invalid_withdrawal: { body: "This withdrawal id is invalid.", title: "Review failed" },
      missing_post: { body: "This post no longer exists.", title: "Post not found" },
      missing_withdrawal: { body: "This withdrawal no longer exists.", title: "Withdrawal not found" },
      no_users: { body: "Select at least one user before applying a bulk action.", title: "No users selected" },
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
      email_blast: { body: "The email blast was saved.", title: "Email blast saved" },
      badge: { body: "The custom badge was created.", title: "Badge created" },
      payment_verified: { body: "Payment verified. Complete onboarding to enter the app.", title: "Payment verified" },
      platform: { body: "Platform settings were saved.", title: "Platform updated" },
      post_published: { body: "Your post is live in the feed.", title: "Post published" },
      post_submitted: { body: "Your post was submitted for moderation.", title: "Post submitted" },
      users: { body: "The selected user records were updated.", title: "Users updated" },
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

  return messages;
}

export function ToastViewport() {
  const pathname = usePathname();
  const router = useRouter();
  const searchParams = useSearchParams();
  const messages = useMemo(() => getToastMessages(searchParams), [searchParams]);
  const handledKeyRef = useRef("");
  const [dismissed, setDismissed] = useState<string[]>([]);

  const visible = messages.filter((message) => !dismissed.includes(message.id));

  useEffect(() => {
    const toastKeys = ["admin", "auth", "auth_error", "error", "onboarding", "payment_error", "updated", "withdrawal", "withdrawal_error"];
    const handledKey = `${pathname}?${searchParams.toString()}`;

    if (messages.length === 0 || handledKeyRef.current === handledKey) {
      return;
    }

    const nextParams = new URLSearchParams(searchParams.toString());
    toastKeys.forEach((key) => nextParams.delete(key));
    handledKeyRef.current = handledKey;

    const nextUrl = nextParams.toString() ? `${pathname}?${nextParams.toString()}` : pathname;
    window.setTimeout(() => router.replace(nextUrl, { scroll: false }), 50);
  }, [messages.length, pathname, router, searchParams]);

  if (visible.length === 0) {
    return null;
  }

  return (
    <div className="fixed right-4 top-4 z-50 grid w-[min(360px,calc(100vw-2rem))] gap-2" role="status" aria-live="polite">
      {visible.map((message) => (
        <div className="relative" key={message.id}>
          <Toast title={message.title} tone={message.tone}>
            {message.body}
          </Toast>
          <button
            aria-label="Dismiss notification"
            className="absolute right-2 top-2 grid size-7 place-items-center rounded-[5px] text-slate-300 transition hover:bg-white/10 hover:text-white"
            onClick={() => setDismissed((current) => [...current, message.id])}
            type="button"
          >
            <X className="size-4" />
          </button>
        </div>
      ))}
    </div>
  );
}
