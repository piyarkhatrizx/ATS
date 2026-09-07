"use client";

import { useState, useTransition } from "react";
import { logCall } from "@/app/actions/activity";
import { Button } from "@/components/ui/button";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Select } from "@/components/ui/select";
import { toast } from "@/components/ui/toast";
import { formatPhoneLabel, isCallDisabled, toDurationSeconds } from "@/lib/activity/call";
import { CALL_DIRECTIONS, CALL_OUTCOMES, type CallOutcome } from "@/lib/activity/types";

const outcomeLabel: Record<CallOutcome, string> = {
  CONNECTED: "Connected",
  VOICEMAIL: "Left voicemail",
  NO_ANSWER: "No answer",
  WRONG_NUMBER: "Wrong number",
  CALLBACK_REQUESTED: "Callback requested",
};

export function CallButton({
  candidateId,
  phone,
  applicationId,
}: {
  candidateId: string;
  phone: string | null;
  applicationId?: string | null;
}) {
  const disabled = isCallDisabled(phone);
  const [open, setOpen] = useState(false);
  const [direction, setDirection] = useState<(typeof CALL_DIRECTIONS)[number]>("OUTBOUND");
  const [outcome, setOutcome] = useState<CallOutcome>("CONNECTED");
  const [minutes, setMinutes] = useState("");
  const [seconds, setSeconds] = useState("");
  const [note, setNote] = useState("");
  const [pending, startTransition] = useTransition();

  const durationEnabled = outcome === "CONNECTED";

  function submit() {
    startTransition(async () => {
      const result = await logCall({
        candidateId,
        applicationId: applicationId ?? null,
        payload: {
          direction,
          outcome,
          durationSeconds: durationEnabled ? toDurationSeconds(minutes, seconds) : null,
          phoneNumber: phone ?? "",
          loggedManually: true,
        },
        body: note,
      });

      if (result.ok) {
        toast.success("Call logged");
        setOpen(false);
        setMinutes("");
        setSeconds("");
        setNote("");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <>
      <Button
        variant="secondary"
        disabled={disabled}
        title={disabled ? "No phone number on file" : undefined}
        onClick={() => setOpen(true)}
      >
        Call
      </Button>

      <Dialog
        open={open}
        onOpenChange={setOpen}
        title="Call candidate"
        description="Place the call from your phone, then log what happened."
        footer={
          <div className="flex justify-end gap-2">
            <Button variant="secondary" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button onClick={submit} loading={pending}>
              Log call
            </Button>
          </div>
        }
      >
        <div className="space-y-4">
          <div>
            <p className="text-[var(--text-xs)] uppercase tracking-[0.12em] text-[var(--ink-muted)]">
              Number
            </p>
            {/* href carries normalized digits; the label carries the formatting. */}
            <a
              href={`tel:${phone ?? ""}`}
              className="mt-1 inline-block text-[var(--text-lg)] font-semibold text-[var(--accent-deep)] hover:underline"
            >
              {phone ? formatPhoneLabel(phone) : "No number on file"}
            </a>
          </div>

          {/*
            Deliberately inert. A future telephony component replaces this block
            and nothing around it needs to change. No fake ringing, no timer, no
            connecting animation — it should read as unfinished, because it is.
          */}
          <div
            data-telephony-slot="call-controls"
            className="flex min-h-[120px] flex-col items-center justify-center border border-dashed border-[var(--line)] bg-[var(--surface)] p-4 text-center"
          >
            <p className="text-[var(--text-sm)] font-medium">In-app calling is not connected yet</p>
            <p className="mt-1 max-w-xs text-[var(--text-xs)] leading-relaxed text-[var(--ink-muted)]">
              Place this call from your own phone using the number above, then record the outcome
              below so it lands on the candidate&rsquo;s timeline.
            </p>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Select
              label="Direction"
              value={direction}
              onChange={(event) => setDirection(event.target.value as (typeof CALL_DIRECTIONS)[number])}
            >
              <option value="OUTBOUND">Outbound</option>
              <option value="INBOUND">Inbound</option>
            </Select>
            <Select
              label="Outcome"
              value={outcome}
              onChange={(event) => setOutcome(event.target.value as CallOutcome)}
            >
              {CALL_OUTCOMES.map((value) => (
                <option key={value} value={value}>
                  {outcomeLabel[value]}
                </option>
              ))}
            </Select>
          </div>

          <div className="grid gap-3 sm:grid-cols-2">
            <Input
              label="Minutes"
              type="number"
              min={0}
              inputMode="numeric"
              value={minutes}
              disabled={!durationEnabled}
              hint={durationEnabled ? undefined : "Only for connected calls"}
              onChange={(event) => setMinutes(event.target.value)}
            />
            <Input
              label="Seconds"
              type="number"
              min={0}
              max={59}
              inputMode="numeric"
              value={seconds}
              disabled={!durationEnabled}
              onChange={(event) => setSeconds(event.target.value)}
            />
          </div>

          <div>
            <label
              htmlFor="call-note"
              className="mb-1 block text-[var(--text-sm)] font-medium"
            >
              Notes
            </label>
            <textarea
              id="call-note"
              rows={3}
              value={note}
              onChange={(event) => setNote(event.target.value)}
              placeholder="What was discussed?"
              className="w-full resize-y border border-[var(--line)] bg-[var(--background)] px-2 py-1.5 text-[var(--text-sm)] outline-none focus:border-[var(--accent)]"
            />
          </div>
        </div>
      </Dialog>
    </>
  );
}
