import Link from "next/link";
import { GlassCard } from "@/components/korosha/glass-card";
import { KButton } from "@/components/korosha/button";

export const metadata = {
  title: "Not found | Korosha",
};

/**
 * Every dead end needs a way back. A lead id that no longer resolves is the
 * likely way anyone lands here, so the routes offered are the two places they
 * were probably heading.
 */
export default function NotFound() {
  return (
    <main className="flex min-h-screen items-center justify-center px-[var(--space-6)]">
      <GlassCard className="w-full max-w-md p-[var(--space-8)]">
        <p className="text-[length:var(--text-2xs)] font-medium uppercase tracking-[0.14em] text-[var(--ink-faint)]">
          404
        </p>
        <h1 className="mt-[var(--space-2)] font-display text-[length:var(--text-xl)] font-semibold tracking-[-0.02em]">
          That page does not exist
        </h1>
        <p className="mt-[var(--space-2)] text-[length:var(--text-sm)] leading-relaxed text-[var(--ink-muted)]">
          The link may be out of date, or the record it pointed at was removed.
        </p>
        <div className="mt-[var(--space-6)] flex flex-wrap items-center gap-[var(--space-2)]">
          <KButton variant="accent" asChild>
            <Link href="/">Back to the desk</Link>
          </KButton>
          <KButton asChild>
            <Link href="/candidates">All candidates</Link>
          </KButton>
        </div>
      </GlassCard>
    </main>
  );
}
