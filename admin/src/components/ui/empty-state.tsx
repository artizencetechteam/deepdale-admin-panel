export function EmptyState({
  title,
  description
}: {
  title: string;
  description: string;
}) {
  return (
    <div className="rounded-3xl border border-dashed border-[color:var(--dd-border)] bg-white/60 px-6 py-10 text-center">
      <h3 className="text-lg font-semibold text-[color:var(--dd-text)]">{title}</h3>
      <p className="mt-2 text-sm text-[color:var(--dd-muted)]">{description}</p>
    </div>
  );
}
