import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { PageHeader } from "@/components/ui/page-header";
import { SectionLabel } from "@/components/ui/section-label";
import { KEmptyState } from "@/components/korosha/empty-state";
import { GlassCard } from "@/components/korosha/glass-card";
import { APPLICATION_SOURCES, sourceLabel } from "@/lib/application-source";

export const dynamic = "force-dynamic";

export default async function Home() {
  const [jobs, forwarding, unroutedCount, sourceCounts] = await Promise.all([
    prisma.job.findMany({
      orderBy: { createdAt: "desc" },
      include: { _count: { select: { applications: true } } },
    }).catch(() => []),
    prisma.forwardingVerification.findMany({ orderBy: { createdAt: "desc" }, take: 3 }).catch(() => []),
    prisma.unroutedEmail.count().catch(() => 0),
    prisma.application.groupBy({ by: ["jobId", "source"], _count: { _all: true } }).catch(() => []),
  ]);

  const countsByJob = new Map<string, Map<string, number>>();
  for (const row of sourceCounts) {
    // jobId is nullable now: leads can exist without a requisition, and those
    // belong to no card on this page.
    if (!row.jobId) continue;
    const forJob = countsByJob.get(row.jobId) ?? new Map<string, number>();
    forJob.set(row.source, row._count._all);
    countsByJob.set(row.jobId, forJob);
  }

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <PageHeader
          title="Open requisitions"
          subtitle={`${jobs.length} active tracks · ${unroutedCount} unrouted`}
          actions={
            <Button asChild variant="secondary">
              <Link href="/applications">Caregiver applications</Link>
            </Button>
          }
        />
        {forwarding.length > 0 && <section className="mt-6 border border-[var(--accent-tint-line)] bg-[var(--accent-tint)] p-5"><SectionLabel>Gmail forwarding verification</SectionLabel><div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-2">{forwarding.map((verification) => <div key={verification.id}><span className="font-mono text-xl tracking-[0.14em]">{verification.code}</span><span className="ml-3 text-xs text-[var(--ink-muted)]">{verification.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>)}</div></section>}
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="group block border border-[var(--glass-border)] k-glass p-5 transition-colors hover:border-[var(--accent)]">
              <div className="flex items-start justify-between gap-5">
                <span className="font-mono text-xs text-[var(--accent-deep)]">{job.reqCode}</span>
                <Badge tone={job.status === "OPEN" ? "success" : "neutral"}>{job.status.toLowerCase()}</Badge>
              </div>
              <h2 className="mt-12 text-xl font-medium tracking-[-0.02em] group-hover:text-[var(--accent-deep)]">{job.title}</h2>
              <p className="mt-2 text-sm text-[var(--ink-muted)]">{job._count.applications} applications</p>
              <dl className="mt-4 flex flex-wrap gap-x-5 gap-y-1 border-t border-[var(--line)] pt-3">
                {APPLICATION_SOURCES.map((source) => {
                  const count = countsByJob.get(job.id)?.get(source) ?? 0;
                  return (
                    <div key={source} className="flex items-baseline gap-1.5">
                      <dt className="text-[var(--text-xs)] uppercase tracking-[0.12em] text-[var(--ink-muted)]">{sourceLabel[source]}</dt>
                      <dd className={`font-mono text-sm ${count ? "text-[var(--foreground)]" : "text-[var(--ink-muted)]"}`}>{count}</dd>
                    </div>
                  );
                })}
              </dl>
            </Link>
          ))}
          {!jobs.length && <div className="col-span-full"><KEmptyState title="No open requisitions" description="Add a job record to begin receiving leads into the desk." /></div>}
        </section>
      </div>
    </main>
  );
}
