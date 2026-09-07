import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { PAGE_SIZE, type ParsedListParams } from "@/lib/list-params";

/**
 * The inbox query.
 *
 * A "lead" is an Application. Candidate stays the person behind it, which is
 * why `otherApplicationCount` exists: the row must warn that this person is
 * already in the pipeline, since calling the same lead twice is the failure
 * this product is built to avoid.
 *
 * One query for the page, one for the counts. No N+1.
 */

const leadInclude = {
  candidate: {
    select: {
      id: true,
      firstName: true,
      lastName: true,
      email: true,
      phone: true,
      currentTitle: true,
      _count: { select: { applications: true } },
    },
  },
  statusRef: { select: { id: true, label: true, color: true } },
  job: { select: { id: true, title: true } },
  // A filtered relation count, so "has this been called" costs no extra query.
  _count: { select: { activities: { where: { type: "CALL_LOGGED" } } } },
} satisfies Prisma.ApplicationInclude;

export type LeadRow = Prisma.ApplicationGetPayload<{ include: typeof leadInclude }>;

export type LeadFilters = Pick<
  ParsedListParams<"leads">,
  "source" | "status" | "job" | "uncalled" | "orderBy" | "skip" | "take"
>;

export function buildLeadWhere(filters: {
  source: string | null;
  status: string | null;
  job: string | null;
  uncalled: boolean;
}): Prisma.ApplicationWhereInput {
  return {
    ...(filters.source ? { source: filters.source as Prisma.EnumApplicationSourceFilter } : {}),
    ...(filters.job ? { jobId: filters.job } : {}),
    ...(filters.status ? { statusRef: { key: filters.status } } : {}),
    // Uncalled is derived from the activity log, never from a column on
    // Application. Two sources of truth for the same fact would drift.
    ...(filters.uncalled ? { activities: { none: { type: "CALL_LOGGED" } } } : {}),
  };
}

export async function getLeads(filters: LeadFilters) {
  const where = buildLeadWhere(filters);

  const [rows, matching] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy: filters.orderBy as Prisma.ApplicationOrderByWithRelationInput,
      skip: filters.skip,
      take: filters.take,
      include: leadInclude,
    }),
    prisma.application.count({ where }),
  ]);

  return { rows, matching, pageSize: PAGE_SIZE };
}

/**
 * Counts for the filter bar. Each is scoped to the OTHER active filters, so
 * the number beside a chip is what clicking it would actually show.
 */
export async function getLeadCounts(filters: {
  source: string | null;
  status: string | null;
  job: string | null;
  uncalled: boolean;
}) {
  const withoutSource = buildLeadWhere({ ...filters, source: null });
  const withoutUncalled = buildLeadWhere({ ...filters, uncalled: false });

  const [bySource, total, uncalled] = await Promise.all([
    prisma.application.groupBy({
      by: ["source"],
      where: withoutSource,
      _count: { _all: true },
    }),
    prisma.application.count({ where: withoutSource }),
    prisma.application.count({
      where: { ...withoutUncalled, activities: { none: { type: "CALL_LOGGED" } } },
    }),
  ]);

  return {
    bySource: new Map(bySource.map((row) => [row.source, row._count._all])),
    total,
    uncalled,
  };
}

/** Everything the side panel shows, fetched only when a lead is opened. */
export async function getLeadDetail(applicationId: string) {
  return prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      candidate: true,
      statusRef: { select: { id: true, label: true, color: true } },
      job: { select: { id: true, title: true, reqCode: true } },
      documents: { select: { id: true, filename: true, parseStatus: true } },
    },
  });
}

/** Compact relative age. The fastest-reading value on the row. */
export function sinceLabel(date: Date, now = Date.now()) {
  // Floor, not round: a lead that arrived 30 seconds ago reads "now" rather
  // than claiming a minute has already gone by.
  const minutes = Math.max(0, Math.floor((now - date.getTime()) / 60_000));
  if (minutes < 1) return "now";
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days}d`;
  return `${Math.floor(days / 30)}mo`;
}
