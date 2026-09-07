import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";
import { SectionLabel } from "@/components/ui/section-label";
import { statusTone } from "@/lib/application-status";

export const dynamic = "force-dynamic";

export default async function CandidatePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const candidate = await prisma.candidate.findUnique({
    where: { id },
    include: { documents: { orderBy: { parsedAt: "desc" } }, applications: { include: { job: true } } },
  });
  if (!candidate) notFound();
  const name = [candidate.firstName, candidate.lastName].filter(Boolean).join(" ") || "Unnamed candidate";

  return <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16"><div className="mx-auto max-w-6xl">
    <PageHeader
      breadcrumb={[{ label: "Candidates", href: "/candidates" }, { label: name }]}
      eyebrow="Candidate record"
      title={name}
      subtitle={`${candidate.currentTitle ?? "Role not listed"}${candidate.currentEmployer ? ` · ${candidate.currentEmployer}` : ""}`}
    />
    <div className="mt-8 grid gap-8 lg:grid-cols-[0.8fr_1.2fr]">
      <section className="ui-material border border-[var(--line)] p-6"><SectionLabel as="h2">Parsed fields</SectionLabel><dl className="mt-6 space-y-4 text-sm"><div><dt className="text-[var(--ink-muted)]">Email</dt><dd className="mt-1">{candidate.email ?? "—"}</dd></div><div><dt className="text-[var(--ink-muted)]">Phone</dt><dd className="mt-1">{candidate.phone ?? "—"}</dd></div><div><dt className="text-[var(--ink-muted)]">Location</dt><dd className="mt-1">{candidate.location ?? "—"}</dd></div><div><dt className="text-[var(--ink-muted)]">LinkedIn</dt><dd className="mt-1 break-all">{candidate.linkedinUrl ?? "—"}</dd></div></dl><SectionLabel as="h2" className="mt-10">Applications</SectionLabel><ul className="mt-4 space-y-3 text-sm">{candidate.applications.map((application) => <li key={application.id} className="flex justify-between border-b border-[var(--line)] pb-3"><span>{application.job.title}</span><Badge tone={statusTone[application.status]}>{application.status.toLowerCase()}</Badge></li>)}</ul></section>
      <section><SectionLabel as="h2">Original documents and extraction</SectionLabel><div className="mt-4 space-y-5">{candidate.documents.map((document) => <article key={document.id} className="ui-material border border-[var(--line)] p-6"><div className="flex justify-between gap-4"><h3 className="font-medium">{document.filename}</h3><Badge tone={document.parseStatus === "COMPLETE" ? "success" : document.parseStatus === "FAILED" ? "rejected" : "warning"}>{document.parseStatus.toLowerCase()}</Badge></div>{document.parsedData && <pre className="mt-5 max-h-80 overflow-auto border-t border-[var(--line)] pt-5 text-xs leading-6 text-[var(--ink-muted)]">{JSON.stringify(document.parsedData, null, 2)}</pre>}{document.extractedText && <details className="mt-5 border-t border-[var(--line)] pt-5"><summary className="cursor-pointer text-xs font-semibold uppercase tracking-[0.14em]">Extracted text</summary><pre className="mt-4 max-h-96 overflow-auto whitespace-pre-wrap text-xs leading-6 text-[var(--ink-muted)]">{document.extractedText}</pre></details>}</article>)}{!candidate.documents.length && <EmptyState title="No documents attached" description="Original resumes will appear here after an inbound application is processed." />}</div></section>
    </div>
  </div></main>;
}