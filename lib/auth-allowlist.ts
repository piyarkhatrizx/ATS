/**
 * Who may sign in.
 *
 * Separate from lib/auth-config.ts so both the config and the tests can read it
 * without importing the whole Auth.js graph, which pulls in `headers()` and
 * cannot be loaded outside a request context.
 *
 * KOROSHA_ALLOWED_EMAILS is a comma-separated list. An empty list denies
 * everyone rather than allowing everyone: failing closed is the only safe
 * default for a list that gates personal data.
 */
export function getAllowlist(): string[] {
  return (process.env.KOROSHA_ALLOWED_EMAILS ?? "")
    .split(",")
    .map((entry) => entry.trim().toLowerCase())
    .filter(Boolean);
}

export function isAllowedEmail(email: string | null | undefined): boolean {
  const normalized = email?.trim().toLowerCase();
  if (!normalized) return false;

  const allowlist = getAllowlist();
  if (allowlist.length === 0) return false;

  return allowlist.some((entry) =>
    // A leading "@" allows a whole domain: "@korosha.com".
    entry.startsWith("@") ? normalized.endsWith(entry) : normalized === entry,
  );
}
