"use client";

import { useState, useTransition } from "react";
import type { ApplicationStatus } from "@prisma/client";
import { APPLICATION_STATUSES, statusLabel, statusTone } from "@/lib/application-status";
import { Badge } from "./badge";
import { Spinner } from "./button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuLabel,
  DropdownMenuRadioGroup,
  DropdownMenuRadioItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "./dropdown-menu";
import { toast } from "./toast";

/** Closing stages sit below a separator so they are never a slip away. */
const CLOSED_STAGES = ["REJECTED", "WITHDRAWN"] as const;
const OPEN_STAGES = APPLICATION_STATUSES.filter(
  (status): status is Exclude<(typeof APPLICATION_STATUSES)[number], (typeof CLOSED_STAGES)[number]> =>
    !CLOSED_STAGES.includes(status as (typeof CLOSED_STAGES)[number]),
);

/**
 * Moves one Application between the eight pipeline stages.
 *
 * Optimistic on purpose: the recruiter's next action is the next candidate, not
 * a spinner. If the write fails we put the old stage back and say so in a toast
 * with an explicit retry, rather than silently diverging from the server.
 */
export function StatusSelect({
  value,
  onChange,
  disabled = false,
  align = "start",
  label = "Stage",
}: {
  value: ApplicationStatus;
  onChange?: (next: ApplicationStatus) => void | Promise<void>;
  disabled?: boolean;
  align?: "start" | "end";
  label?: string;
}) {
  const [optimistic, setOptimistic] = useState<ApplicationStatus | null>(null);
  const [pending, startTransition] = useTransition();
  const current = optimistic ?? value;

  function select(next: string) {
    const stage = next as ApplicationStatus;
    if (stage === current) return;

    const previous = current;
    setOptimistic(stage);

    startTransition(async () => {
      try {
        await onChange?.(stage);
        setOptimistic(null);
      } catch {
        setOptimistic(previous);
        toast.error(`Could not move to ${statusLabel[stage]}`, {
          action: { label: "Retry", onClick: () => select(stage) },
        });
      }
    });
  }

  return (
    <DropdownMenu>
      <DropdownMenuTrigger
        disabled={disabled || pending}
        aria-label={`${label}: ${statusLabel[current]}`}
        className="ui-button inline-flex h-7 items-center gap-1 border border-transparent px-1 hover:border-[var(--line)] hover:bg-[var(--surface-hover)] disabled:cursor-not-allowed disabled:opacity-60"
      >
        <Badge tone={statusTone[current]}>{statusLabel[current]}</Badge>
        {pending ? (
          <Spinner className="text-[var(--ink-muted)]" />
        ) : (
          <span aria-hidden="true" className="text-[var(--text-xs)] text-[var(--ink-muted)]">
            ▾
          </span>
        )}
      </DropdownMenuTrigger>
      <DropdownMenuContent align={align}>
        <DropdownMenuLabel>{label}</DropdownMenuLabel>
        <DropdownMenuRadioGroup value={current} onValueChange={select}>
          {OPEN_STAGES.map((status) => (
            <DropdownMenuRadioItem key={status} value={status}>
              <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>
            </DropdownMenuRadioItem>
          ))}
          <DropdownMenuSeparator />
          {CLOSED_STAGES.map((status) => (
            <DropdownMenuRadioItem key={status} value={status}>
              <Badge tone={statusTone[status]}>{statusLabel[status]}</Badge>
            </DropdownMenuRadioItem>
          ))}
        </DropdownMenuRadioGroup>
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
