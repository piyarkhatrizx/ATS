import type { HTMLAttributes, ReactNode } from "react";

/**
 * The panel. Dark, never purple-filled — purple appears only in the border and
 * the glow behind it.
 *
 * `.k-glass` in globals.css carries the single backdrop-filter. Do not nest one
 * GlassCard inside another: stacking backdrop-filter is what turns glass into
 * mud, and the spec forbids it. Use `flat` for an inner region instead.
 */
export function GlassCard({
  children,
  className = "",
  flat = false,
  padded = true,
  ...props
}: HTMLAttributes<HTMLDivElement> & {
  children: ReactNode;
  /** Skips the blur. Use for a region already inside a GlassCard. */
  flat?: boolean;
  padded?: boolean;
}) {
  return (
    <div
      className={`border border-[var(--glass-border)] ${flat ? "bg-[var(--surface)]" : "k-glass"} ${
        padded ? "p-[var(--space-4)]" : ""
      } ${className}`}
      {...props}
    >
      {children}
    </div>
  );
}

/** Header row inside a card: a title, and optional actions on the right. */
export function GlassCardHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="mb-[var(--space-3)] flex flex-wrap items-start justify-between gap-[var(--space-3)]">
      <div className="min-w-0">
        <h2 className="truncate text-[var(--text-md)] font-semibold text-[var(--foreground)]">
          {title}
        </h2>
        {description && (
          <p className="mt-[var(--space-1)] text-[var(--text-sm)] text-[var(--ink-muted)]">{description}</p>
        )}
      </div>
      {actions && <div className="flex shrink-0 items-center gap-[var(--space-2)]">{actions}</div>}
    </div>
  );
}
