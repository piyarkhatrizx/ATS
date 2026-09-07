"use client";

import { useState, useTransition } from "react";
import type { StatusCountsAs } from "@prisma/client";
import {
  createStatus,
  deleteStatus,
  reorderStatuses,
  updateStatus,
} from "@/app/actions/statuses";
import { GlassCard, GlassCardHeader } from "@/components/korosha/glass-card";
import { KButton } from "@/components/korosha/button";
import { KEmptyState } from "@/components/korosha/empty-state";
import { StatusPill, STATUS_COLOR_TOKENS } from "@/components/korosha/status-pill";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { COUNTS_AS_VALUES, countsAsLabel } from "@/lib/application-status";

export type EditableStatus = {
  id: string;
  key: string;
  label: string;
  color: string;
  order: number;
  isTerminal: boolean;
  active: boolean;
  countsAs: StatusCountsAs;
  applicationCount: number;
};

function ColorPicker({
  value,
  onChange,
  label,
}: {
  value: string;
  onChange: (next: string) => void;
  label: string;
}) {
  return (
    <div className="flex items-center gap-1.5" role="radiogroup" aria-label={label}>
      {STATUS_COLOR_TOKENS.map((token) => (
        <button
          key={token}
          type="button"
          role="radio"
          aria-checked={value === token}
          aria-label={token.replace("--status-", "")}
          onClick={() => onChange(token)}
          className={`h-5 w-5 rounded-full border-2 ${
            value === token ? "border-[var(--foreground)]" : "border-transparent"
          }`}
          style={{ backgroundColor: `var(${token})` }}
        />
      ))}
    </div>
  );
}

export function StatusesEditor({ initial }: { initial: EditableStatus[] }) {
  const [statuses, setStatuses] = useState(initial);
  const [pending, startTransition] = useTransition();
  const [newLabel, setNewLabel] = useState("");
  const [newColor, setNewColor] = useState<string>("--status-open");
  const [newCountsAs, setNewCountsAs] = useState<StatusCountsAs>("OPEN");

  function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
    startTransition(async () => {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(result.error);
    });
  }

  /** Optimistic locally so the list does not jump, then persisted. */
  function move(index: number, direction: -1 | 1) {
    const target = index + direction;
    if (target < 0 || target >= statuses.length) return;
    const next = [...statuses];
    [next[index], next[target]] = [next[target], next[index]];
    setStatuses(next);
    run(() => reorderStatuses(next.map((status) => status.id)), "Order saved");
  }

  return (
    <div className="space-y-5">
      <GlassCard>
        <GlassCardHeader
          title="Add a status"
          description="Colors come from the palette so a new status cannot fail contrast."
        />
        <div className="flex flex-wrap items-end gap-3">
          <Input
            label="Name"
            value={newLabel}
            onChange={(event) => setNewLabel(event.target.value)}
            placeholder="Awaiting documents"
            fieldClassName="min-w-52"
          />
          <div>
            <span className="mb-1 block text-[var(--text-sm)] font-medium">Color</span>
            <ColorPicker value={newColor} onChange={setNewColor} label="New status color" />
          </div>
          <Select
            label="Counts as"
            value={newCountsAs}
            onChange={(event) => setNewCountsAs(event.target.value as StatusCountsAs)}
          >
            {COUNTS_AS_VALUES.map((value) => (
              <option key={value} value={value}>
                {countsAsLabel[value]}
              </option>
            ))}
          </Select>
          <KButton
            variant="accent"
            loading={pending}
            disabled={!newLabel.trim()}
            onClick={() =>
              run(async () => {
                const result = await createStatus({
                  label: newLabel,
                  color: newColor,
                  countsAs: newCountsAs,
                  isTerminal: newCountsAs !== "OPEN",
                });
                if (result.ok) setNewLabel("");
                return result;
              }, "Status added")
            }
          >
            Add status
          </KButton>
        </div>
      </GlassCard>

      {statuses.length === 0 ? (
        <KEmptyState title="No statuses" description="Run npm run seed:statuses to create the defaults." />
      ) : (
        <GlassCard padded={false}>
          <ul>
            {statuses.map((status, index) => (
              <li
                key={status.id}
                className="flex flex-wrap items-center gap-3 border-b border-[var(--line)] px-3 py-2.5 last:border-0"
              >
                <div className="flex shrink-0 flex-col">
                  <button
                    type="button"
                    aria-label={`Move ${status.label} up`}
                    disabled={index === 0 || pending}
                    onClick={() => move(index, -1)}
                    className="ui-button h-4 px-1 text-[var(--text-xs)] text-[var(--ink-muted)] hover:text-[var(--foreground)] disabled:opacity-30"
                  >
                    ▲
                  </button>
                  <button
                    type="button"
                    aria-label={`Move ${status.label} down`}
                    disabled={index === statuses.length - 1 || pending}
                    onClick={() => move(index, 1)}
                    className="ui-button h-4 px-1 text-[var(--text-xs)] text-[var(--ink-muted)] hover:text-[var(--foreground)] disabled:opacity-30"
                  >
                    ▼
                  </button>
                </div>

                <StatusPill color={status.color} label={status.label} />

                <input
                  aria-label={`Rename ${status.label}`}
                  defaultValue={status.label}
                  onBlur={(event) => {
                    const label = event.target.value.trim();
                    if (!label || label === status.label) return;
                    run(() => updateStatus({ id: status.id, label }), "Renamed");
                  }}
                  className="min-w-40 flex-1 border border-transparent bg-transparent px-1.5 py-1 text-[var(--text-sm)] text-[var(--foreground)] hover:border-[var(--line)] focus:border-[var(--accent)] focus:outline-none"
                />

                <ColorPicker
                  value={status.color}
                  label={`${status.label} color`}
                  onChange={(color) => run(() => updateStatus({ id: status.id, color }), "Recolored")}
                />

                <select
                  aria-label={`${status.label} counts as`}
                  defaultValue={status.countsAs}
                  onChange={(event) =>
                    run(
                      () =>
                        updateStatus({
                          id: status.id,
                          countsAs: event.target.value as StatusCountsAs,
                        }),
                      "Saved",
                    )
                  }
                  className="border border-[var(--line)] bg-[var(--surface-sunken)] px-1.5 py-1 text-[var(--text-xs)] text-[var(--foreground)]"
                >
                  {COUNTS_AS_VALUES.map((value) => (
                    <option key={value} value={value}>
                      {countsAsLabel[value]}
                    </option>
                  ))}
                </select>

                <label className="flex items-center gap-1.5 text-[var(--text-xs)] text-[var(--ink-muted)]">
                  <input
                    type="checkbox"
                    defaultChecked={status.isTerminal}
                    onChange={(event) =>
                      run(
                        () => updateStatus({ id: status.id, isTerminal: event.target.checked }),
                        "Saved",
                      )
                    }
                  />
                  Terminal
                </label>

                <span className="w-16 text-right font-mono text-[var(--text-xs)] text-[var(--ink-muted)]">
                  {status.applicationCount} app{status.applicationCount === 1 ? "" : "s"}
                </span>

                <KButton
                  size="sm"
                  variant={status.active ? "ghost" : "accent"}
                  onClick={() =>
                    run(
                      () => updateStatus({ id: status.id, active: !status.active }),
                      status.active ? "Deactivated" : "Reactivated",
                    )
                  }
                >
                  {status.active ? "Deactivate" : "Reactivate"}
                </KButton>

                <KButton
                  size="sm"
                  variant="danger"
                  title={
                    status.applicationCount > 0
                      ? "Reassign its applications first, or deactivate it instead"
                      : undefined
                  }
                  onClick={() =>
                    run(async () => {
                      const result = await deleteStatus({ id: status.id });
                      if (result.ok) {
                        setStatuses((current) => current.filter((s) => s.id !== status.id));
                      }
                      return result;
                    }, "Deleted")
                  }
                >
                  Delete
                </KButton>
              </li>
            ))}
          </ul>
        </GlassCard>
      )}
    </div>
  );
}
