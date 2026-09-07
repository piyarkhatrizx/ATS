"use server";

import { revalidatePath } from "next/cache";
import type { ApplicationStatus } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { APPLICATION_STATUSES } from "@/lib/application-status";

export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? Record<string, never> : { data: T }))
  | { ok: false; error: string };

/**
 * Moves one Application to a new stage.
 *
 * Returns a discriminated result instead of throwing so the client can toast
 * the message. Errors stay generic: an application id is not the caller's to
 * confirm, and candidate PII never reaches the client.
 */
export async function moveApplicationStatus(
  applicationId: string,
  nextStatus: ApplicationStatus,
): Promise<ActionResult> {
  if (!APPLICATION_STATUSES.includes(nextStatus)) {
    return { ok: false, error: "That is not a valid stage." };
  }

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { id: true, status: true, jobId: true, candidateId: true },
  });
  if (!application) {
    return { ok: false, error: "That application no longer exists." };
  }

  if (application.status === nextStatus) {
    return { ok: false, error: "That application is already at this stage." };
  }

  const from = application.status;

  // Status change and its Activity row land together or not at all — the
  // activity log is the reporting source of truth and cannot drift.
  await prisma.$transaction([
    prisma.application.update({
      where: { id: application.id },
      data: { status: nextStatus },
    }),
    prisma.activity.create({
      data: {
        candidateId: application.candidateId,
        applicationId: application.id,
        type: "STATUS_CHANGED",
        payload: { from, to: nextStatus },
      },
    }),
  ]);

  // The write is already committed. revalidatePath throws outside a request
  // context, and a stale cache must never be reported to the caller as a failed
  // mutation — that would invite a retry of a move that already happened.
  try {
    revalidatePath(`/jobs/${application.jobId}`);
    revalidatePath(`/candidates/${application.candidateId}`);
    revalidatePath("/candidates");
    revalidatePath("/");
  } catch {
    // No request scope (a script or a test). Nothing to revalidate.
  }

  return { ok: true } as ActionResult;
}
