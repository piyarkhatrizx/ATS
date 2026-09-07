import type { ReactNode } from "react";
import { GlassCard } from "./glass-card";

/**
 * One number, said plainly.
 *
 * The value is the only large type on the card; the label sits above it in
 * muted ink so a row of these scans as numbers first. `emphasis` marks the
 * headline metric — median time to first call — with an accent rule rather than
 * a purple fill, because purple is never a panel fill.
 */
export function StatCard({
  label,
  value,
  hint,
  emphasis = false,
  className = "",
}: {
  label: string;
  value: ReactNode;
  hint?: ReactNode;
  emphasis?: boolean;
  className?: string;
}) {
  return (
    <GlassCard
      className={`${emphasis ? "border-l-2 border-l-[var(--accent)]" : ""} ${className}`}
    >
      <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
        {label}
      </p>
      <p
        className={`mt-[var(--space-1)] font-display text-[var(--text-2xl)] font-semibold leading-none tracking-[-0.02em] ${
          emphasis ? "text-[var(--foreground)]" : "text-[var(--foreground)]"
        }`}
      >
        {value}
      </p>
      {hint && <p className="mt-[var(--space-1)] text-[var(--text-xs)] text-[var(--ink-muted)]">{hint}</p>}
    </GlassCard>
  );
}

/** A responsive row of stat cards. */
export function StatGrid({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div className={`grid gap-[var(--space-3)] sm:grid-cols-2 lg:grid-cols-4 ${className}`}>{children}</div>
  );
}
