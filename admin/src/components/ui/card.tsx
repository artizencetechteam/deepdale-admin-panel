import type { HTMLAttributes, PropsWithChildren } from "react";

import { cn } from "../../lib/cn";

export function Card({
  children,
  childrenClassName,
  className,
  ...props
}: PropsWithChildren<
  HTMLAttributes<HTMLDivElement> & { childrenClassName?: string }
>) {
  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-[1.5rem] border border-[color:var(--dd-border)] bg-[color:var(--dd-panel)] p-4 shadow-[var(--dd-shadow-soft)] backdrop-blur-xl sm:rounded-[1.75rem] sm:p-5",
        className
      )}
      {...props}
    >
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.9),transparent_48%),linear-gradient(135deg,rgba(255,255,255,0.44),transparent_55%)] opacity-80" />
      <div className="pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent via-white/90 to-transparent" />
      <div className={cn("relative z-10", childrenClassName)}>{children}</div>
    </div>
  );
}
