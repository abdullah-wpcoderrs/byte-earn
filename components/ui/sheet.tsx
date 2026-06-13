"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./button";

type SheetProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function Sheet({ children, onClose, open, title }: SheetProps) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 bg-slate-950/66 backdrop-blur-sm" onClick={onClose}>
      <aside
        aria-modal="true"
        className="glass-strong fixed inset-x-0 bottom-0 flex max-h-[88svh] flex-col overflow-hidden rounded-b-none p-4 pb-[calc(1rem+env(safe-area-inset-bottom))] md:inset-y-0 md:left-auto md:right-0 md:w-[420px] md:rounded-[5px] md:pb-4"
        onClick={(event) => event.stopPropagation()}
        role="dialog"
      >
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button aria-label="Close sheet" className="size-9 px-0" icon={<X className="size-4" />} onClick={onClose} variant="ghost" />
        </div>
        <div className="app-scrollbar min-h-0 overflow-y-auto pr-1">{children}</div>
      </aside>
    </div>,
    document.body,
  );
}
