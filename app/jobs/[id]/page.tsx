import Link from "next/link";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";

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
        <div className="mt-8 overflow-x-auto border border-[var(--line)] bg-[#fbfaf6]">
          <table className="w-full min-w-[720px] text-left text-sm">
            <thead className="border-b border-[var(--line)] text-[10px] uppercase tracking-[0.16em] text-[var(--ink-muted)]"><tr><th className="px-5 py-4 font-semibold">Candidate</th><th className="px-5 py-4 font-semibold">Current role</th><th className="px-5 py-4 font-semibold">Applied</th><th className="px-5 py-4 font-semibold">Status</th><th className="px-5 py-4 font-semibold">Parse</th></tr></thead>
            <tbody>{job.applications.map((application) => {
              const candidateName = [application.candidate.firstName, application.candidate.lastName].filter(Boolean).join(" ") || "Unnamed candidate";
              const parseStatus = application.documents[0]?.parseStatus ?? "PENDING";
              return <tr key={application.id} className="border-b border-[var(--line)] last:border-0">
                <td className="px-5 py-4"><Link className="font-medium hover:text-[var(--accent-deep)]" href={`/candidates/${application.candidateId}`}>{candidateName}</Link><div className="mt-1 text-xs text-[var(--ink-muted)]">{application.candidate.email ?? "No email"}</div></td>
                <td className="px-5 py-4 text-[var(--ink-muted)]">{application.candidate.currentTitle ?? "—"}</td>
                <td className="px-5 py-4 text-[var(--ink-muted)]">{application.appliedAt.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" })}</td>
                <td className="px-5 py-4"><span className="border border-[var(--line)] px-2 py-1 text-xs">{statusLabel[application.status] ?? application.status}</span></td>
                <td className="px-5 py-4 text-xs text-[var(--ink-muted)]">{parseStatus.toLowerCase()}</td>
              </tr>;
            })}</tbody>
          </table>
          {!job.applications.length && <p className="p-8 text-sm text-[var(--ink-muted)]">No applications have arrived for this requisition.</p>}
        </div>
      </div>
    </main>
  );
}