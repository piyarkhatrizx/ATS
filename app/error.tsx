"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { PageHeader } from "@/components/ui/page-header";

/**
 * `reset` re-renders the segment without a full reload, so a transient DB or
 * network failure costs one click. The digest is safe to show; the message is
 * not — it can carry candidate PII, so it never reaches the client.
 */
export default function Error({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("route error", error.digest);
  }, [error]);

  return (
    <main className="min-h-screen px-6 py-4">
      <PageHeader title="Something went wrong" />
      <div className="mt-4">
        <EmptyState
          title="This view could not load"
          description={
            error.digest
              ? `Try again. If it keeps failing, quote reference ${error.digest}.`
              : "Try again. If it keeps failing, check the server logs."
          }
          action={{ label: "Try again", onClick: () => reset() }}
          secondaryAction={{ label: "Back to jobs", href: "/" }}
        />
      </div>
    </main>
  );
}
