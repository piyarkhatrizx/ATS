import ApplyForm from "@/app/apply/apply-form";

export const metadata = {
  title: "Caregiver application | Northstar",
  description: "Apply for a caregiver opportunity.",
};

export default function ApplyPage() {
  return (
    <main className="min-h-screen px-5 py-8 sm:px-8 sm:py-12">
      <div className="mx-auto grid max-w-6xl overflow-hidden border border-[var(--line)] bg-[var(--surface)] lg:grid-cols-[0.78fr_1.22fr]">
        <section className="flex min-h-72 flex-col justify-between bg-[var(--surface-sidebar)] p-7 text-[var(--on-sidebar)] sm:p-10 lg:min-h-[680px]">
          <div>
            <p className="text-xs font-semibold uppercase tracking-[0.2em] text-[var(--on-sidebar-accent)]">Northstar care team</p>
            <h1 className="mt-16 max-w-sm text-4xl font-semibold leading-[1.05] tracking-[-0.045em] sm:text-5xl">Your care work matters.</h1>
            <p className="mt-6 max-w-sm text-sm leading-7 text-[var(--on-sidebar-muted)]">Tell us a little about your experience and the kind of caregiver opportunity you are looking for.</p>
          </div>
          <p className="mt-12 text-xs uppercase tracking-[0.15em] text-[var(--on-sidebar-faint)]">Caregiver application · 2 minutes</p>
        </section>
        <section className="ui-material p-6 sm:p-10 lg:p-14">
          <div className="mb-10 border-b border-[var(--line)] pb-6"><p className="text-xs font-semibold uppercase tracking-[0.18em] text-[var(--accent-deep)]">Application form</p><h2 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Let&apos;s get to know you</h2><p className="mt-2 text-sm text-[var(--ink-muted)]"><span className="text-[var(--accent-deep)]">*</span> Required fields · CPA certification is optional</p></div>
          <ApplyForm />
        </section>
      </div>
    </main>
  );
}