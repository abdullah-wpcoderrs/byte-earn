"use client";

import { LoaderCircle } from "lucide-react";
import { useFormStatus } from "react-dom";
import { Button, type ButtonProps } from "@/components/ui/button";

type SubmitButtonProps = ButtonProps & {
  pendingLabel?: string;
};

export function SubmitButton({ children, disabled, icon, pendingLabel = "Working...", ...props }: SubmitButtonProps) {
  const { pending } = useFormStatus();

  return (
    <Button
      disabled={disabled || pending}
      icon={pending ? <LoaderCircle className="size-4 animate-spin" /> : icon}
      {...props}
    >
      {pending ? pendingLabel : children}
    </Button>
  );
}
