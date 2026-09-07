import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { APPLICATION_SOURCES, sourceLabel, sourceTone } from "@/lib/application-source";
import { ApplicationStatusCell } from "@/components/application-status-cell";
import { getActiveStatuses } from "@/lib/application-status";
import { PAGE_SIZE, parseListParams, withParam, type ListSearchParams } from "@/lib/list-params";

export const dynamic = "force-dynamic";

export default async function JobApplicationsPage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<ListSearchParams>;
}) {
  const { id } = await params;
  const query = await searchParams;
  const { source, status, orderBy, skip, take, page } = parseListParams("applications", query);

  const job = await prisma.job.findUnique({ where: { id } });
  if (!job) notFound();

  const statusOptions = (await getActiveStatuses()).map((s) => ({
    id: s.id, label: s.label, color: s.color, isTerminal: s.isTerminal,
  }));

  const where = { jobId: id, ...(source ? { source } : {}), ...(status ? { statusRef: { key: status } } : {}) };
  const [applications, sourceCounts, matching] = await Promise.all([
    prisma.application.findMany({
      where,
      orderBy,
      skip,
      take,
      include: { candidate: true, statusRef: true, documents: { select: { parseStatus: true } } },
    }),
    prisma.application.groupBy({
      by: ["source"],
      where: { jobId: id },
      _count: { _all: true },
    }),
    prisma.application.count({ where }),
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
    <main className="min-h-screen">
      <div className="k-shell">
        <PageHeader
          breadcrumb={[{ label: "Jobs", href: "/" }, { label: job.title }]}
          eyebrow={`${job.reqCode} / ${job.ingestAlias}`}
          title={job.title}
          subtitle={`${total} applications · newest first`}
        />

        <nav aria-label="Filter by source" className="mt-[var(--space-8)] flex flex-wrap gap-[var(--space-2)]">
          {filters.map((filter) => {
            const active = filter.key === source;
            return (
              <Link
                key={filter.label}
                href={`/jobs/${job.id}${withParam(query, "source", filter.key)}`}
                aria-current={active ? "page" : undefined}
                className={`inline-flex min-h-8 items-center gap-[var(--space-2)] border px-[var(--space-3)] text-xs font-semibold uppercase tracking-[0.12em] transition-colors ${
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

        <div className="mt-[var(--space-6)]">
          <Table className="min-w-[820px]">
            <TableHeader><tr><TableCell header>Candidate</TableCell><TableCell header>Current role</TableCell><TableCell header>Source</TableCell><TableCell header>Applied</TableCell><TableCell header>Status</TableCell><TableCell header>Parse</TableCell></tr></TableHeader>
            <TableBody>{applications.map((application) => {
              const candidateName = [application.candidate.firstName, application.candidate.lastName].filter(Boolean).join(" ") || "Unnamed candidate";
              const parseStatus = application.documents[0]?.parseStatus ?? "PENDING";
              return <TableRow key={application.id}>
                <TableCell><Link className="font-medium hover:text-[var(--foreground)]" href={`/candidates/${application.candidateId}`}>{candidateName}</Link><div className="mt-[var(--space-1)] text-xs text-[var(--ink-muted)]">{application.candidate.email ?? "No email"}</div></TableCell>
                <TableCell><span className="text-[var(--ink-muted)]">{application.candidate.currentTitle ?? "—"}</span></TableCell>
                <TableCell><Badge tone={sourceTone[application.source]}>{sourceLabel[application.source]}</Badge></TableCell>
                <TableCell><span className="text-[var(--ink-muted)]">{application.appliedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</span></TableCell>
                <TableCell><ApplicationStatusCell applicationId={application.id} statusId={application.statusId} statuses={statusOptions} /></TableCell>
                <TableCell><span className="text-xs text-[var(--ink-muted)]">{parseStatus.toLowerCase()}</span></TableCell>
              </TableRow>;
            })}</TableBody>
          </Table>
          {!applications.length && <p className="p-[var(--space-8)] text-sm text-[var(--ink-muted)]">{source ? `No applications from ${sourceLabel[source].toLowerCase()} for this requisition.` : "No applications have arrived for this requisition."}</p>}
          {matching > PAGE_SIZE && (
            <nav aria-label="Pagination" className="mt-[var(--space-6)] flex items-center justify-between border-t border-[var(--line)] pt-[var(--space-4)] text-sm">
              <span className="text-[var(--ink-muted)]">
                {skip + 1}–{Math.min(skip + PAGE_SIZE, matching)} of {matching}
              </span>
              <span className="flex gap-[var(--space-4)]">
                {page > 1 && <Link className="font-semibold text-[var(--foreground)]" href={`/jobs/${job.id}${withParam(query, "page", String(page - 1))}`}>← Previous</Link>}
                {skip + PAGE_SIZE < matching && <Link className="font-semibold text-[var(--foreground)]" href={`/jobs/${job.id}${withParam(query, "page", String(page + 1))}`}>Next →</Link>}
              </span>
            </nav>
          )}
        </div>
      </div>
    </main>
  );
}
