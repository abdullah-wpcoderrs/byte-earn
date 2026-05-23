"use client";

import { Check, Send } from "lucide-react";
import { useState } from "react";
import { buildShareCaption } from "@/lib/share";

type ReferralShareButtonProps = {
  className?: string;
  label?: string;
  referralCode?: string;
};

export function ReferralShareButton({ className, label = "Share", referralCode = "BEDEMO24" }: ReferralShareButtonProps) {
  const [copied, setCopied] = useState(false);

  async function handleShare() {
    const text = buildShareCaption(referralCode);

    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2200);
    } catch {
      setCopied(false);
    }

    if (navigator.share) {
      try {
        await navigator.share({
          text,
          title: "Join me on byte-earn",
          url: text.match(/https?:\/\/\S+/)?.[0],
        });
      } catch {
        // The user can cancel the native share sheet without it being an app error.
      }
    }
  }

  return (
    <button
      className={
        className ??
        "inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950 transition hover:bg-cyan-200"
      }
      onClick={handleShare}
      type="button"
    >
      {copied ? <Check className="size-4" /> : <Send className="size-4" />}
      {copied ? "Copied" : label}
    </button>
  );
}
