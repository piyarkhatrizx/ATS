import type { ReactNode } from "react";
import { Button } from "./button";
import { IconInbox } from "@/components/korosha/icon";

export type EmptyStateAction = {
  label: string;
  onClick?: () => void;
  href?: string;
};

/**
 * Wayfinding, not decoration: say what is missing, why, and the one thing to do
 * next. `size="compact"` fits inside a table body without pushing the page down.
 */
export function EmptyState({
  title,
  description,
  icon,
  action,
  secondaryAction,
  size = "default",
  className = "",
}: {
  title: string;
  description?: string;
  icon?: ReactNode;
  action?: EmptyStateAction;
  secondaryAction?: EmptyStateAction;
  size?: "default" | "compact";
  className?: string;
}) {
  const compact = size === "compact";

  return (
    <div
      className={`flex flex-col items-center justify-center border border-dashed border-[var(--line)] bg-[var(--surface)] text-center ${
        compact ? "px-[var(--space-4)] py-[var(--space-6)]" : "px-[var(--space-6)] py-[var(--space-12)]"
      } ${className}`}
    >
      <span
        aria-hidden="true"
        className={`flex items-center justify-center rounded-full bg-[var(--surface-sunken)] text-[var(--ink-muted)] ${
          compact ? "h-7 w-7 text-[var(--text-xs)]" : "h-10 w-10 text-[var(--text-md)]"
        }`}
      >
        {icon ?? <IconInbox size={compact ? 14 : 18} />}
      </span>
      <h2
        className={`mt-[var(--space-3)] font-semibold tracking-[-0.01em] ${
          compact ? "text-[var(--text-sm)]" : "text-[var(--text-lg)]"
        }`}
      >
        {title}
      </h2>
      {description && (
        <p className="mx-auto mt-[var(--space-1)] max-w-sm text-[var(--text-sm)] leading-relaxed text-[var(--ink-muted)]">
          {description}
        </p>
      )}
      {(action || secondaryAction) && (
        <div className="mt-[var(--space-4)] flex items-center gap-[var(--space-2)]">
          {action && <ActionButton action={action} variant="primary" />}
          {secondaryAction && <ActionButton action={secondaryAction} variant="secondary" />}
        </div>
      )}
    </div>
  );
}

function ActionButton({
  action,
  variant,
}: {
  action: EmptyStateAction;
  variant: "primary" | "secondary";
}) {
  if (action.href) {
    return (
      <a
        href={action.href}
        className={`ui-button inline-flex h-8 items-center justify-center border px-[var(--space-3)] text-[var(--text-sm)] font-semibold ${
          variant === "primary"
            ? "border-transparent bg-[var(--accent-deep)] text-[var(--on-accent)] hover:bg-[var(--accent-strong)]"
            : "border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] hover:border-[var(--accent)]"
        }`}
      >
        {action.label}
      </a>
    );
  }

  return (
    <Button variant={variant} size="md" onClick={action.onClick}>
      {action.label}
    </Button>
  );
}
