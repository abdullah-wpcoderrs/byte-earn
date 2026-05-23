import type { ReactNode } from "react";
import { X } from "lucide-react";
import { Button } from "./button";

type SheetProps = {
  children: ReactNode;
  onClose: () => void;
  open: boolean;
  title: string;
};

export function Sheet({ children, onClose, open, title }: SheetProps) {
  if (!open) {
    return null;
  }

  return (
    <div className="fixed inset-0 z-50 bg-slate-950/66 backdrop-blur-sm">
      <aside className="glass-strong fixed inset-x-0 bottom-0 max-h-[88svh] overflow-y-auto rounded-b-none p-4 md:inset-y-0 md:left-auto md:right-0 md:w-[420px] md:rounded-[5px]">
        <div className="mb-4 flex items-center justify-between gap-3">
          <h2 className="text-base font-semibold">{title}</h2>
          <Button aria-label="Close sheet" className="size-9 px-0" icon={<X className="size-4" />} onClick={onClose} variant="ghost" />
        </div>
        {children}
      </aside>
    </div>
  );
}
