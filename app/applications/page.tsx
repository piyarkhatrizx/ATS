import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { KEmptyState } from "@/components/korosha/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { StatusPill } from "@/components/korosha/status-pill";
import { PAGE_SIZE, parseListParams, withParam, type ListSearchParams } from "@/lib/list-params";

export const dynamic = "force-dynamic";

/**
 * Apply-form submissions, read from Application rather than a side table.
 * The four questions live in Application.screening, written by lib/intake.ts.
 */
type Screening = {
  isAtLeast18?: boolean | null;
  isCpaCertified?: boolean | null;
  patientUsesMedicare?: boolean | null;
  caregivingInterest?: string | null;
};

function answer(value: boolean | null | undefined) {
  if (value === null || value === undefined) return "Not answered";
  return value ? "Yes" : "No";
}

function answerTone(value: boolean | null | undefined) {
  if (value === null || value === undefined) return "neutral" as const;
  return value ? ("success" as const) : ("rejected" as const);
}

function interestLabel(value: string | null | undefined) {
  if (!value) return "—";
  return value === "CURRENTLY_CARING_FOR_PATIENT"
    ? "Currently caring for a patient"
    : "General caregiver position";
}

export default async function CaregiverApplicationsPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const query = await searchParams;
  const { status, orderBy, skip, take, page } = parseListParams("applications", query);

  // This view is the apply-form funnel by definition, so source is fixed here
  // rather than read from the URL.
  const where = { source: "APPLY_FORM" as const, ...(status ? { statusRef: { key: status } } : {}) };
  const [applications, matching] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy,
      skip,
      take,
      include: { candidate: true, job: { select: { title: true } }, statusRef: true },
    }),
    prisma.application.count({ where }),
  ]);

  return (
    <main className="min-h-screen">
      <div className="k-shell">
        <PageHeader
          eyebrow="Care team intake"
          title="Caregiver applications"
          subtitle={`${matching} received`}
          actions={
            <Button asChild>
              <Link href="/apply">Open application</Link>
            </Button>
          }
        />

        <div className="mt-[var(--space-8)]">
          <Table className="min-w-[1050px]">
            <TableHeader>
              <tr>
                <TableCell header>Applicant</TableCell>
                <TableCell header>Contact</TableCell>
                <TableCell header>Stage</TableCell>
                <TableCell header>18 or older</TableCell>
                <TableCell header>CPA certified</TableCell>
                <TableCell header>Medicare</TableCell>
                <TableCell header>Opportunity</TableCell>
                <TableCell header>Submitted</TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {applications.map((application) => {
                const screening = (application.screening ?? {}) as Screening;
                const name =
                  [application.candidate.firstName, application.candidate.lastName]
                    .filter(Boolean)
                    .join(" ") || "Unnamed candidate";
                return (
                  <TableRow key={application.id}>
                    <TableCell>
                      <Link
                        href={`/candidates/${application.candidateId}`}
                        className="font-medium hover:text-[var(--foreground)]"
                      >
                        {name}
                      </Link>
                    </TableCell>
                    <TableCell>
                      <div>{application.candidate.email ?? "—"}</div>
                      <div className="mt-[var(--space-1)] text-xs text-[var(--ink-muted)]">{application.candidate.phone ?? "—"}</div>
                    </TableCell>
                    <TableCell><StatusPill color={application.statusRef.color} label={application.statusRef.label} /></TableCell>
                    <TableCell><Badge tone={answerTone(screening.isAtLeast18)}>{answer(screening.isAtLeast18)}</Badge></TableCell>
                    <TableCell><Badge tone={answerTone(screening.isCpaCertified)}>{answer(screening.isCpaCertified)}</Badge></TableCell>
                    <TableCell><Badge tone={answerTone(screening.patientUsesMedicare)}>{answer(screening.patientUsesMedicare)}</Badge></TableCell>
                    <TableCell>{interestLabel(screening.caregivingInterest)}</TableCell>
                    <TableCell><span className="text-[var(--ink-muted)]">{application.appliedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
          {!applications.length && (
            <KEmptyState
              className="border-t-0"
              title="No caregiver applications yet"
              description="Submissions from the public application page land here the moment they are received."
              action={{ label: "Open application form", href: "/apply" }}
            />
          )}
          {matching > PAGE_SIZE && (
            <nav aria-label="Pagination" className="mt-[var(--space-6)] flex items-center justify-between border-t border-[var(--line)] pt-[var(--space-4)] text-sm">
              <span className="text-[var(--ink-muted)]">
                {skip + 1}–{Math.min(skip + PAGE_SIZE, matching)} of {matching}
              </span>
              <span className="flex gap-[var(--space-4)]">
                {page > 1 && <Link className="font-semibold text-[var(--foreground)]" href={`/applications${withParam(query, "page", String(page - 1))}`}>← Previous</Link>}
                {skip + PAGE_SIZE < matching && <Link className="font-semibold text-[var(--foreground)]" href={`/applications${withParam(query, "page", String(page + 1))}`}>Next →</Link>}
              </span>
            </nav>
          )}
        </div>
      </div>
    </main>
  );
}
