import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionLabel } from "@/components/ui/section-label";
import { ApplicationStatusCell } from "@/components/application-status-cell";
import { ActivityTimeline } from "@/components/activity-timeline";
import { CallButton } from "@/components/call-button";
import { NoteComposer } from "@/components/note-composer";
import { getCandidateTimeline } from "@/lib/activity/timeline";
import { getActiveStatuses } from "@/lib/application-status";

export const dynamic = "force-dynamic";

export default async function CandidatePage({
  params,
  searchParams,
}: {
  params: Promise<{ id: string }>;
  searchParams: Promise<{ cursor?: string | string[] }>;
}) {
  const { id } = await params;
  const rawCursor = (await searchParams).cursor;
  const cursor = Array.isArray(rawCursor) ? rawCursor[0] : rawCursor;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: { documents: { orderBy: { parsedAt: "desc" } }, applications: { include: { job: true } } },
  });
  if (!candidate) notFound();
  const name = [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || "Unnamed candidate";
  const timeline = await getCandidateTimeline(candidate.id, { cursor });
  const statusOptions = (await getActiveStatuses()).map((s) => ({
    id: s.id, label: s.label, color: s.color, isTerminal: s.isTerminal,
  }));

  return <main className="min-h-screen"><div className="k-shell">
    <PageHeader
      breadcrumb={[{ label: "Candidates", href: "/candidates" }, { label: name }]}
      eyebrow="Candidate record"
      title={name}
      subtitle={`${candidate.currentTitle ?? "Role not listed"}${candidate.currentEmployer ? ` · ${candidate.currentEmployer}` : ""}`}
      actions={<CallButton candidateId={candidate.id} phone={candidate.phone} applicationId={candidate.applications[0]?.id ?? null} />}
    />
    <div className="mt-[var(--space-8)] grid gap-[var(--space-8)] lg:grid-cols-[0.8fr_1.2fr]">
      <section className="k-glass border border-[var(--line)] p-[var(--space-6)]"><SectionLabel as="h2">Parsed fields</SectionLabel><dl className="mt-[var(--space-6)] space-y-[var(--space-4)] text-sm"><div><dt className="text-[var(--ink-muted)]">Email</dt><dd className="mt-[var(--space-1)]">{candidate.email ?? "—"}</dd></div><div><dt className="text-[var(--ink-muted)]">Phone</dt><dd className="mt-[var(--space-1)]">{candidate.phone ?? "—"}</dd></div><div><dt className="text-[var(--ink-muted)]">Location</dt><dd className="mt-[var(--space-1)]">{candidate.location ?? "—"}</dd></div><div><dt className="text-[var(--ink-muted)]">LinkedIn</dt><dd className="mt-[var(--space-1)] break-all">{candidate.linkedinUrl ?? "—"}</dd></div></dl><SectionLabel as="h2" className="mt-[var(--space-10)]">Applications</SectionLabel><ul className="mt-[var(--space-4)] space-y-[var(--space-3)] text-sm">{candidate.applications.map((application) => <li key={application.id} className="flex items-center justify-between gap-[var(--space-3)] border-b border-[var(--line)] pb-[var(--space-3)]"><span>{application.job?.title ?? "No requisition"}</span><ApplicationStatusCell applicationId={application.id} statusId={application.statusId} statuses={statusOptions} align="end" /></li>)}</ul></section>
      <section><SectionLabel as="h2">Original documents and extraction</SectionLabel><div className="mt-[var(--space-4)] space-y-[var(--space-5)]">{candidate.documents.map((document) => <article key={document.id} className="k-glass border border-[var(--line)] p-[var(--space-6)]"><div className="flex justify-between gap-[var(--space-4)]"><h3 className="font-medium">{document.filename}</h3><Badge tone={document.parseStatus === "COMPLETE" ? "success" : document.parseStatus === "FAILED" ? "rejected" : "warning"}>{document.parseStatus.toLowerCase()}</Badge></div>{document.parsedData && <pre className="mt-[var(--space-5)] max-h-80 overflow-auto border-t border-[var(--line)] pt-[var(--space-5)] text-xs leading-6 text-[var(--ink-muted)]">{JSON.stringify(document.parsedData, null, 2)}</pre>}{document.extractedText && <details className="mt-[var(--space-5)] border-t border-[var(--line)] pt-[var(--space-5)]"><summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em]">Extracted text</summary><pre className="mt-[var(--space-4)] max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-6 text-[var(--ink-muted)]">{document.extractedText}</pre></details>}</article>)}{!candidate.documents.length && <EmptyState title="No documents attached" description="Original resumes will appear here after an inbound application is processed." />}</div></section>
    </div>

    <section className="mt-[var(--space-10)]">
      <SectionLabel as="h2">Activity</SectionLabel>
      <div className="mt-[var(--space-4)] max-w-3xl space-y-[var(--space-5)]">
        <NoteComposer candidateId={candidate.id} />
        <ActivityTimeline pinned={timeline.pinned} entries={timeline.entries} />
        {timeline.nextCursor && (
          <a
            href={`/candidates/${candidate.id}?cursor=${encodeURIComponent(timeline.nextCursor)}`}
            className="inline-block text-[var(--text-sm)] font-semibold text-[var(--foreground)] hover:underline"
          >
            Older activity →
          </a>
        )}
      </div>
    </section>
  </div></main>;
}