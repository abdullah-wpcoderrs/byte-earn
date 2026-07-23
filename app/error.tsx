"use client";

import { RotateCcw } from "lucide-react";

export default function Error({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  void error;

  return (
    <main className="grid min-h-screen place-items-center px-4 text-[11px] text-white">
      <section className="glass-strong w-full max-w-md p-5">
        <p className="text-muted">Something interrupted this request</p>
        <h1 className="mt-1 text-[28px] font-semibold leading-tight">Try again</h1>
        <p className="mt-3 leading-5 text-slate-300">The page could not finish loading. Please retry, or return to the previous screen.</p>
        <button
          className="mt-5 inline-flex min-h-10 items-center justify-center gap-2 rounded-[5px] bg-cyan-300 px-3 font-semibold text-slate-950"
          onClick={reset}
          type="button"
        >
          <RotateCcw className="size-4" />
          Retry
        </button>
      </section>
    </main>
  );
}
