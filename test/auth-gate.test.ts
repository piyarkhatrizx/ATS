import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/prisma", () => ({ prisma: {} }));

const { authorized } = await import("@/lib/auth-config");
const { config } = await import("@/middleware");

/** The matcher is a raw negative-lookahead, so it can be checked directly. */
const matches = (pathname: string) =>
  config.matcher.some((pattern) => new RegExp(`^${pattern}$`).test(pathname));

describe("auth gate", () => {
  it("refuses anything without a signed-in user", () => {
    expect(authorized({ auth: null })).toBe(false);
    expect(authorized({ auth: {} as never })).toBe(false);
    expect(authorized({ auth: { user: { id: "u1" } } as never })).toBe(true);
  });

  it("covers every recruiter route that renders candidate PII", () => {
    expect(matches("/")).toBe(true);
    expect(matches("/candidates")).toBe(true);
    expect(matches("/candidates/abc")).toBe(true);
    expect(matches("/jobs/abc")).toBe(true);
    expect(matches("/applications")).toBe(true);
    expect(matches("/design-system")).toBe(true);
  });

  it("leaves the public application form reachable", () => {
    // Candidates are not users and will never have a session. Gating either of
    // these makes the public funnel impossible to complete.
    expect(matches("/apply")).toBe(false);
    expect(matches("/api/apply")).toBe(false);
  });

  it("leaves machine endpoints reachable so their own Basic auth applies", () => {
    // Postmark authenticates with its own Basic credentials and would see a
    // redirect as a failure worth retrying forever.
    expect(matches("/api/inbound/postmark")).toBe(false);
    // Same shape: the parse-queue safety net is machine-invoked and carries the
    // same Basic auth. A 302 here would break it quietly rather than loudly.
    expect(matches("/api/parse/retry")).toBe(false);
    expect(matches("/api/health")).toBe(false);
  });

  it("leaves the sign-in flow reachable", () => {
    expect(matches("/login")).toBe(false);
    expect(matches("/api/auth/callback/nodemailer")).toBe(false);
  });
});
