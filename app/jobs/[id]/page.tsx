import { redirect } from "next/navigation";

/**
 * /jobs/[id] is now a scoped view of the inbox. Redirecting rather than
 * deleting keeps existing links and bookmarks working, and the requisition
 * survives as a filter instead of a separate screen.
 */
export default async function JobRedirect({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  redirect(`/leads?job=${encodeURIComponent(id)}`);
}
