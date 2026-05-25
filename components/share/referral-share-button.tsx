"use client";

import { Check, Clipboard, Send } from "lucide-react";
import { useState } from "react";
import { buildReferralUrl, buildShareCaption } from "@/lib/share";

type ReferralShareButtonProps = {
  action?: "copy-url" | "share";
  className?: string;
  label?: string;
  referralCode?: string;
};

async function copyToClipboard(text: string) {
  if (navigator.clipboard?.writeText && window.isSecureContext) {
    try {
      await navigator.clipboard.writeText(text);
      return;
    } catch {
      // Fall back below for browsers that expose the Clipboard API but deny it.
    }
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.select();
  textarea.setSelectionRange(0, textarea.value.length);

  try {
    const copied = document.execCommand("copy");
    if (!copied) {
      throw new Error("Clipboard copy failed.");
    }
  } finally {
    document.body.removeChild(textarea);
  }
}

export function ReferralShareButton({ action = "share", className, label = "Share", referralCode = "BEDEMO24" }: ReferralShareButtonProps) {
  const [status, setStatus] = useState<"idle" | "copied" | "failed">("idle");

  async function handleShare() {
    const referralUrl = buildReferralUrl(referralCode);
    const text = action === "copy-url" ? referralUrl : buildShareCaption(referralCode);

    setStatus("idle");

    try {
      if (action === "share" && navigator.share) {
        await navigator.share({
          text,
          title: "Join me on byte-earn",
          url: referralUrl,
        });
      } else {
        await copyToClipboard(text);
      }

      setStatus("copied");
      window.setTimeout(() => setStatus("idle"), 2200);
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") {
        return;
      }

      setStatus("failed");
      window.setTimeout(() => setStatus("idle"), 2200);
    }
  }

  const currentLabel = status === "copied" ? (action === "share" ? "Shared" : "Copied") : status === "failed" ? "Try again" : label;

  return (
    <button
      className={
        className ??
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
      }
      onClick={handleShare}
      type="button"
    >
      {status === "copied" ? <Check className="size-4" /> : action === "copy-url" ? <Clipboard className="size-4" /> : <Send className="size-4" />}
      {currentLabel}
    </button>
  );
}
