"use server";

import { revalidatePath } from "next/cache";
import { getUser } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { normalizePhone } from "@/lib/inbound";
import { writeActivity, type PayloadBody } from "@/lib/activity/types";

export type ActionResult<T = void> =
  | ({ ok: true } & (T extends void ? Record<string, never> : { data: T }))
  | { ok: false; error: string };

/** StatusSelect depends on this exact shape; do not widen it casually. */
export type StatusChangeResult = { ok: true } | { ok: false; error: string };

type ActorInput = { actorId?: string | null };

/**
 * Resolves the acting user.
 *
 * Presence of the key is what matters, not its value: an explicit `null` means
 * "a system wrote this" (the parser, the webhook) and must stay null, while an
 * omitted key means "whoever is signed in". Collapsing those with `??` would
 * silently attribute machine writes to whichever recruiter happened to trigger
 * them.
 */
async function resolveActor(input: ActorInput) {
  if ("actorId" in input) return input.actorId ?? null;
  // getUser() owns the request-scope handling; an unattributable write is not
  // a failed one, so a signed-out caller yields null rather than throwing.
  const user = await getUser();
  return user?.id ?? null;
}

/**
 * The write is already committed by the time this runs, and revalidatePath
 * throws outside a request context. A stale cache must never be reported as a
 * failed mutation — that invites a retry of something that already happened.
 */
function revalidateCandidate(candidateId: string, jobId?: string | null) {
  try {
    revalidatePath(`/candidates/${candidateId}`);
    revalidatePath("/candidates");
    if (jobId) revalidatePath(`/jobs/${jobId}`);
    revalidatePath("/");
  } catch {
    // No request scope (a script or a test). Nothing to revalidate.
  }
}

export async function addNote(
  input: { candidateId: string; applicationId?: string | null; body: string } & ActorInput,
): Promise<ActionResult> {
  const body = input.body?.trim();
  if (!body) return { ok: false, error: "A note needs some text." };
  if (body.length > 10_000) return { ok: false, error: "That note is too long." };

  const candidate = await prisma.candidate.findUnique({
    where: { id: input.candidateId },
    select: { id: true },
  });
  if (!candidate) return { ok: false, error: "That candidate no longer exists." };

  await writeActivity(prisma, {
    candidateId: input.candidateId,
    applicationId: input.applicationId ?? null,
    type: "NOTE_ADDED",
    payload: {},
    actorId: await resolveActor(input),
    body,
  });

  revalidateCandidate(input.candidateId);
  return { ok: true } as ActionResult;
}

export async function logCall(
  input: {
    candidateId: string;
    applicationId?: string | null;
    payload: PayloadBody<"CALL_LOGGED">;
    body?: string | null;
  } & ActorInput,
): Promise<ActionResult> {
  const { outcome, durationSeconds, phoneNumber, direction } = input.payload;

  // A connected call with no duration is almost always a mis-click, and it
  // would quietly poison any talk-time reporting built on this later.
  if (outcome === "CONNECTED" && !durationSeconds) {
    return { ok: false, error: "A connected call needs a duration longer than zero." };
  }

  const normalized = normalizePhone(phoneNumber);
  if (!normalized) return { ok: false, error: "That phone number does not look dialable." };

  const candidate = await prisma.candidate.findUnique({
    where: { id: input.candidateId },
    select: { id: true },
  });
  if (!candidate) return { ok: false, error: "That candidate no longer exists." };

  try {
    await writeActivity(prisma, {
      candidateId: input.candidateId,
      applicationId: input.applicationId ?? null,
      type: "CALL_LOGGED",
      payload: {
        direction,
        outcome,
        durationSeconds: durationSeconds ?? null,
        phoneNumber: normalized,
        loggedManually: true,
      },
      actorId: await resolveActor(input),
      body: input.body?.trim() || null,
    });
  } catch {
    // writeActivity throws on a payload that fails its variant.
    return { ok: false, error: "That call could not be logged." };
  }

  revalidateCandidate(input.candidateId);
  return { ok: true } as ActionResult;
}

export async function togglePinned(
  input: { activityId: string } & ActorInput,
): Promise<ActionResult<{ pinned: boolean }>> {
  const activity = await prisma.activity.findUnique({
    where: { id: input.activityId },
    select: { id: true, pinned: true, candidateId: true },
  });
  if (!activity) return { ok: false, error: "That entry no longer exists." };

  const updated = await prisma.activity.update({
    where: { id: activity.id },
    data: { pinned: !activity.pinned },
    select: { pinned: true },
  });

  revalidateCandidate(activity.candidateId);
  return { ok: true, data: { pinned: updated.pinned } };
}

/**
 * Moves one Application between pipeline stages.
 *
 * Moved here from app/actions/application.ts so every Activity write goes
 * through writeActivity. The result shape is unchanged: StatusSelect renders
 * `{ ok: false, error }` itself rather than requiring callers to throw.
 */
export async function moveApplicationStatus(
  applicationId: string,
  nextStatusId: string,
  options: ActorInput = {},
): Promise<StatusChangeResult> {
  const [application, nextStatus] = await Promise.all([
    prisma.application.findUnique({
      where: { id: applicationId },
      select: {
        id: true,
        jobId: true,
        candidateId: true,
        statusId: true,
        statusRef: { select: { id: true, label: true } },
      },
    }),
    prisma.status.findUnique({
      where: { id: nextStatusId },
      select: { id: true, label: true, active: true },
    }),
  ]);

  if (!application) return { ok: false, error: "That application no longer exists." };
  if (!nextStatus) return { ok: false, error: "That is not a valid stage." };
  if (!nextStatus.active) return { ok: false, error: "That stage is no longer in use." };
  if (application.statusId === nextStatus.id) {
    return { ok: false, error: "That application is already at this stage." };
  }

  const actorId = await resolveActor(options);

  // Status change and its Activity row land together or not at all — the
  // activity log is the reporting source of truth and cannot drift.
  await prisma.$transaction(async (transaction) => {
    await transaction.application.update({
      where: { id: application.id },
      data: { statusId: nextStatus.id },
    });
    await writeActivity(transaction, {
      candidateId: application.candidateId,
      applicationId: application.id,
      type: "STATUS_CHANGED",
      // Ids are the truth; labels are a snapshot so history survives a rename.
      payload: {
        from: application.statusRef?.label ?? "Unknown",
        to: nextStatus.label,
        fromStatusId: application.statusRef?.id ?? null,
        toStatusId: nextStatus.id,
      },
      actorId,
    });
  });

  revalidateCandidate(application.candidateId, application.jobId);
  return { ok: true };
}
