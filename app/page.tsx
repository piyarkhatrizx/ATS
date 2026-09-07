import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
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
    const forJob = countsByJob.get(row.jobId) ?? new Map<string, number>();
    forJob.set(row.source, row._count._all);
    countsByJob.set(row.jobId, forJob);
  }

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-6xl">
        <header className="ui-material flex items-end justify-between border-b border-[var(--line)] pb-8">
          <div>
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--accent-deep)]">Northstar / recruiting desk</p>
            <h1 className="text-4xl font-semibold tracking-[-0.04em] sm:text-5xl">Open requisitions</h1>
          </div>
          <div className="flex items-center gap-4">
            <Link href="/applications" className="text-xs font-semibold uppercase tracking-[0.12em] text-[var(--accent-deep)] hover:underline">Caregiver applications</Link>
            <span className="hidden text-sm text-[var(--ink-muted)] sm:block">{jobs.length} active tracks · {unroutedCount} unrouted</span>
          </div>
        </header>
        {forwarding.length > 0 && <section className="mt-6 border border-[var(--accent-tint-line)] bg-[var(--accent-tint)] p-5"><p className="text-xs font-semibold uppercase tracking-[0.16em] text-[var(--accent-deep)]">Gmail forwarding verification</p><div className="mt-3 flex flex-wrap items-center gap-x-8 gap-y-2">{forwarding.map((verification) => <div key={verification.id}><span className="font-mono text-xl tracking-[0.14em]">{verification.code}</span><span className="ml-3 text-xs text-[var(--ink-muted)]">{verification.createdAt.toLocaleDateString("en-US", { month: "short", day: "numeric" })}</span></div>)}</div></section>}
        <section className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {jobs.map((job) => (
            <Link key={job.id} href={`/jobs/${job.id}`} className="group border border-[var(--line)] bg-[var(--surface)] p-6 transition-colors hover:border-[var(--accent)]">
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
          {!jobs.length && <div className="col-span-full"><EmptyState title="No open requisitions" description="Add a job record to begin receiving resumes into the recruiting desk." /></div>}
        </section>
      </div>
    </main>
  );
}
