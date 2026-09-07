"use client";

import { useState, useTransition } from "react";
import { addNote } from "@/app/actions/activity";
import { Button } from "@/components/ui/button";
import { toast } from "@/components/ui/toast";

export function NoteComposer({ candidateId }: { candidateId: string }) {
  const [body, setBody] = useState("");
  const [pending, startTransition] = useTransition();

  function submit() {
    const text = body.trim();
    if (!text) return;
    startTransition(async () => {
      const result = await addNote({ candidateId, body: text });
      if (result.ok) {
        setBody("");
        toast.success("Note added");
      } else {
        toast.error(result.error);
      }
    });
  }

  return (
    <div className="border border-[var(--line)] bg-[var(--surface)] p-[var(--space-3)]">
      <label htmlFor="note-body" className="sr-only">
        Add a note
      </label>
      <textarea
        id="note-body"
        rows={3}
        value={body}
        onChange={(event) => setBody(event.target.value)}
        placeholder="Add a note about this candidate…"
        className="w-full resize-y border border-[var(--line)] bg-[var(--background)] px-[var(--space-2)] py-[var(--space-1)] text-[var(--text-sm)] outline-none focus:border-[var(--accent)]"
      />
      <div className="mt-[var(--space-2)] flex justify-end">
        <Button size="sm" onClick={submit} loading={pending} disabled={!body.trim()}>
          Add note
        </Button>
      </div>
    </div>
  );
}
