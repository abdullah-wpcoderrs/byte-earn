import type { InputHTMLAttributes, ReactNode } from "react";
import { cn } from "./utils";

type TextInputProps = InputHTMLAttributes<HTMLInputElement> & {
  icon?: ReactNode;
  label: string;
};

export function TextInput({ className, icon, label, ...props }: TextInputProps) {
  return (
    <label className="grid gap-2">
      <span className="font-medium text-slate-200">{label}</span>
      <div className="flex min-h-9 items-center gap-2 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 transition focus-within:border-cyan-200/55">
        {icon ? <span className="text-slate-400">{icon}</span> : null}
        <input
          className={cn("w-full appearance-none bg-transparent text-white outline-none placeholder:text-slate-500", className)}
          {...props}
        />
      </div>
    </label>
  );
}
