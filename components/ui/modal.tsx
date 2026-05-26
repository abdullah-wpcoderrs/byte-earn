"use client";

import type { ReactNode } from "react";
import { createPortal } from "react-dom";
import { X } from "lucide-react";
import { Button } from "./button";
import { cn } from "./utils";

type ModalProps = {
  children: ReactNode;
  className?: string;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function Modal({ children, className, onClose, open, title }: ModalProps) {
  if (!open || typeof document === "undefined") {
    return null;
  }

  return createPortal(
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/78 px-4 py-6 backdrop-blur-sm" onClick={onClose}>
      <section className={cn("glass-strong flex max-h-[calc(100svh-3rem)] w-full max-w-md flex-col overflow-hidden p-4", className)} onClick={(event) => event.stopPropagation()}>
        <div className="mb-4 flex shrink-0 items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button aria-label="Close modal" className="size-9 px-0" icon={<X className="size-4" />} onClick={onClose} variant="ghost" />
        </div>
        <div className="app-scrollbar min-h-0 overflow-y-auto pr-1">{children}</div>
      </section>
    </div>,
    document.body,
  );
}
