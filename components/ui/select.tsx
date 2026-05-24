import type { SelectHTMLAttributes } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "./utils";

type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & {
  label: string;
};

export function Select({ className, label, children, ...props }: SelectProps) {
  return (
    <label className="grid gap-2">
      <span className="font-medium text-slate-200">{label}</span>
      <span className="relative">
        <select
          className={cn(
            "min-h-9 w-full appearance-none rounded-[5px] border border-white/10 bg-[#101f37] px-2.5 pr-8 text-white outline-none transition focus:border-cyan-200/55",
            className,
          )}
          {...props}
        >
          {children}
        </select>
        <ChevronDown className="pointer-events-none absolute right-2 top-1/2 size-4 -translate-y-1/2 text-slate-100" />
      </span>
    </label>
  );
}
