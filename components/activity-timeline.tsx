import { StatusPill } from "@/components/korosha/status-pill";
import { sourceLabel } from "@/lib/application-source";
import { groupByDay, type TimelineEntry } from "@/lib/activity/timeline";
import { CALL_OUTCOMES } from "@/lib/activity/types";

const outcomeLabel: Record<(typeof CALL_OUTCOMES)[number], string> = {
  CONNECTED: "Connected",
  VOICEMAIL: "Left voicemail",
  NO_ANSWER: "No answer",
  WRONG_NUMBER: "Wrong number",
  CALLBACK_REQUESTED: "Callback requested",
};

function formatDuration(seconds: number | null) {
  if (!seconds) return null;
  const minutes = Math.floor(seconds / 60);
  const rest = seconds % 60;
  return minutes ? `${minutes}m ${rest}s` : `${rest}s`;
}

function formatPhone(digits: string) {
  return digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : digits;
}

function dayLabel(day: string) {
  const date = new Date(`${day}T00:00:00Z`);
  const today = new Date().toISOString().slice(0, 10);
  if (day === today) return "Today";
  return date.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: "numeric",
    timeZone: "UTC",
  });
}

/** Renders one entry's headline. Unknown rows fall through to type + time. */
function EntryLine({ entry }: { entry: TimelineEntry }) {
  if (!entry.known) {
    return (
      <span className="text-[var(--ink-muted)]">
        <span className="font-mono text-[var(--text-xs)]">{entry.type}</span>{" "}
        <span className="text-[var(--text-xs)]">
          ({entry.reason === "unknown-type" ? "unrecognized type" : "unrecognized shape"})
        </span>
      </span>
    );
  }

  const { payload } = entry;
  switch (payload.type) {
    case "APPLICATION_CREATED":
      return <>Applied via {sourceLabel[payload.source]}</>;
    case "REAPPLIED":
      return <>Re-applied via {sourceLabel[payload.source]}</>;
    case "STATUS_CHANGED":
      return (
        <span className="inline-flex flex-wrap items-center gap-[var(--space-1)]">
          Moved
          {/* The label snapshot from the payload, not the status's current
              name: a rename must not rewrite what history says happened. */}
          <StatusPill label={payload.from} />
          <span aria-hidden="true" className="text-[var(--ink-muted)]">→</span>
          <StatusPill label={payload.to} />
        </span>
      );
    case "PARSED":
      return <>Resume parsed</>;
    case "DOCUMENT_ATTACHED":
      return <>Attached {payload.filename ?? "a document"}</>;
    case "NOTE_ADDED":
      return <>Note added</>;
    case "EMAIL_SENT":
      return <>Email sent{payload.subject ? `: ${payload.subject}` : ""}</>;
    case "EMAIL_RECEIVED":
      return <>Email received{payload.subject ? `: ${payload.subject}` : ""}</>;
    case "CALL_LOGGED": {
      const duration = formatDuration(payload.durationSeconds);
      return (
        <>
          {payload.direction === "OUTBOUND" ? "Called" : "Call from"}{" "}
          {formatPhone(payload.phoneNumber)} — {outcomeLabel[payload.outcome]}
          {duration ? ` (${duration})` : ""}
        </>
      );
    }
  }
}

function Entry({ entry }: { entry: TimelineEntry }) {
  const { row } = entry;
  const actor = row.actor?.name ?? row.actor?.email ?? null;
  const job = row.application?.job?.title ?? null;

  return (
    <li className="border-b border-[var(--line)] py-[var(--space-2)] last:border-0">
      <div className="flex flex-wrap items-baseline justify-between gap-x-[var(--space-3)] gap-y-[var(--space-1)]">
        <span className="text-[var(--text-sm)]">
          <EntryLine entry={entry} />
        </span>
        <span className="shrink-0 font-mono text-[var(--text-xs)] text-[var(--ink-muted)]">
          {row.createdAt.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit" })}
        </span>
      </div>
      {row.body && (
        <p className="mt-[var(--space-1)] whitespace-pre-wrap text-[var(--text-sm)] text-[var(--ink-muted)]">
          {row.body}
        </p>
      )}
      {(actor || job) && (
        <p className="mt-[var(--space-1)] text-[var(--text-xs)] text-[var(--ink-muted)]">
          {actor ?? "System"}
          {job ? ` · ${job}` : ""}
        </p>
      )}
    </li>
  );
}

export function ActivityTimeline({
  pinned,
  entries,
}: {
  pinned: TimelineEntry[];
  entries: TimelineEntry[];
}) {
  if (!pinned.length && !entries.length) {
    return (
      <p className="border border-dashed border-[var(--line)] p-[var(--space-6)] text-center text-[var(--text-sm)] text-[var(--ink-muted)]">
        Nothing has happened on this candidate yet.
      </p>
    );
  }

  return (
    <div className="space-y-[var(--space-5)]">
      {pinned.length > 0 && (
        <section aria-label="Pinned" className="border border-[var(--accent)] bg-[var(--surface)] px-[var(--space-3)] py-[var(--space-1)]">
          <p className="pt-[var(--space-2)] text-[var(--text-xs)] font-semibold uppercase tracking-[0.12em] text-[var(--foreground)]">
            Pinned
          </p>
          <ul>
            {pinned.map((entry) => (
              <Entry key={`pinned-${entry.row.id}`} entry={entry} />
            ))}
          </ul>
        </section>
      )}

      {groupByDay(entries).map((group) => (
        <section key={group.day}>
          <h3 className="sticky top-0 bg-[var(--background)] py-[var(--space-1)] text-[var(--text-xs)] font-semibold uppercase tracking-[0.12em] text-[var(--ink-muted)]">
            {dayLabel(group.day)}
          </h3>
          <ul className="border border-[var(--line)] bg-[var(--surface)] px-[var(--space-3)]">
            {group.entries.map((entry) => (
              <Entry key={entry.row.id} entry={entry} />
            ))}
          </ul>
        </section>
      ))}
    </div>
  );
}
