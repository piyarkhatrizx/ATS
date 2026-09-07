import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { KEmptyState } from "@/components/korosha/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { Table, TableBody, TableCell, TableHeader, TableRow } from "@/components/ui/table";
import { PAGE_SIZE, parseListParams, withParam, type ListSearchParams } from "@/lib/list-params";

export const dynamic = "force-dynamic";

export default async function CandidatesPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const query = await searchParams;
  const { source, status, orderBy, skip, take, page } = parseListParams("candidates", query);

  // Filtering candidates by a source or stage means "has an application that
  // matches" — the filter belongs to Application, so it applies as a relation.
  const applicationFilter = {
    ...(source ? { source } : {}),
    ...(status ? { status } : {}),
  };
  const where = Object.keys(applicationFilter).length
    ? { applications: { some: applicationFilter } }
    : {};

  const [candidates, matching] = await Promise.all([
    prisma.candidate
      .findMany({
        where,
        orderBy,
        skip,
        take,
        include: { _count: { select: { applications: true } } },
      })
      .catch(() => []),
    prisma.candidate.count({ where }).catch(() => 0),
  ]);

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <PageHeader
        title="Candidates"
        subtitle={`${matching} record${matching === 1 ? "" : "s"}`}
      />
      <div className="mt-4">
        {candidates.length ? (
          // min-w so the table scrolls rather than compresses, matching
          // /jobs/[id] and /applications: emails and role titles run long, and
          // a squeezed column wraps unpredictably instead of staying scannable.
          <Table className="min-w-[720px]">
            <TableHeader>
              <tr>
                <TableCell header>Name</TableCell>
                <TableCell header>Email</TableCell>
                <TableCell header>Current role</TableCell>
                <TableCell header>Applications</TableCell>
              </tr>
            </TableHeader>
            <TableBody>
              {candidates.map((candidate) => (
                <TableRow key={candidate.id}>
                  <TableCell>
                    <Link
                      href={`/candidates/${candidate.id}`}
                      className="font-medium hover:text-[var(--accent-deep)]"
                    >
                      {[candidate.firstName, candidate.lastName].filter(Boolean).join(" ") ||
                        "Unnamed candidate"}
                    </Link>
                  </TableCell>
                  <TableCell>{candidate.email ?? "—"}</TableCell>
                  <TableCell>
                    <span className="text-[var(--ink-muted)]">{candidate.currentTitle ?? "—"}</span>
                  </TableCell>
                  <TableCell>{candidate._count.applications}</TableCell>
                </TableRow>
              ))}
            </TableBody>
          </Table>
        ) : (
          <KEmptyState
            title="No candidates yet"
            description="Candidates appear here once a resume is forwarded to an intake alias or an application is submitted."
          />
        )}
        {matching > PAGE_SIZE && (
          <nav aria-label="Pagination" className="mt-6 flex items-center justify-between border-t border-[var(--line)] pt-4 text-sm">
            <span className="text-[var(--ink-muted)]">
              {skip + 1}–{Math.min(skip + PAGE_SIZE, matching)} of {matching}
            </span>
            <span className="flex gap-4">
              {page > 1 && <Link className="font-semibold text-[var(--accent-deep)]" href={`/candidates${withParam(query, "page", String(page - 1))}`}>← Previous</Link>}
              {skip + PAGE_SIZE < matching && <Link className="font-semibold text-[var(--accent-deep)]" href={`/candidates${withParam(query, "page", String(page + 1))}`}>Next →</Link>}
            </span>
          </nav>
        )}
      </div>
    </main>
  );
}
