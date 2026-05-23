import type { SelectHTMLAttributes } from "react";
import { cn } from "./utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
};

export function Select({ className, label, children, ...props }: SelectProps) {
  return (
    <label className="grid gap-2">
      <span className="font-medium text-slate-200">{label}</span>
      <select
        className={cn(
          "min-h-11 rounded-[5px] border border-white/10 bg-[#101f37] px-3 text-white outline-none transition focus:border-cyan-200/55",
          className,
        )}
        {...props}
      >
        {children}
      </select>
    </label>
  );
}
