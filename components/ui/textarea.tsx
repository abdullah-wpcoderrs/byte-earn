import type { TextareaHTMLAttributes } from "react";
import { cn } from "./utils";

type TextAreaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & {
  label: string;
};

export function TextArea({ className, label, ...props }: TextAreaProps) {
  return (
    <label className="grid gap-2">
      <span className="font-medium text-slate-200">{label}</span>
      <textarea
        className={cn(
          "min-h-28 rounded-[5px] border border-white/10 bg-white/[0.055] px-2.5 py-2 text-white outline-none transition placeholder:text-slate-500 focus:border-cyan-200/55",
          className,
        )}
        {...props}
      />
    </label>
  );
}
