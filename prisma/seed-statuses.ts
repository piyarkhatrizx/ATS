/**
 * The default status set. Run: npm run seed:statuses
 *
 * These deliberately mirror the eight ApplicationStatus enum values, so when
 * Phase 4 migrates Application.status onto Application.statusId nothing loses
 * its state — the enum value becomes the status key.
 *
 * Idempotent: keyed on Status.key, so a rerun updates in place. Label, color
 * and order are user-editable in settings and are NOT overwritten on rerun;
 * only structural fields are reconciled.
 */
import { prisma } from "@/lib/prisma";
import type { StatusCountsAs } from "@prisma/client";

type SeedStatus = {
  key: string;
  label: string;
  color: string;
  order: number;
  isTerminal: boolean;
  countsAs: StatusCountsAs;
};

/** Colors are token names from styles/tokens.css, not raw hex. */
export const DEFAULT_STATUSES: SeedStatus[] = [
  { key: "NEW", label: "New", color: "--status-open", order: 0, isTerminal: false, countsAs: "OPEN" },
  { key: "SCREENING", label: "Screening", color: "--status-active", order: 1, isTerminal: false, countsAs: "OPEN" },
  { key: "PHONE_SCREEN", label: "Phone screen", color: "--status-active", order: 2, isTerminal: false, countsAs: "OPEN" },
  { key: "INTERVIEW", label: "Interview", color: "--status-active", order: 3, isTerminal: false, countsAs: "OPEN" },
  { key: "OFFER", label: "Offer", color: "--status-accepted", order: 4, isTerminal: false, countsAs: "OPEN" },
  { key: "HIRED", label: "Accepted", color: "--status-accepted", order: 5, isTerminal: true, countsAs: "ACCEPTED" },
  { key: "REJECTED", label: "Rejected", color: "--status-rejected", order: 6, isTerminal: true, countsAs: "REJECTED" },
  { key: "WITHDRAWN", label: "Withdrawn", color: "--status-neutral", order: 7, isTerminal: true, countsAs: "REJECTED" },
];

export async function seedStatuses() {
  for (const status of DEFAULT_STATUSES) {
    await prisma.status.upsert({
      where: { key: status.key },
      // Structural only. A recruiter who renamed or recolored a status keeps it.
      update: { isTerminal: status.isTerminal, countsAs: status.countsAs },
      create: status,
    });
  }
  return prisma.status.count();
}

if (process.argv[1]?.includes("seed-statuses")) {
  seedStatuses()
    .then(async (count) => {
      const rows = await prisma.status.findMany({ orderBy: { order: "asc" } });
      console.log(`${count} statuses\n`);
      for (const row of rows) {
        console.log(`  ${String(row.order).padStart(2)}  ${row.key.padEnd(14)} ${row.label.padEnd(14)} ${row.countsAs}${row.isTerminal ? " (terminal)" : ""}`);
      }
      console.log("");
    })
    .catch((error) => {
      console.error(error instanceof Error ? error.message : error);
      process.exitCode = 1;
    })
    .finally(() => prisma.$disconnect());
}
