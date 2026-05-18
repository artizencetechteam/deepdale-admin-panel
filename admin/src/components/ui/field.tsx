import type {
  ButtonHTMLAttributes,
  InputHTMLAttributes,
  PropsWithChildren,
  SelectHTMLAttributes,
  TextareaHTMLAttributes
} from "react";

import { cn } from "../../lib/cn";

export function FormField({
  label,
  hint,
  error,
  children
}: PropsWithChildren<{
  label: string;
  hint?: string | undefined;
  error?: string | undefined;
}>) {
  return (
    <label className="flex flex-col gap-2 text-sm font-medium text-[color:var(--dd-text)]">
      <span>{label}</span>
      {children}
      {hint ? <span className="text-xs text-[color:var(--dd-muted)]">{hint}</span> : null}
      {error ? <span className="text-xs font-semibold text-red-600">{error}</span> : null}
    </label>
  );
}

const fieldClassName =
  "w-full rounded-2xl border border-[color:var(--dd-border)] bg-white/90 px-3 py-2 text-sm text-[color:var(--dd-text)] outline-none transition placeholder:text-slate-400 focus:border-teal-700 focus:ring-2 focus:ring-teal-700/15 disabled:bg-stone-100";

const fieldErrorClassName =
  "border-red-400 bg-red-50/50 focus:border-red-500 focus:ring-2 focus:ring-red-500/15";

export function Input({ error, ...props }: InputHTMLAttributes<HTMLInputElement> & { error?: boolean }) {
  return (
    <input
      className={cn(fieldClassName, error && fieldErrorClassName, props.className)}
      aria-invalid={error ? "true" : undefined}
      {...props}
    />
  );
}

export function Textarea({ error, ...props }: TextareaHTMLAttributes<HTMLTextAreaElement> & { error?: boolean }) {
  return (
    <textarea
      className={cn(fieldClassName, "min-h-28", error && fieldErrorClassName, props.className)}
      aria-invalid={error ? "true" : undefined}
      {...props}
    />
  );
}

export function Select({ error, ...props }: SelectHTMLAttributes<HTMLSelectElement> & { error?: boolean }) {
  return (
    <select
      className={cn(fieldClassName, error && fieldErrorClassName, props.className)}
      aria-invalid={error ? "true" : undefined}
      {...props}
    />
  );
}

export function Switch({
  checked,
  onCheckedChange,
  disabled,
  className,
  ...props
}: {
  checked: boolean;
  onCheckedChange: (nextValue: boolean) => void;
  disabled?: boolean;
} & Pick<
  ButtonHTMLAttributes<HTMLButtonElement>,
  "aria-label" | "title" | "className"
>) {
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onCheckedChange(!checked)}
      className={cn(
        "relative inline-flex h-7 w-12 items-center rounded-full border transition disabled:opacity-50",
        checked
          ? "border-teal-700 bg-teal-700"
          : "border-[color:var(--dd-border)] bg-white",
        className
      )}
      {...props}
    >
      <span
        className={cn(
          "absolute left-1 h-5 w-5 rounded-full bg-white shadow transition",
          checked ? "translate-x-5" : "translate-x-0"
        )}
      />
    </button>
  );
}
