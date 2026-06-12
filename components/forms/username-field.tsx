"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { normalizeUsername, validateUsername } from "@/lib/profile-validation";

type UsernameAvailability =
  | { kind: "checking" }
  | { kind: "available" }
  | { kind: "taken"; message: string }
  | { kind: "error" };

type UsernameFieldProps = {
  currentValue?: string | null;
  helperText?: string;
  label?: string;
  name?: string;
  placeholder?: string;
  required?: boolean;
  defaultValue?: string;
};

type UsernameStatus =
  | { tone: "muted"; message: string }
  | { tone: "success"; message: string }
  | { tone: "danger"; message: string };

function getStatus(
  value: string,
  currentValue: string | null | undefined,
  availability: UsernameAvailability | null,
  helperText: string,
): UsernameStatus {
  const normalized = normalizeUsername(value);

  if (!normalized) {
    return { tone: "muted", message: helperText };
  }

  const validation = validateUsername(normalized);
  if (!validation.ok) {
    return {
      tone: "danger",
      message:
        validation.code === "reserved_username"
          ? "This username is reserved and cannot be used."
          : "Username must be 3-24 lowercase letters, numbers, or underscores.",
    };
  }

  if (currentValue && normalizeUsername(currentValue) === validation.value) {
    return { tone: "success", message: "This is your current username." };
  }

  if (availability?.kind === "checking") {
    return { tone: "muted", message: "Checking availability..." };
  }

  if (availability?.kind === "available") {
    return { tone: "success", message: "This username is available." };
  }

  if (availability?.kind === "taken") {
    return { tone: "danger", message: availability.message };
  }

  if (availability?.kind === "error") {
    return { tone: "muted", message: "We could not verify availability right now." };
  }

  return { tone: "muted", message: helperText };
}

export function UsernameField({
  currentValue,
  helperText = "Use 3 to 24 lowercase letters, numbers, or underscores.",
  label = "Username",
  name = "username",
  placeholder = "amina_kareem",
  required = true,
  defaultValue = "",
}: UsernameFieldProps) {
  const statusId = useId();
  const inputRef = useRef<HTMLInputElement>(null);
  const initialValue = useMemo(() => normalizeUsername(defaultValue), [defaultValue]);
  const [value, setValue] = useState(initialValue);
  const [availability, setAvailability] = useState<UsernameAvailability | null>(null);

  const status = getStatus(value, currentValue, availability, helperText);
  const isInvalid = status.tone === "danger";

  useEffect(() => {
    const input = inputRef.current;
    if (!input) {
      return;
    }

    input.setCustomValidity(isInvalid ? status.message : "");
  }, [isInvalid, status.message]);

  useEffect(() => {
    const normalized = normalizeUsername(value);
    const validation = validateUsername(normalized);
    const currentNormalized = currentValue ? normalizeUsername(currentValue) : null;

    if (!normalized || !validation.ok || (currentNormalized && currentNormalized === validation.value)) {
      return;
    }

    const controller = new AbortController();
    const timer = window.setTimeout(async () => {
      setAvailability({ kind: "checking" });

      try {
        const response = await fetch(`/api/username-availability?username=${encodeURIComponent(validation.value)}`, {
          cache: "no-store",
          signal: controller.signal,
        });

        if (!response.ok) {
          if (!controller.signal.aborted) {
            setAvailability({ kind: "error" });
          }
          return;
        }

        const data = (await response.json()) as { available?: boolean; message?: string };
        if (controller.signal.aborted) {
          return;
        }

        if (data.available) {
          setAvailability({ kind: "available" });
          return;
        }

        setAvailability({
          kind: "taken",
          message: data.message ?? "This username is already taken.",
        });
      } catch {
        if (!controller.signal.aborted) {
          setAvailability({ kind: "error" });
        }
      }
    }, 300);

    return () => {
      window.clearTimeout(timer);
      controller.abort();
    };
  }, [currentValue, value]);

  const statusClassName = status.tone === "success" ? "text-emerald-200" : status.tone === "danger" ? "text-red-200" : "text-slate-400";
  const borderClassName = status.tone === "success" ? "border-emerald-400/35 focus:border-emerald-300/70" : status.tone === "danger" ? "border-red-500/40 focus:border-red-300/70" : "border-white/10 focus:border-cyan-200/55";

  return (
    <label className="grid gap-2">
      <span className="font-medium text-slate-200">{label}</span>
      <input
        ref={inputRef}
        aria-describedby={statusId}
        aria-invalid={isInvalid || undefined}
        autoComplete="username"
        autoCorrect="off"
        className={`min-h-9 rounded-[5px] border bg-white/[0.055] px-2.5 text-white outline-none transition placeholder:text-slate-500 ${borderClassName}`}
        defaultValue={initialValue}
        inputMode="text"
        maxLength={24}
        name={name}
        onChange={(event) => setValue(normalizeUsername(event.target.value))}
        pattern="[a-z0-9_]{3,24}"
        placeholder={placeholder}
        required={required}
        spellCheck={false}
        type="text"
      />
      <p className={`text-[11px] leading-4 ${statusClassName}`} id={statusId}>
        {status.message ?? helperText}
      </p>
    </label>
  );
}
