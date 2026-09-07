"use server";

import { revalidatePath } from "next/cache";
import type { StatusCountsAs } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/auth";
import { STATUS_COLOR_TOKENS } from "@/components/korosha/status-pill";

export type StatusActionResult = { ok: true } | { ok: false; error: string };

function revalidateStatusViews() {
  try {
    revalidatePath("/settings/statuses");
    revalidatePath("/candidates");
    revalidatePath("/applications");
    revalidatePath("/");
  } catch {
    // No request scope. The write already landed; a stale cache is not a failure.
  }
}

function isValidColor(color: string) {
  return (STATUS_COLOR_TOKENS as readonly string[]).includes(color);
}

/** Keys are stable identifiers; labels are free text and may be renamed. */
function toKey(label: string) {
  return label
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9]+/g, "_")
    .replace(/^_+|_+$/g, "")
    .slice(0, 40);
}

export async function createStatus(input: {
  label: string;
  color: string;
  countsAs: StatusCountsAs;
  isTerminal: boolean;
}): Promise<StatusActionResult> {
  await requireUser();

  const label = input.label.trim();
  if (!label) return { ok: false, error: "A status needs a name." };
  if (label.length > 40) return { ok: false, error: "That name is too long." };
  if (!isValidColor(input.color)) return { ok: false, error: "Pick a color from the palette." };

  const key = toKey(label);
  if (!key) return { ok: false, error: "That name cannot be used." };
  if (await prisma.status.findUnique({ where: { key }, select: { id: true } })) {
    return { ok: false, error: "A status with that name already exists." };
  }

  const last = await prisma.status.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
  await prisma.status.create({
    data: {
      key,
      label,
      color: input.color,
      countsAs: input.countsAs,
      isTerminal: input.isTerminal,
      order: (last?.order ?? -1) + 1,
    },
  });

  revalidateStatusViews();
  return { ok: true };
}

export async function updateStatus(input: {
  id: string;
  label?: string;
  color?: string;
  countsAs?: StatusCountsAs;
  isTerminal?: boolean;
  active?: boolean;
}): Promise<StatusActionResult> {
  await requireUser();

  const status = await prisma.status.findUnique({
    where: { id: input.id },
    select: { id: true, _count: { select: { applications: true } } },
  });
  if (!status) return { ok: false, error: "That status no longer exists." };

  if (input.label !== undefined) {
    const label = input.label.trim();
    if (!label) return { ok: false, error: "A status needs a name." };
    if (label.length > 40) return { ok: false, error: "That name is too long." };
  }
  if (input.color !== undefined && !isValidColor(input.color)) {
    return { ok: false, error: "Pick a color from the palette." };
  }

  // Deactivating a status keeps its applications and history; it is simply no
  // longer offered when moving one. Renaming never rewrites history, because
  // STATUS_CHANGED stores the label it saw at the time alongside the id.
  await prisma.status.update({
    where: { id: input.id },
    data: {
      ...(input.label !== undefined ? { label: input.label.trim() } : {}),
      ...(input.color !== undefined ? { color: input.color } : {}),
      ...(input.countsAs !== undefined ? { countsAs: input.countsAs } : {}),
      ...(input.isTerminal !== undefined ? { isTerminal: input.isTerminal } : {}),
      ...(input.active !== undefined ? { active: input.active } : {}),
    },
  });

  revalidateStatusViews();
  return { ok: true };
}

/**
 * Deletes a status only when nothing points at it.
 *
 * A status with applications attached is never deleted — losing it would strand
 * those leads with no stage at all. The caller is offered deactivate, or
 * reassign-then-delete, instead.
 */
export async function deleteStatus(input: {
  id: string;
  /** When given, move the attached applications here first. */
  reassignToId?: string;
}): Promise<StatusActionResult> {
  const user = await requireUser();

  const status = await prisma.status.findUnique({
    where: { id: input.id },
    select: { id: true, label: true, _count: { select: { applications: true } } },
  });
  if (!status) return { ok: false, error: "That status no longer exists." };

  const attached = status._count.applications;

  if (attached > 0 && !input.reassignToId) {
    return {
      ok: false,
      error: `${attached} application${attached === 1 ? "" : "s"} still use this status. Reassign them or deactivate it instead.`,
    };
  }

  if (attached > 0 && input.reassignToId) {
    if (input.reassignToId === input.id) {
      return { ok: false, error: "Pick a different status to reassign to." };
    }
    const target = await prisma.status.findUnique({
      where: { id: input.reassignToId },
      select: { id: true, label: true },
    });
    if (!target) return { ok: false, error: "That replacement status does not exist." };

    // Reassignment is a state change per application, so each one gets its own
    // event. The activity log is the reporting source of truth and must not
    // silently gain rows in a status it has no record of them entering.
    const affected = await prisma.application.findMany({
      where: { statusId: status.id },
      select: { id: true, candidateId: true },
    });

    await prisma.$transaction(async (tx) => {
      await tx.application.updateMany({
        where: { statusId: status.id },
        data: { statusId: target.id },
      });
      await tx.activity.createMany({
        data: affected.map((application) => ({
          candidateId: application.candidateId,
          applicationId: application.id,
          type: "STATUS_CHANGED",
          payload: {
            from: status.label,
            to: target.label,
            fromStatusId: status.id,
            toStatusId: target.id,
            reassigned: true,
          },
          actorId: user.id,
        })),
      });
      await tx.status.delete({ where: { id: status.id } });
    });

    revalidateStatusViews();
    return { ok: true };
  }

  await prisma.status.delete({ where: { id: status.id } });
  revalidateStatusViews();
  return { ok: true };
}

/** Persists a new board order. Ids arrive in the order they should appear. */
export async function reorderStatuses(orderedIds: string[]): Promise<StatusActionResult> {
  await requireUser();
  if (!orderedIds.length) return { ok: false, error: "Nothing to reorder." };

  const existing = await prisma.status.findMany({ select: { id: true } });
  const known = new Set(existing.map((status) => status.id));
  if (orderedIds.some((id) => !known.has(id))) {
    return { ok: false, error: "That list is out of date. Reload and try again." };
  }

  await prisma.$transaction(
    orderedIds.map((id, index) =>
      prisma.status.update({ where: { id }, data: { order: index } }),
    ),
  );

  revalidateStatusViews();
  return { ok: true };
}
