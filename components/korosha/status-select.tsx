"use client";

import { useState, useTransition } from "react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { toast } from "@/components/ui/toast";
import { KSpinner } from "./button";
import { StatusPill } from "./status-pill";

export type StatusOption = {
  id: string;
  label: string;
  color: string;
  isTerminal: boolean;
};

export type StatusChangeResult = { ok: true } | { ok: false; error: string };

/**
 * Moves one application between stages, which are rows in the Status table
 * rather than enum members — so the options come from the database and a
 * recruiter can add, rename or reorder them without a deploy.
 *
 * `onChange` reports failure by RETURNING `{ ok: false, error }`, not throwing.
 * A convention where the caller must remember to throw gets forgotten exactly
 * once, and a failed status change then renders as a successful one.
 */
export function KStatusSelect({
  value,
  options,
  onChange,
  disabled = false,
  align = "start",
  label = "Stage",
}: {
  /** Current Status id. */
  value: string;
  options: StatusOption[];
  onChange?: (nextStatusId: string) => Promise<StatusChangeResult | void> | StatusChangeResult | void;
  disabled?: boolean;
  align?: "start" | "end";
  label?: string;
}) {
  const [optimistic, setOptimistic] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const current = optimistic ?? value;

  const open = options.filter((option) => !option.isTerminal);
  // Closing stages sit below a separator so they are never a slip away.
  const terminal = options.filter((option) => option.isTerminal);
  const currentOption = options.find((option) => option.id === current);

  function select(nextId: string) {
    if (nextId === current) return;
    const previous = current;
    const next = options.find((option) => option.id === nextId);
    setOptimistic(nextId);

    startTransition(async () => {
      const fail = (message: string) => {
        setOptimistic(previous);
        toast.error(message, { action: { label: "Retry", onClick: () => select(nextId) } });
      };

      try {
        const result = await onChange?.(nextId);
        if (result && result.ok === false) {
          fail(result.error || `Could not move to ${next?.label ?? "that stage"}`);
          return;
        }
        setOptimistic(null);
      } catch {
        fail(`Could not move to ${next?.label ?? "that stage"}`);
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled || pending}
        aria-label={`${label}: ${currentOption?.label ?? "Unknown"}`}
        className="ui-button inline-flex h-7 items-center gap-[var(--space-1)] border border-transparent px-[var(--space-1)] hover:border-[var(--line)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <StatusPill color={currentOption?.color} label={currentOption?.label ?? "Unknown"} />
        {pending ? (
          <KSpinner className="text-[var(--ink-muted)]" />
        ) : (
          <span aria-hidden="true" className="text-[var(--text-xs)] text-[var(--ink-muted)]">
            ▾
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={current} onValueChange={select}>
          {open.map((option) => (
            <DropdownMenuRadioItem key={option.id} value={option.id}>
              <StatusPill color={option.color} label={option.label} />
            </DropdownMenuRadioItem>
          ))}
          {terminal.length > 0 && <DropdownMenuSeparator />}
          {terminal.map((option) => (
            <DropdownMenuRadioItem key={option.id} value={option.id}>
              <StatusPill color={option.color} label={option.label} />
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
