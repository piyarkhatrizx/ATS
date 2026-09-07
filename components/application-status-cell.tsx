"use client";

import type { ApplicationStatus } from "@prisma/client";
import { moveApplicationStatus } from "@/app/actions/application";
import { StatusSelect } from "@/components/ui/status-select";

/**
 * The bridge between the status dropdown and the server action.
 *
 * The action's result is returned to StatusSelect unchanged — no translation,
 * no throwing convention for a call site to forget. Server components render
 * this directly; they cannot pass the action inline because they may not hand
 * a function to a client component as a prop.
 */
export function ApplicationStatusCell({
  applicationId,
  status,
  align = "start",
}: {
  applicationId: string;
  status: ApplicationStatus;
  align?: "start" | "end";
}) {
  return (
    <StatusSelect
      value={status}
      align={align}
      onChange={(next) => moveApplicationStatus(applicationId, next)}
    />
  );
}
