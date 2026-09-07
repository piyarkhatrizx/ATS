import type { ReactNode } from "react";
import { KButton } from "./button";

/**
 * Wayfinding, not decoration: what is missing, why, and the one thing to do
 * next. `compact` fits inside a list body without pushing the page down.
 */
export function KEmptyState({
  title,
  description,
  icon,
  action,
  compact = false,
  className = "",
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: { label: string; href?: string; onClick?: () => void };
  compact?: boolean;
  className?: string;
}) {
  return (
    <div
      className={`flex flex-col items-center justify-center border border-dashed border-[var(--line)] bg-[var(--surface)] text-center ${
        compact ? "px-4 py-6" : "px-6 py-12"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`flex items-center justify-center rounded-full bg-[var(--surface-sunken)] text-[var(--ink-muted)] ${
          compact ? "h-7 w-7 text-[var(--text-xs)]" : "h-10 w-10 text-[var(--text-md)]"
        }`}
      >
        {icon ?? "—"}
      </span>
      <h2
        className={`mt-3 font-semibold text-[var(--foreground)] ${
          compact ? "text-[var(--text-sm)]" : "text-[var(--text-lg)]"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-1 max-w-sm text-[var(--text-sm)] leading-relaxed text-[var(--ink-muted)]">
          {description}
        </p>
      )}
      {action && (
        <div className="mt-4">
          {action.href ? (
            <KButton variant="accent" size="md" asChild>
              <a href={action.href}>{action.label}</a>
            </KButton>
          ) : (
            <KButton variant="accent" size="md" onClick={action.onClick}>
              {action.label}
            </KButton>
          )}
        </div>
      )}
    </div>
  );
}
