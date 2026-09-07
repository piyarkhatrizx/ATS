/**
 * Moves CaregiverApplication rows onto the real Candidate/Application pipeline.
 * Idempotent: intakeApplication dedupes, so a second run creates nothing.
 *
 * Run: npm run migrate:caregivers
 */
import { prisma } from "@/lib/prisma";
import { intakeApplication } from "@/lib/intake";

const CAREGIVER_JOB_ALIAS = process.env.CAREGIVER_JOB_ALIAS ?? "caregiver";

async function main() {
  const job = await prisma.job.findUnique({
    where: { ingestAlias: CAREGIVER_JOB_ALIAS },
    select: { id: true, title: true, status: true },
  });
  if (!job) {
    throw new Error(
      `No Job with ingestAlias "${CAREGIVER_JOB_ALIAS}". Seed it before migrating.`,
    );
  }

  const rows = await prisma.caregiverApplication.findMany({ orderBy: { createdAt: "asc" } });
  const applicationsBefore = await prisma.application.count();

  console.log(`Target job:            ${job.title} (${CAREGIVER_JOB_ALIAS}, ${job.status})`);
  console.log(`CaregiverApplication:  ${rows.length} rows`);
  console.log(`Application before:    ${applicationsBefore}`);
  console.log("");

  let created = 0;
  let deduped = 0;
  let failed = 0;

  for (const row of rows) {
    try {
      const result = await intakeApplication({
        jobId: job.id,
        source: "APPLY_FORM",
        firstName: row.firstName,
        lastName: row.lastName,
        email: row.email,
        phone: row.phone,
        screening: {
          isAtLeast18: row.isAtLeast18,
          isCpaCertified: row.isCpaCertified,
          patientUsesMedicare: row.patientUsesMedicare,
          caregivingInterest: row.caregivingInterest,
        },
        appliedAt: row.createdAt,
      });
      if (result.isNewCandidate) created += 1;
      else deduped += 1;
    } catch (error) {
      failed += 1;
      // Row id only — no applicant PII in migration output.
      console.error(`  failed: ${row.id} — ${error instanceof Error ? error.message : "unknown"}`);
    }
  }

  const applicationsAfter = await prisma.application.count();

  console.log(`Rows processed:        ${rows.length}`);
  console.log(`New candidates:        ${created}`);
  console.log(`Deduped into existing: ${deduped}`);
  if (failed) console.log(`Failed:                ${failed}`);
  console.log(`Application after:     ${applicationsAfter}`);
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
