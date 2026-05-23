import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

type ModalProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function Modal({ children, onClose, open, title }: ModalProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-slate-950/72 px-4 backdrop-blur-sm">
      <section className="glass-strong w-full max-w-md p-4">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button aria-label="Close modal" className="size-9 px-0" icon={<X className="size-4" />} onClick={onClose} variant="ghost" />
        </div>
        {children}
      </section>
    </div>
  );
}
