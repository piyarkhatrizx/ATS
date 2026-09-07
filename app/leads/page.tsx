import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { LeadInbox } from "@/components/leads/lead-inbox";
import type { LeadRowData } from "@/components/leads/lead-row";
import { getActiveStatuses } from "@/lib/application-status";
import { APPLICATION_SOURCES, sourceLabel } from "@/lib/application-source";
import { getLeadCounts, getLeads, sinceLabel } from "@/lib/leads/query";
import { PAGE_SIZE, parseListParams, withParam, type ListSearchParams } from "@/lib/list-params";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Leads | Korosha",
  description: "Every lead, newest first. Speed to first contact.",
};

function FilterChip({
  href,
  active,
  label,
  count,
  marker,
}: {
  href: string;
  active: boolean;
  label: string;
  count?: number;
  marker?: boolean;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={`inline-flex h-7 items-center gap-[var(--space-2)] rounded-[4px] border px-[var(--space-3)] text-[length:var(--text-xs)] font-medium ${
        active
          ? "border-[var(--accent-line)] bg-[var(--surface-selected)] text-[var(--foreground)]"
          : "border-[var(--line)] bg-[var(--surface)] text-[var(--ink-muted)] hover:bg-[var(--surface-hover)] hover:text-[var(--foreground)]"
      }`}
    >
      {marker && <span className="inline-block h-1.5 w-1.5 rounded-full bg-[var(--accent)]" />}
      {label}
      {count !== undefined && <span className="k-tnum text-[var(--ink-faint)]">{count}</span>}
    </Link>
  );
}

export default async function LeadsPage({
  searchParams,
}: {
  searchParams: Promise<ListSearchParams>;
}) {
  const query = await searchParams;
  const params = parseListParams("leads", query);

  const [{ rows, matching }, counts, statuses, job] = await Promise.all([
    getLeads(params),
    getLeadCounts(params),
    getActiveStatuses(),
    params.job
      ? prisma.job.findUnique({ where: { id: params.job }, select: { title: true, reqCode: true } })
      : Promise.resolve(null),
  ]);

  const now = Date.now();
  const leads: LeadRowData[] = rows.map((row) => ({
    id: row.id,
    candidateId: row.candidateId,
    name:
      [row.candidate.firstName, row.candidate.lastName].filter(Boolean).join(" ") || "Unnamed lead",
    email: row.candidate.email,
    phone: row.candidate.phone,
    source: row.source,
    statusLabel: row.statusRef.label,
    statusColor: row.statusRef.color,
    appliedLabel: sinceLabel(row.appliedAt, now),
    appliedISO: row.appliedAt.toISOString(),
    otherApplications: Math.max(0, row.candidate._count.applications - 1),
    called: row._count.activities > 0,
    autoRejectedReason: row.autoRejectedReason,
  }));

  const statusOptions = statuses.map((status) => ({
    id: status.id,
    label: status.label,
    color: status.color,
    isTerminal: status.isTerminal,
  }));

  const base = "/leads";
  const link = (key: string, value: string | null) => `${base}${withParam(query, key, value)}`;

  return (
    <main className="min-h-screen">
      <div className="k-shell">
        <PageHeader
          eyebrow={job ? `${job.reqCode} · ${job.title}` : "Inbox"}
          title="Leads"
          subtitle={`${matching} lead${matching === 1 ? "" : "s"}, newest first`}
          actions={
            params.job ? (
              <Link
                href="/leads"
                className="text-[length:var(--text-xs)] font-medium text-[var(--ink-muted)] hover:text-[var(--foreground)]"
              >
                Clear requisition filter
              </Link>
            ) : undefined
          }
        />

        {/* Uncalled sits first and carries the accent dot: an uncalled lead is
            the whole point of the screen, so it is one click from anywhere. */}
        <nav aria-label="Filter leads" className="mt-[var(--space-5)] flex flex-wrap gap-[var(--space-2)]">
          <FilterChip
            href={link("uncalled", params.uncalled ? null : "1")}
            active={params.uncalled}
            label="Uncalled"
            count={counts.uncalled}
            marker
          />
          <span className="mx-[var(--space-1)] w-px self-stretch bg-[var(--line)]" aria-hidden="true" />
          <FilterChip href={link("source", null)} active={!params.source} label="All sources" count={counts.total} />
          {APPLICATION_SOURCES.map((source) => (
            <FilterChip
              key={source}
              href={link("source", source)}
              active={params.source === source}
              label={sourceLabel[source]}
              count={counts.bySource.get(source) ?? 0}
            />
          ))}
        </nav>

        <div className="mt-[var(--space-3)] flex flex-wrap gap-[var(--space-2)]">
          <FilterChip href={link("status", null)} active={!params.status} label="Any stage" />
          {statuses.map((status) => (
            <FilterChip
              key={status.id}
              href={link("status", status.key)}
              active={params.status === status.key}
              label={status.label}
            />
          ))}
        </div>

        <div className="mt-[var(--space-4)]">
          <LeadInbox
            leads={leads}
            statuses={statusOptions}
            emptyHint={
              params.uncalled
                ? "Every lead in this view has been called."
                : "Leads appear here the moment an application arrives."
            }
          />
        </div>

        {matching > PAGE_SIZE && (
          <nav
            aria-label="Pagination"
            className="mt-[var(--space-4)] flex items-center justify-between border-t border-[var(--line)] pt-[var(--space-3)] text-[length:var(--text-sm)]"
          >
            <span className="k-tnum text-[var(--ink-muted)]">
              {params.skip + 1}–{Math.min(params.skip + PAGE_SIZE, matching)} of {matching}
            </span>
            <span className="flex gap-[var(--space-4)]">
              {params.page > 1 && (
                <Link className="font-medium text-[var(--foreground)]" href={link("page", String(params.page - 1))}>
                  ← Previous
                </Link>
              )}
              {params.skip + PAGE_SIZE < matching && (
                <Link className="font-medium text-[var(--foreground)]" href={link("page", String(params.page + 1))}>
                  Next →
                </Link>
              )}
            </span>
          </nav>
        )}
      </div>
    </main>
  );
}
