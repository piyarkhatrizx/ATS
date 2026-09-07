/**
 * Creates the requisition the apply page files into. Idempotent.
 * Run: npm run seed:caregiver-job
 */
import { prisma } from "@/lib/prisma";

const CAREGIVER_JOB_ALIAS = process.env.CAREGIVER_JOB_ALIAS ?? "caregiver";

async function main() {
  const job = await prisma.job.upsert({
    where: { ingestAlias: CAREGIVER_JOB_ALIAS },
    update: { status: "OPEN" },
    create: {
      title: "Caregiver",
      reqCode: "CARE-001",
      ingestAlias: CAREGIVER_JOB_ALIAS,
      status: "OPEN",
    },
  });
  console.log(`Job ready: ${job.title} (${job.reqCode} / ${job.ingestAlias}) — ${job.status}`);
  console.log(`id: ${job.id}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
