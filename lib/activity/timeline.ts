import { prisma } from "@/lib/prisma";
import { safeParseActivity, type ParsedActivity } from "@/lib/activity/types";

export const TIMELINE_PAGE_SIZE = 50;

const timelineInclude = {
  actor: { select: { id: true, name: true, email: true } },
  application: {
    select: {
      id: true,
      statusRef: { select: { id: true, label: true, color: true } },
      job: { select: { id: true, title: true } },
    },
  },
} as const;

type TimelineRow = Awaited<
  ReturnType<typeof prisma.activity.findMany<{ include: typeof timelineInclude }>>
>[number];

export type TimelineEntry = ParsedActivity<TimelineRow>;

export type CandidateTimeline = {
  pinned: TimelineEntry[];
  entries: TimelineEntry[];
  nextCursor: string | null;
};

/**
 * A cursor must be unique and stable, and createdAt alone is neither — seeded
 * history writes several rows with the same timestamp, and a bare timestamp
 * cursor would drop or repeat rows at the page boundary. Pairing it with the id
 * gives a total order.
 */
function encodeCursor(row: { createdAt: Date; id: string }) {
  return `${row.createdAt.toISOString()}|${row.id}`;
}

function decodeCursor(cursor: string | null | undefined) {
  if (!cursor) return null;
  const [timestamp, id] = cursor.split("|");
  const createdAt = new Date(timestamp ?? "");
  if (!id || Number.isNaN(createdAt.getTime())) return null;
  return { createdAt, id };
}

/**
 * Every activity for one candidate, across all of their applications.
 *
 * `candidateId` is a column on Activity, so this spans applications without a
 * join and without an N+1 — the Job and Application come back in the same
 * query. Pinned rows are fetched separately so a pinned entry from deep in the
 * history still surfaces at the top rather than only appearing on page four.
 */
export async function getCandidateTimeline(
  candidateId: string,
  options: { cursor?: string | null } = {},
): Promise<CandidateTimeline> {
  const after = decodeCursor(options.cursor);

  const [pinnedRows, rows] = await Promise.all([
    // Only on the first page; later pages would repeat them.
    after
      ? Promise.resolve([])
      : prisma.activity.findMany({
          where: { candidateId, pinned: true },
          include: timelineInclude,
          orderBy: [{ createdAt: "desc" }, { id: "desc" }],
          take: 20,
        }),
    prisma.activity.findMany({
      where: {
        candidateId,
        ...(after
          ? {
              OR: [
                { createdAt: { lt: after.createdAt } },
                { createdAt: after.createdAt, id: { lt: after.id } },
              ],
            }
          : {}),
      },
      include: timelineInclude,
      orderBy: [{ createdAt: "desc" }, { id: "desc" }],
      // One extra row tells us whether another page exists without a count().
      take: TIMELINE_PAGE_SIZE + 1,
    }),
  ]);

  const page = rows.slice(0, TIMELINE_PAGE_SIZE);
  const nextCursor = rows.length > TIMELINE_PAGE_SIZE ? encodeCursor(page[page.length - 1]) : null;

  return {
    pinned: pinnedRows.map((row) => safeParseActivity(row)),
    entries: page.map((row) => safeParseActivity(row)),
    nextCursor,
  };
}

/** Groups entries by calendar day, preserving the newest-first order. */
export function groupByDay(entries: TimelineEntry[]) {
  const groups: Array<{ day: string; entries: TimelineEntry[] }> = [];
  for (const entry of entries) {
    const day = entry.row.createdAt.toISOString().slice(0, 10);
    const last = groups[groups.length - 1];
    if (last && last.day === day) last.entries.push(entry);
    else groups.push({ day, entries: [entry] });
  }
  return groups;
}
