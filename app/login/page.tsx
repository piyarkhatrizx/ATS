import { signIn } from "@/lib/auth";
import { GlassCard } from "@/components/korosha/glass-card";
import { KButton } from "@/components/korosha/button";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-[var(--space-6)]">
      <GlassCard className="w-full max-w-sm p-[var(--space-6)]">
        <p className="text-[var(--text-xs)] font-semibold uppercase tracking-[0.2em] text-[var(--ink-faint)]">
          Korosha
        </p>
        <h1 className="mt-[var(--space-3)] font-display text-[var(--text-xl)] font-semibold tracking-[-0.03em]">
          Sign in
        </h1>
        <p className="mt-[var(--space-2)] text-[var(--text-sm)] text-[var(--ink-muted)]">
          We email you a sign-in link. No password to forget.
        </p>

        <form
          className="mt-[var(--space-6)] space-y-[var(--space-3)]"
          action={async (formData: FormData) => {
            "use server";
            await signIn("nodemailer", formData);
          }}
        >
          <label htmlFor="email" className="sr-only">
            Email address
          </label>
          <input
            id="email"
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className="w-full border border-[var(--line)] bg-[var(--surface-sunken)] px-[var(--space-3)] py-[var(--space-2)] text-[var(--text-sm)] text-[var(--foreground)] outline-none placeholder:text-[var(--ink-faint)] focus:border-[var(--accent)]"
          />
          <KButton type="submit" variant="accent" size="lg" className="w-full">
            Email me a link
          </KButton>
        </form>

        {error && (
          <p role="alert" className="mt-[var(--space-4)] text-[var(--text-sm)] text-[var(--danger-strong)]">
            That sign-in link did not work. Request a new one.
          </p>
        )}

        <p className="mt-[var(--space-6)] border-t border-[var(--line)] pt-[var(--space-4)] text-[var(--text-xs)] leading-relaxed text-[var(--ink-muted)]">
          Access is limited to allowlisted addresses.
        </p>
      </GlassCard>
    </main>
  );
}
