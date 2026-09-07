import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

function answer(value: boolean | null) {
  if (value === null) return "Not answered";
  return value ? "Yes" : "No";
}

function interestLabel(value: string) {
  return value === "CURRENTLY_CARING_FOR_PATIENT"
    ? "Currently caring for a patient"
    : "General caregiver position";
}

function answerTone(value: boolean | null) {
  if (value === null) return "neutral" as const;
  return value ? "success" as const : "rejected" as const;
}

export default async function CaregiverApplicationsPage() {
  const applications = await prisma.caregiverApplication.findMany({
    orderBy: { createdAt: "desc" },
  });

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-7xl">
        <header className="flex flex-col justify-between gap-6 border-b border-[var(--line)] pb-8 sm:flex-row sm:items-end">
          <div>
            <Link href="/" className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-deep)]">← recruiting desk</Link>
            <p className="mt-8 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-deep)]">Care team intake</p>
            <h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Caregiver applications</h1>
          </div>
          <div className="flex items-center gap-4">
            <span className="text-sm text-[var(--ink-muted)]">{applications.length} received</span>
            <Link href="/apply" className="ui-button inline-flex h-10 items-center justify-center border border-transparent bg-[var(--accent-deep)] px-4 text-xs font-semibold uppercase tracking-[0.12em] text-[var(--on-accent)] hover:bg-[var(--accent-strong)]">Open application</Link>
          </div>
        </header>

        <div className="mt-8">
          <Table className="min-w-[1050px]">
            <TableHeader>
              <tr>
                <TableCell header>Applicant</TableCell>
                <TableCell header>Contact</TableCell>
                <TableCell header>18 or older</TableCell>
                <TableCell header>CPA certified</TableCell>
                <TableCell header>Medicare</TableCell>
                <TableCell header>Opportunity</TableCell>
                <TableCell header>Submitted</TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {applications.map((application) => (
                <TableRow key={application.id}>
                  <TableCell><span className="font-medium">{application.firstName} {application.lastName}</span></TableCell>
                  <TableCell><div>{application.email}</div><div className="mt-1 text-xs text-[var(--ink-muted)]">{application.phone}</div></TableCell>
                  <TableCell><Badge tone={answerTone(application.isAtLeast18)}>{answer(application.isAtLeast18)}</Badge></TableCell>
                  <TableCell><Badge tone={answerTone(application.isCpaCertified)}>{answer(application.isCpaCertified)}</Badge></TableCell>
                  <TableCell><Badge tone={answerTone(application.patientUsesMedicare)}>{answer(application.patientUsesMedicare)}</Badge></TableCell>
                  <TableCell>{interestLabel(application.caregivingInterest)}</TableCell>
                  <TableCell><span className="text-[var(--ink-muted)]">{application.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
          {!applications.length && <p className="p-10 text-sm text-[var(--ink-muted)]">No caregiver applications have been submitted yet.</p>}
        </div>
      </div>
    </main>
  );
}