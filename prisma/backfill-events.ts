/**
 * Backfills APPLICATION_CREATED events for applications that predate the
 * activity log. Run: npm run backfill:events
 *
 * Only writes what the data actually supports:
 *   - appliedAt is a real column, so the timestamp is derived, never invented.
 *   - source is a real column, so the payload is accurate.
 *   - actorId is null: nobody knows who, and guessing would be worse than
 *     saying "system".
 *
 * What it deliberately does NOT do:
 *   - It does not synthesise STATUS_CHANGED history. An application sitting in
 *     "Interview" tells you where it IS, not the path it took or when each step
 *     happened. Inventing those timestamps would corrupt the median-time-to-
 *     first-call metric that analytics is built on.
 *   - It does not backfill CALL_LOGGED. There is no record of calls made before
 *     logging existed.
 *
 * Idempotent: an application that already has a creation event is skipped.
 */
import { prisma } from "@/lib/prisma";
import { writeActivity } from "@/lib/activity/types";

export async function backfillEvents({ dryRun = false } = {}) {
  const missing = await prisma.application.findMany({
    where: { activities: { none: { type: { in: ["APPLICATION_CREATED", "REAPPLIED"] } } } },
    select: { id: true, candidateId: true, source: true, appliedAt: true },
    orderBy: { appliedAt: "asc" },
  });

  if (!dryRun) {
    for (const application of missing) {
      await writeActivity(prisma, {
        candidateId: application.candidateId,
        applicationId: application.id,
        type: "APPLICATION_CREATED",
        payload: { source: application.source },
        actorId: null,
        // Derived from the column, not invented.
        createdAt: application.appliedAt,
      });
    }
  }

  return { written: missing.length };
}

if (process.argv[1]?.includes("backfill-events")) {
  const dryRun = process.argv.includes("--dry-run");
  (async () => {
    const before = await prisma.activity.count();
    const applications = await prisma.application.count();

    const { written } = await backfillEvents({ dryRun });

    const after = await prisma.activity.count();
    const stillMissing = await prisma.application.count({
      where: { activities: { none: { type: { in: ["APPLICATION_CREATED", "REAPPLIED"] } } } },
    });
    const noStatusHistory = await prisma.application.count({
      where: { activities: { none: { type: "STATUS_CHANGED" } } },
    });

    console.log(`\n${dryRun ? "DRY RUN — nothing written" : "Backfill complete"}\n`);
    console.log(`  applications                    ${applications}`);
    console.log(`  creation events ${dryRun ? "that would be" : ""} written  ${written}`);
    console.log(`  activity rows before / after    ${before} / ${after}`);
    console.log(`  still missing a creation event  ${stillMissing}`);
    console.log("");
    console.log("  Not backfilled, by design:");
    console.log(`    ${noStatusHistory} application(s) have no STATUS_CHANGED history.`);
    console.log("    Current status says where a lead IS, not the path it took or");
    console.log("    when. Inventing those timestamps would corrupt time-to-first-call.");
    console.log("");
  })()
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
