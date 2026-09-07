import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
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
        <PageHeader
          eyebrow="Care team intake"
          title="Caregiver applications"
          subtitle={`${applications.length} received`}
          actions={
            <Button asChild>
              <Link href="/apply">Open application</Link>
            </Button>
          }
        />

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
          {!applications.length && (
            <EmptyState
              className="border-t-0"
              title="No caregiver applications yet"
              description="Submissions from the public application page land here the moment they are received."
              action={{ label: "Open application form", href: "/apply" }}
            />
          )}
        </div>
      </div>
    </main>
  );
}