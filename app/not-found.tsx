import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

export default function NotFound() {
  return (
    <main className="min-h-screen px-6 py-4">
      <PageHeader title="Not found" />
      <div className="mt-4">
        <EmptyState
          title="That record does not exist"
          description="It may have been merged into another candidate, or the link is stale."
          action={{ label: "Back to jobs", href: "/" }}
        />
      </div>
    </main>
  );
}
