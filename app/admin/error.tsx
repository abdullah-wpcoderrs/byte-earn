"use client";

import { RotateCcw } from "lucide-react";

export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <section className="glass-strong p-5">
      <p className="text-muted">Admin request failed</p>
      <h1 className="mt-1 text-[28px] font-semibold leading-tight">Review needed</h1>
      <p className="mt-3 leading-5 text-slate-300">{error.message || "The admin console could not complete the request."}</p>
      <button
        className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950"
        onClick={reset}
        type="button"
      >
        <RotateCcw className="size-4" />
        Retry
      </button>
    </section>
  );
}
