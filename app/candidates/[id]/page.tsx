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

  return <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16"><div className="mx-auto max-w-6xl">
    <PageHeader
      breadcrumb={[{ label: "Candidates", href: "/candidates" }, { label: name }]}
      eyebrow="Candidate record"
      title={name}
      subtitle={`${candidate.currentTitle ?? "Role not listed"}${candidate.currentEmployer ? ` · ${candidate.currentEmployer}` : ""}`}
      actions={<CallButton candidateId={candidate.id} phone={candidate.phone} applicationId={candidate.applications[0]?.id ?? null} />}
    />
    <div className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="ui-material border border-[var(--line)] p-6"><SectionLabel as="h2">Parsed fields</SectionLabel><dl className="mt-6 space-y-4 text-sm"><div><dt className="text-[var(--ink-muted)]">Email</dt><dd className="mt-1">{candidate.email ?? "—"}</dd></div><div><dt className="text-[var(--ink-muted)]">Phone</dt><dd className="mt-1">{candidate.phone ?? "—"}</dd></div><div><dt className="text-[var(--ink-muted)]">Location</dt><dd className="mt-1">{candidate.location ?? "—"}</dd></div><div><dt className="text-[var(--ink-muted)]">LinkedIn</dt><dd className="mt-1 break-all">{candidate.linkedinUrl ?? "—"}</dd></div></dl><SectionLabel as="h2" className="mt-10">Applications</SectionLabel><ul className="mt-4 space-y-3 text-sm">{candidate.applications.map((application) => <li key={application.id} className="flex items-center justify-between gap-3 border-b border-[var(--line)] pb-3"><span>{application.job?.title ?? "No requisition"}</span><ApplicationStatusCell applicationId={application.id} statusId={application.statusId} statuses={statusOptions} align="end" /></li>)}</ul></section>
      <section><SectionLabel as="h2">Original documents and extraction</SectionLabel><div className="mt-4 space-y-5">{candidate.documents.map((document) => <article key={document.id} className="ui-material border border-[var(--line)] p-6"><div className="flex justify-between gap-4"><h3 className="font-medium">{document.filename}</h3><Badge tone={document.parseStatus === "COMPLETE" ? "success" : document.parseStatus === "FAILED" ? "rejected" : "warning"}>{document.parseStatus.toLowerCase()}</Badge></div>{document.parsedData && <pre className="mt-5 max-h-80 overflow-auto border-t border-[var(--line)] pt-5 text-xs leading-6 text-[var(--ink-muted)]">{JSON.stringify(document.parsedData, null, 2)}</pre>}{document.extractedText && <details className="mt-5 border-t border-[var(--line)] pt-5"><summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em]">Extracted text</summary><pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-6 text-[var(--ink-muted)]">{document.extractedText}</pre></details>}</article>)}{!candidate.documents.length && <EmptyState title="No documents attached" description="Original resumes will appear here after an inbound application is processed." />}</div></section>
    </div>

    <section className="mt-10">
      <SectionLabel as="h2">Activity</SectionLabel>
      <div className="mt-4 max-w-3xl space-y-5">
        <NoteComposer candidateId={candidate.id} />
        <ActivityTimeline pinned={timeline.pinned} entries={timeline.entries} />
        {timeline.nextCursor && (
          <a
            href={`/candidates/${candidate.id}?cursor=${encodeURIComponent(timeline.nextCursor)}`}
            className="inline-block text-[var(--text-sm)] font-semibold text-[var(--accent-deep)] hover:underline"
          >
            Older activity →
          </a>
        )}
      </div>
    </section>
  </div></main>;
}