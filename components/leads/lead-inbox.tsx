"use client";

import { useCallback, useState } from "react";
import { addNote, forwardLead, logCall, moveApplicationStatus } from "@/app/actions/activity";
import { KButton } from "@/components/korosha/button";
import { KEmptyState } from "@/components/korosha/empty-state";
import { SidePanel, SidePanelField, SidePanelSection } from "@/components/korosha/side-panel";
import { KStatusSelect, type StatusOption } from "@/components/korosha/status-select";
import { StatusPill } from "@/components/korosha/status-pill";
import { toast } from "@/components/ui/toast";
import { LeadHead, LeadRow, type LeadRowData } from "./lead-row";

/**
 * The inbox.
 *
 * Panel state is local React state, NOT a route. Opening a lead must not lose
 * list position, scroll or filters, and a navigation would lose all three.
 */
export function LeadInbox({
  leads,
  statuses,
  emptyHint,
}: {
  leads: LeadRowData[];
  statuses: StatusOption[];
  emptyHint: string;
}) {
  const [openId, setOpenId] = useState<string | null>(null);
  const [panelOpen, setPanelOpen] = useState(false);
  const [note, setNote] = useState("");
  const [busy, setBusy] = useState(false);

  const lead = leads.find((candidate) => candidate.id === openId) ?? null;

  const open = useCallback((id: string) => {
    setOpenId(id);
    setPanelOpen(true);
  }, []);

  async function run(action: () => Promise<{ ok: true } | { ok: false; error: string }>, success: string) {
    setBusy(true);
    try {
      const result = await action();
      if (result.ok) toast.success(success);
      else toast.error(result.error);
      return result.ok;
    } finally {
      setBusy(false);
    }
  }

  function quickNote(target: LeadRowData) {
    const body = window.prompt(`Note about ${target.name}`);
    if (!body?.trim()) return;
    void run(
      () => addNote({ candidateId: target.candidateId, applicationId: target.id, body }),
      "Note added",
    );
  }

  function quickCall(target: LeadRowData) {
    if (!target.phone) return;
    // Telephony is not built. Hand off to the OS dialer, then log the outcome.
    window.location.href = `tel:${target.phone}`;
    void run(
      () =>
        logCall({
          candidateId: target.candidateId,
          applicationId: target.id,
          payload: {
            direction: "OUTBOUND",
            outcome: "NO_ANSWER",
            durationSeconds: null,
            phoneNumber: target.phone!,
            loggedManually: true,
          },
          body: "Dialled from the inbox; outcome not yet recorded.",
        }),
      "Call started — set the outcome in the panel",
    );
  }

  function forward(target: LeadRowData) {
    const destination = window.prompt(`Forward ${target.name} to which client list?`);
    if (!destination?.trim()) return;
    void run(
      () =>
        forwardLead({
          candidateId: target.candidateId,
          applicationId: target.id,
          destination,
        }),
      "Forwarded",
    );
  }

  function email(target: LeadRowData) {
    if (!target.email) {
      toast.error("No email address on file.");
      return;
    }
    window.location.href = `mailto:${target.email}`;
  }

  function reject(target: LeadRowData) {
    const rejected = statuses.find((status) => status.isTerminal);
    if (!rejected) {
      toast.error("No terminal status is configured.");
      return;
    }
    void run(() => moveApplicationStatus(target.id, rejected.id), `Moved to ${rejected.label}`);
  }

  if (!leads.length) {
    return <KEmptyState title="Nothing in this view" description={emptyHint} />;
  }

  return (
    <>
      <div className="overflow-hidden rounded-[6px] border border-[var(--line)] k-glass">
        <LeadHead />
        {leads.map((row) => (
          <LeadRow
            key={row.id}
            lead={row}
            selected={openId === row.id && panelOpen}
            onOpen={() => open(row.id)}
            onCall={() => quickCall(row)}
            onNote={() => quickNote(row)}
            onForward={() => forward(row)}
            onEmail={() => email(row)}
            onReject={() => reject(row)}
          />
        ))}
      </div>

      {lead && (
        <SidePanel
          open={panelOpen}
          onOpenChange={setPanelOpen}
          eyebrow="Lead"
          title={lead.name}
          description={`Applied ${lead.appliedLabel} ago via ${lead.source.toLowerCase().replace("_", " ")}`}
          actions={
            <>
              <KButton
                variant="accent"
                size="sm"
                disabled={!lead.phone}
                title={lead.phone ? undefined : "No phone number on file"}
                onClick={() => quickCall(lead)}
              >
                Call
              </KButton>
              <KStatusSelect
                value={statuses.find((status) => status.label === lead.statusLabel)?.id ?? statuses[0]?.id ?? ""}
                options={statuses}
                align="start"
                onChange={(nextId) => moveApplicationStatus(lead.id, nextId)}
              />
            </>
          }
        >
          <SidePanelSection title="Contact">
            <dl>
              <SidePanelField label="Phone">{lead.phone ?? "—"}</SidePanelField>
              <SidePanelField label="Email">{lead.email ?? "—"}</SidePanelField>
              <SidePanelField label="Status">
                <StatusPill color={lead.statusColor} label={lead.statusLabel} />
              </SidePanelField>
              <SidePanelField label="Applied">{lead.appliedLabel} ago</SidePanelField>
              {lead.otherApplications > 0 && (
                <SidePanelField label="Also in pipeline">
                  {lead.otherApplications} other application{lead.otherApplications === 1 ? "" : "s"}
                </SidePanelField>
              )}
              {lead.autoRejectedReason && (
                <SidePanelField label="Auto rejected">{lead.autoRejectedReason}</SidePanelField>
              )}
            </dl>
          </SidePanelSection>

          <SidePanelSection title="Add a note">
            <textarea
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What happened on this lead?"
              className="w-full resize-y rounded-[4px] border border-[var(--line)] bg-[var(--surface-sunken)] px-[var(--space-2)] py-[var(--space-1)] text-[length:var(--text-sm)] text-[var(--foreground)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent-line)]"
            />
            <div className="mt-[var(--space-2)] flex justify-end">
              <KButton
                size="sm"
                variant="accent"
                loading={busy}
                disabled={!note.trim()}
                onClick={async () => {
                  const ok = await run(
                    () => addNote({ candidateId: lead.candidateId, applicationId: lead.id, body: note }),
                    "Note added",
                  );
                  if (ok) setNote("");
                }}
              >
                Add note
              </KButton>
            </div>
          </SidePanelSection>

          <SidePanelSection title="Activity">
            <p className="text-[length:var(--text-sm)] text-[var(--ink-muted)]">
              The full timeline lives on the candidate record.
            </p>
            <a
              href={`/candidates/${lead.candidateId}`}
              className="mt-[var(--space-2)] inline-block text-[length:var(--text-sm)] font-medium text-[var(--foreground)] underline underline-offset-4"
            >
              Open candidate record
            </a>
          </SidePanelSection>
        </SidePanel>
      )}
    </>
  );
}
