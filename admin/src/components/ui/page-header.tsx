import type { ReactNode } from "react";

export function PageHeader({
  title,
  description,
  actions
}: {
  title: string;
  description: string;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-5 lg:flex-row lg:items-end lg:justify-between">
      <div className="min-w-0 space-y-3">
        <div className="inline-flex items-center rounded-full border border-white/70 bg-white/65 px-3 py-1 text-[11px] font-semibold uppercase tracking-[0.24em] text-[color:var(--dd-accent)] shadow-[0_12px_30px_-24px_rgba(31,45,52,0.45)] backdrop-blur-md">
          Deepdale CMS
        </div>
        <h1 className="text-[2rem] font-extrabold tracking-[-0.04em] text-[color:var(--dd-text)] sm:text-3xl lg:text-4xl">
          {title}
        </h1>
        <p className="max-w-3xl text-sm leading-6 text-[color:var(--dd-muted)]">
          {description}
        </p>
      </div>
      {actions ? (
        <div className="flex w-full flex-col items-stretch gap-3 sm:flex-row sm:flex-wrap sm:items-center lg:w-auto [&>*]:w-full sm:[&>*]:w-auto">
          {actions}
        </div>
      ) : null}
    </div>
  );
}
