import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";

export const dynamic = "force-dynamic";

const statusLabel: Record<string, string> = {
  NEW: "New",
  SCREENING: "Screening",
  PHONE_SCREEN: "Phone screen",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

const statusTone = {
  NEW: "new",
  SCREENING: "screening",
  PHONE_SCREEN: "phone",
  INTERVIEW: "interview",
  OFFER: "offer",
  HIRED: "hired",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
} as const;

export default async function JobApplicationsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const job = await prisma.job.findUnique({
    where: { id },
    include: {
      applications: {
        orderBy: { appliedAt: "desc" },
        include: { candidate: true, documents: { select: { parseStatus: true } } },
      },
    },
  });
  if (!job) notFound();

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-deep)]">← all requisitions</Link>
        <header className="mt-10 flex flex-col justify-between gap-4 border-b border-[var(--line)] pb-8 sm:flex-row sm:items-end">
          <div><p className="font-mono text-xs text-[var(--accent-deep)]">{job.reqCode} / {job.ingestAlias}</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">{job.title}</h1></div>
          <p className="text-sm text-[var(--ink-muted)]">{job.applications.length} applications · newest first</p>
        </header>
        <div className="mt-8">
          <Table className="min-w-[720px]">
            <TableHeader><tr><TableCell header>Candidate</TableCell><TableCell header>Current role</TableCell><TableCell header>Applied</TableCell><TableCell header>Status</TableCell><TableCell header>Parse</TableCell></tr></TableHeader>
            <TableBody>{job.applications.map((application) => {
              const candidateName = [application.candidate.firstName, application.candidate.lastName].filter(Boolean).join(" ") || "Unnamed candidate";
              const parseStatus = application.documents[0]?.parseStatus ?? "PENDING";
              return <TableRow key={application.id}>
                <TableCell><Link className="font-medium hover:text-[var(--accent-deep)]" href={`/candidates/${application.candidateId}`}>{candidateName}</Link><div className="mt-1 text-xs text-[var(--ink-muted)]">{application.candidate.email ?? "No email"}</div></TableCell>
                <TableCell><span className="text-[var(--ink-muted)]">{application.candidate.currentTitle ?? "—"}</span></TableCell>
                <TableCell><span className="text-[var(--ink-muted)]">{application.appliedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></TableCell>
                <TableCell><Badge tone={statusTone[application.status]}>{statusLabel[application.status] ?? application.status}</Badge></TableCell>
                <TableCell><span className="text-xs text-[var(--ink-muted)]">{parseStatus.toLowerCase()}</span></TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>
          {!job.applications.length && <p className="p-8 text-sm text-[var(--ink-muted)]">No applications have arrived for this requisition.</p>}
        </div>
      </div>
    </main>
  );
}