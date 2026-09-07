import { prisma } from "@/lib/prisma";
import { PageHeader } from "@/components/ui/page-header";
import { StatusesEditor } from "./statuses-editor";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Statuses | Korosha",
  description: "Create, rename, recolor and reorder pipeline statuses.",
};

export default async function StatusesSettingsPage() {
  const statuses = await prisma.status.findMany({
    orderBy: [{ order: "asc" }, { key: "asc" }],
    select: {
      id: true,
      key: true,
      label: true,
      color: true,
      order: true,
      isTerminal: true,
      active: true,
      countsAs: true,
      _count: { select: { applications: true } },
    },
  });

  return (
    <main className="min-h-screen px-6 py-8 sm:px-10 lg:px-16">
      <div className="mx-auto max-w-5xl">
        <PageHeader
          eyebrow="Settings"
          title="Statuses"
          subtitle="Analytics reads counts as, never the name — so renaming a status changes a label and nothing else."
        />
        <div className="mt-6">
          <StatusesEditor
            initial={statuses.map(({ _count, ...status }) => ({
              ...status,
              applicationCount: _count.applications,
            }))}
          />
        </div>
      </div>
    </main>
  );
}
