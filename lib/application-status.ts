import type { Status, StatusCountsAs } from "@prisma/client";
import { prisma } from "@/lib/prisma";

/**
 * Statuses are rows, not an enum.
 *
 * Nothing may hardcode a status name. Analytics derives accepted and rejected
 * from `countsAs`, so renaming "Hired" to "Placed" changes a label and nothing
 * else. The keys below exist only as the seeded defaults — code must not branch
 * on them.
 */

export type StatusSummary = Pick<
  Status,
  "id" | "key" | "label" | "color" | "order" | "isTerminal" | "countsAs" | "active"
>;

const STATUS_SELECT = {
  id: true,
  key: true,
  label: true,
  color: true,
  order: true,
  isTerminal: true,
  countsAs: true,
  active: true,
} as const;

/** Every status in board order. Inactive ones included; filter at the call site. */
export async function getStatuses(): Promise<StatusSummary[]> {
  return prisma.status.findMany({ select: STATUS_SELECT, orderBy: [{ order: "asc" }, { key: "asc" }] });
}

/** Only statuses a recruiter may move an application into. */
export async function getActiveStatuses(): Promise<StatusSummary[]> {
  return prisma.status.findMany({
    where: { active: true },
    select: STATUS_SELECT,
    orderBy: [{ order: "asc" }, { key: "asc" }],
  });
}

export async function getStatusByKey(key: string): Promise<StatusSummary | null> {
  return prisma.status.findUnique({ where: { key }, select: STATUS_SELECT });
}

/** The status a new application starts in: lowest order among active, open ones. */
export async function getDefaultStatus(): Promise<StatusSummary | null> {
  return prisma.status.findFirst({
    where: { active: true, countsAs: "OPEN" },
    select: STATUS_SELECT,
    orderBy: [{ order: "asc" }, { key: "asc" }],
  });
}

export const COUNTS_AS_VALUES = ["OPEN", "ACCEPTED", "REJECTED"] as const satisfies readonly StatusCountsAs[];

export const countsAsLabel: Record<StatusCountsAs, string> = {
  OPEN: "Open",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};
