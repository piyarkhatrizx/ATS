export { auth as middleware } from "@/lib/auth-config";

export const config = {
  // Auth.js sessions live in Postgres via the Prisma adapter, which cannot run
  // on the edge, so this middleware needs the Node runtime.
  runtime: "nodejs",
  // Everything is gated except the paths below, because every recruiter route
  // renders candidate PII.
  //
  // The exclusions, and why each one must stay excluded:
  //   login, api/auth  - the sign-in flow itself; gating it is a redirect loop.
  //   apply, api/apply - the public application form. Candidates are not users
  //                      and will never have a session.
  //   api/inbound      - Postmark carries its own Basic auth and treats a 302
  //                      as a retryable failure, so it would retry forever.
  //   api/parse/retry  - same shape: machine-invoked, carries the same Basic
  //                      auth as the webhook, and a 302 would silently break
  //                      the parse-queue safety net rather than error loudly.
  //   api/health       - probes run without a session by definition.
  //   api/dev-login    - mints a development session; refuses in production,
  //                      and gating it would make it unreachable.
  matcher: [
    "/((?!login|api/auth|apply|api/apply|api/inbound|api/parse/retry|api/health|api/dev-login|_next/static|_next/image|favicon.ico).*)",
  ],
};
