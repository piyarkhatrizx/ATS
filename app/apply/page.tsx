import ApplyForm from "@/app/apply/apply-form";
import { SectionLabel } from "@/components/ui/section-label";

export const metadata = {
  title: "Caregiver application | Korosha",
  description: "Apply for a caregiver opportunity.",
};

export default function ApplyPage() {
  return (
    <main className="min-h-screen">
      <div className="k-shell grid overflow-hidden border border-[var(--line)] bg-[var(--surface)] lg:grid-cols-[0.78fr_1.22fr]">
        <section className="flex min-h-72 flex-col justify-between bg-[var(--surface-sidebar)] p-[var(--space-6)] text-[var(--on-sidebar)] sm:p-[var(--space-10)] lg:min-h-[680px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--on-sidebar-accent)]">Korosha care team</p>
            <h1 className="mt-[var(--space-12)] max-w-sm text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-5xl">Your care work matters.</h1>
            <p className="mt-[var(--space-6)] max-w-sm text-sm leading-7 text-[var(--on-sidebar-muted)]">Tell us a little about your experience and the kind of caregiver opportunity you are looking for.</p>
          </div>
          <p className="mt-[var(--space-12)] text-xs uppercase tracking-[0.15em] text-[var(--on-sidebar-faint)]">Caregiver application · 2 minutes</p>
        </section>
        <section className="k-glass p-[var(--space-6)] sm:p-[var(--space-10)] lg:p-[var(--space-12)]">
          <div className="mb-[var(--space-10)] border-b border-[var(--line)] pb-[var(--space-6)]"><SectionLabel>Application form</SectionLabel><h2 className="mt-[var(--space-3)] text-3xl font-semibold tracking-[-0.04em]">Let&apos;s get to know you</h2><p className="mt-[var(--space-2)] text-sm text-[var(--ink-muted)]"><span className="text-[var(--foreground)]">*</span> Required fields · CPA certification is optional</p></div>
          <ApplyForm />
        </section>
      </div>
    </main>
  );
}