import type { PropsWithChildren, TableHTMLAttributes } from "react";

import { cn } from "../../lib/cn";

export function TableWrapper({
  children,
  className
}: PropsWithChildren<{ className?: string }>) {
  return (
    <div className={cn("overflow-hidden rounded-3xl border border-[color:var(--dd-border)] bg-white", className)}>
      <div className="overflow-x-auto">{children}</div>
    </div>
  );
}

export function Table({
  children,
  className,
  ...props
}: PropsWithChildren<TableHTMLAttributes<HTMLTableElement>>) {
  return (
    <table className={cn("min-w-full text-left text-sm", className)} {...props}>
      {children}
    </table>
  );
}
