"use client";

import * as RadixDialog from "@radix-ui/react-dialog";
import type { ReactNode } from "react";

/**
 * Radix Dialog handles the parts that are easy to get subtly wrong: focus trap,
 * focus restore to the trigger, Escape, scroll lock, aria-modal wiring, and
 * inert-ing the rest of the page. Motion lives in globals.css (.ui-scrim /
 * .ui-dialog-panel) so it runs off the main thread.
 */
export function Dialog({
  open,
  onOpenChange,
  title,
  description,
  footer,
  children,
  className = "",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title: string;
  description?: string;
  footer?: ReactNode;
  children?: ReactNode;
  className?: string;
}) {
  return (
    <RadixDialog.Root open={open} onOpenChange={onOpenChange}>
      <RadixDialog.Portal>
        <RadixDialog.Overlay className="ui-scrim fixed inset-0 z-40 bg-[var(--scrim)]" />
        {/* Centering lives on the wrapper so the enter/exit keyframe owns
            `transform` outright and never fights a translate utility. */}
        <div className="pointer-events-none fixed inset-0 z-50 grid place-items-center p-[var(--space-4)]">
        <RadixDialog.Content
          className={`ui-dialog-panel pointer-events-auto w-[min(92vw,32rem)] border border-[var(--line)] bg-[var(--surface)] text-[var(--foreground)] shadow-[var(--shadow-dialog)] ${className}`}
        >
          <div className="flex items-start justify-between gap-[var(--space-4)] border-b border-[var(--line)] px-[var(--space-5)] py-[var(--space-3)]">
            <div className="min-w-0">
              <RadixDialog.Title className="text-[var(--text-lg)] font-semibold tracking-[-0.02em]">
                {title}
              </RadixDialog.Title>
              {description ? (
                <RadixDialog.Description className="mt-[var(--space-1)] text-[var(--text-sm)] leading-relaxed text-[var(--ink-muted)]">
                  {description}
                </RadixDialog.Description>
              ) : (
                <RadixDialog.Description className="sr-only">{title}</RadixDialog.Description>
              )}
            </div>
            <DialogClose />
          </div>
          <div className="px-[var(--space-5)] py-[var(--space-4)]">{children}</div>
          {footer && (
            <div className="flex items-center justify-end gap-[var(--space-2)] border-t border-[var(--line)] bg-[var(--surface-header)] px-[var(--space-5)] py-[var(--space-3)]">
              {footer}
            </div>
          )}
        </RadixDialog.Content>
        </div>
      </RadixDialog.Portal>
    </RadixDialog.Root>
  );
}

export function DialogClose({ label = "Close" }: { label?: string }) {
  return (
    <RadixDialog.Close
      aria-label={label}
      className="ui-button -mr-1 flex h-7 w-7 shrink-0 items-center justify-center text-[var(--text-lg)] leading-none text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
    >
      <span aria-hidden="true">×</span>
    </RadixDialog.Close>
  );
}

export const DialogTrigger = RadixDialog.Trigger;
