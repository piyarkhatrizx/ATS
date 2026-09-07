"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";
import { DialogClose } from "./dialog";

/**
 * Same Radix primitive as Dialog, anchored to the right edge. It enters and
 * exits along the same path, so a resume panel always leaves the way it arrived.
 */
export function SlideOver({
  open,
  onOpenChange,
  title,
  eyebrow,
  description,
  footer,
  children,
  className = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  eyebrow?: string;
  description?: string;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="ui-scrim fixed inset-0 z-40 bg-[var(--scrim)]" />
        <RadixDialog.Content
          className={`ui-slide-panel fixed inset-y-0 right-0 z-50 flex w-[min(94vw,34rem)] flex-col border-l border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-dialog)] ${className}`}
        >
          <header className="flex items-start justify-between gap-4 border-b border-[var(--line)] px-5 py-3">
            <div className="min-w-0">
              {eyebrow && (
                <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.14em] text-[var(--accent-deep)]">
                  {eyebrow}
                </p>
              )}
              <RadixDialog.Title className="text-[var(--text-lg)] font-semibold tracking-[-0.02em]">
                {title}
              </RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-1 text-[var(--text-sm)] text-[var(--ink-muted)]">
                  {description}
                </RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <DialogClose label="Close panel" />
          </header>
          <div className="flex-1 overflow-y-auto px-5 py-4">{children}</div>
          {footer && (
            <footer className="flex items-center justify-end gap-2 border-t border-[var(--line)] bg-[var(--surface-header)] px-5 py-3">
              {footer}
            </footer>
          )}
        </RadixDialog.Content>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}
