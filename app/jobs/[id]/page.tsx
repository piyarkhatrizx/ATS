import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { APPLICATION_SOURCES, parseSourceParam, sourceLabel, sourceTone } from "@/lib/application-source";
import { statusLabel, statusTone } from "@/lib/application-status";

export const dynamic = "force-dynamic";

export default async function JobApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ source?: string | string[] }>;
}) {
  const { id } = await params;
  const source = parseSourceParam((await searchParams).source);

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) notFound();

  const [applications, sourceCounts] = await Promise.all([
    prisma.application.findMany({
      where: { jobId: id, ...(source ? { source } : {}) },
      orderBy: { appliedAt: "desc" },
      include: { candidate: true, documents: { select: { parseStatus: true } } },
    }),
    prisma.application.groupBy({
      by: ["source"],
      where: { jobId: id },
      _count: { _all: true },
    }),
  ]);

  const countBySource = new Map(sourceCounts.map((row) => [row.source, row._count._all]));
  const total = sourceCounts.reduce((sum, row) => sum + row._count._all, 0);
  const filters = [
    { key: null, label: "All", count: total },
    ...APPLICATION_SOURCES.map((value) => ({
      key: value,
      label: sourceLabel[value],
      count: countBySource.get(value) ?? 0,
    })),
  ];

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <Link href="/" className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-deep)]">← all requisitions</Link>
        <header className="mt-10 flex flex-col justify-between gap-4 border-b border-[var(--line)] pb-8 sm:flex-row sm:items-end">
          <div><p className="font-mono text-xs text-[var(--accent-deep)]">{job.reqCode} / {job.ingestAlias}</p><h1 className="mt-3 text-4xl font-semibold tracking-[-0.04em]">{job.title}</h1></div>
          <p className="text-sm text-[var(--ink-muted)]">{total} applications · newest first</p>
        </header>

        <nav aria-label="Filter by source" className="mt-8 flex flex-wrap gap-2">
          {filters.map((filter) => {
            const active = filter.key === source;
            return (
              <Link
                key={filter.label}
                href={filter.key ? `/jobs/${job.id}?source=${filter.key}` : `/jobs/${job.id}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-8 items-center gap-2 border px-3 text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
                  active
                    ? "border-[var(--accent)] bg-[var(--accent-deep)] text-[var(--on-accent)]"
                    : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)] hover:border-[var(--accent)]"
                }`}
              >
                {filter.label}
                <span className={active ? "text-[var(--on-accent)]/70" : "text-[var(--ink-muted)]"}>{filter.count}</span>
              </Link>
            );
          })}
        </nav>

        <div className="mt-6">
          <Table className="min-w-[820px]">
            <TableHeader><tr><TableCell header>Candidate</TableCell><TableCell header>Current role</TableCell><TableCell header>Source</TableCell><TableCell header>Applied</TableCell><TableCell header>Status</TableCell><TableCell header>Parse</TableCell></tr></TableHeader>
            <TableBody>{applications.map((application) => {
              const candidateName = [application.candidate.firstName, application.candidate.lastName].filter(Boolean).join(" ") || "Unnamed candidate";
              const parseStatus = application.documents[0]?.parseStatus ?? "PENDING";
              return <TableRow key={application.id}>
                <TableCell><Link className="font-medium hover:text-[var(--accent-deep)]" href={`/candidates/${application.candidateId}`}>{candidateName}</Link><div className="mt-1 text-xs text-[var(--ink-muted)]">{application.candidate.email ?? "No email"}</div></TableCell>
                <TableCell><span className="text-[var(--ink-muted)]">{application.candidate.currentTitle ?? "—"}</span></TableCell>
                <TableCell><Badge tone={sourceTone[application.source]}>{sourceLabel[application.source]}</Badge></TableCell>
                <TableCell><span className="text-[var(--ink-muted)]">{application.appliedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></TableCell>
                <TableCell><Badge tone={statusTone[application.status]}>{statusLabel[application.status] ?? application.status}</Badge></TableCell>
                <TableCell><span className="text-xs text-[var(--ink-muted)]">{parseStatus.toLowerCase()}</span></TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>
          {!applications.length && <p className="p-8 text-sm text-[var(--ink-muted)]">{source ? `No applications from ${sourceLabel[source].toLowerCase()} for this requisition.` : "No applications have arrived for this requisition."}</p>}
        </div>
      </div>
    </main>
  );
}
