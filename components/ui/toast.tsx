import type { ReactNode } from "react";
import { CheckCircle2, Info, TriangleAlert } from "lucide-react";
import { cn } from "./utils";

type ToastTone = "info" | "success" | "warning";

type ToastProps = {
  children: ReactNode;
  tone?: ToastTone;
  title: string;
};

const tones: Record<ToastTone, string> = {
  info: "border-cyan-200/20 bg-cyan-300/10 text-cyan-50",
  success: "border-emerald-300/20 bg-emerald-300/10 text-emerald-50",
  warning: "border-amber-300/20 bg-amber-300/10 text-amber-50",
};

const icons = {
  info: Info,
  success: CheckCircle2,
  warning: TriangleAlert,
};

export function Toast({ children, title, tone = "info" }: ToastProps) {
  const Icon = icons[tone];

  return (
    <div className={cn("flex items-start gap-3 rounded-[5px] border p-3 shadow-2xl backdrop-blur", tones[tone])}>
      <Icon className="mt-0.5 size-4 shrink-0" />
      <div>
        <p className="font-semibold">{title}</p>
        <p className="mt-1 leading-5 text-slate-300">{children}</p>
      </div>
    </div>
  );
}
