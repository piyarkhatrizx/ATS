"use client";

import type { HTMLAttributes, KeyboardEvent, ReactNode } from "react";

/**
 * A lead row.
 *
 * Rows deliberately have NO transition: a recruiter crosses hundreds an hour
 * and a fading hover tint lags behind the pointer.
 *
 * When `onOpen` is given the row becomes a button in the accessibility tree —
 * the spec wants a row click to open the side panel, never a page navigation,
 * and a div with an onClick is invisible to a keyboard.
 */
export function KTableRow({
  children,
  onOpen,
  selected = false,
  muted = false,
  className = "",
  ...props
}: Omit<HTMLAttributes<HTMLDivElement>, "onClick"> & {
  children: ReactNode;
  onOpen?: () => void;
  selected?: boolean;
  /** Auto-rejected leads: still visible, visibly de-emphasized. */
  muted?: boolean;
}) {
  const interactive = Boolean(onOpen);

  function onKeyDown(event: KeyboardEvent<HTMLDivElement>) {
    if (!onOpen) return;
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      onOpen();
    }
  }

  return (
    <div
      role={interactive ? "button" : undefined}
      tabIndex={interactive ? 0 : undefined}
      aria-current={selected || undefined}
      onClick={onOpen}
      onKeyDown={onKeyDown}
      className={[
        "flex items-center gap-3 border-b border-[var(--line)] px-3 py-2 last:border-0",
        interactive ? "cursor-pointer" : "",
        selected
          ? "bg-[var(--surface-selected)] shadow-[inset_2px_0_0_var(--accent)]"
          : "hover:bg-[var(--surface-hover)]",
        muted ? "opacity-60" : "",
        "focus-visible:outline-2 focus-visible:-outline-offset-2 focus-visible:outline-[var(--accent)]",
        className,
      ].join(" ")}
      {...props}
    >
      {children}
    </div>
  );
}

/** Column headings for a KTableRow list. Sticky, with a scroll-edge shadow. */
export function KTableHead({ children, className = "" }: { children: ReactNode; className?: string }) {
  return (
    <div
      className={`ui-sticky-head flex items-center gap-3 px-3 py-1.5 text-[var(--text-xs)] font-semibold uppercase tracking-[0.1em] text-[var(--ink-muted)] ${className}`}
    >
      {children}
    </div>
  );
}
