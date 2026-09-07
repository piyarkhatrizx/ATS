import { signIn } from "@/lib/auth";

export default async function LoginPage({ searchParams }: PageProps<"/login">) {
  const { error } = await searchParams;

  return (
    <main className="flex min-h-screen items-center justify-center px-6">
      <div className="w-full max-w-sm">
        <p className="text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)]">
          Korosha
        </p>
        <h1 className="mt-3 text-3xl font-semibold tracking-[-0.04em]">Sign in</h1>
        <p className="mt-2 text-sm text-[var(--ink-muted)]">
          We email you a sign-in link. No password to forget.
        </p>

        <form
          className="mt-8 space-y-4"
          action={async (formData: FormData) => {
            "use server";
            await signIn("nodemailer", formData);
          }}
        >
          <input
            type="email"
            name="email"
            required
            autoComplete="email"
            placeholder="you@company.com"
            className="w-full border border-[var(--line)] bg-[#fbfaf6] px-4 py-3 text-sm outline-none focus:border-[var(--accent)]"
          />
          <button
            type="submit"
            className="w-full bg-[var(--accent-deep)] px-4 py-3 text-sm font-semibold text-white hover:bg-[var(--accent)]"
          >
            Email me a link
          </button>
        </form>

        {error && (
          <p className="mt-4 text-sm text-[var(--accent-deep)]">
            That sign-in link did not work. Request a new one.
          </p>
        )}
      </div>
    </main>
  );
}
