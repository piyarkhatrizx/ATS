import { afterEach, describe, expect, it } from "vitest";
import { getTier, isEnabled } from "@/lib/features";
import { isAllowedEmail } from "@/lib/auth-allowlist";

const originalTier = process.env.KOROSHA_TIER;
const originalAllowlist = process.env.KOROSHA_ALLOWED_EMAILS;

afterEach(() => {
  process.env.KOROSHA_TIER = originalTier;
  process.env.KOROSHA_ALLOWED_EMAILS = originalAllowlist;
});

describe("tier gating", () => {
  it("falls back to v1 when unset or unrecognized", () => {
    for (const value of [undefined, "", "v3", "nonsense"]) {
      if (value === undefined) delete process.env.KOROSHA_TIER;
      else process.env.KOROSHA_TIER = value;
      expect(getTier()).toBe("v1");
    }
  });

  it("v1 is apply-page intake only", () => {
    process.env.KOROSHA_TIER = "v1";
    expect(isEnabled("emailIntake")).toBe(false);
    expect(isEnabled("resumeParsing")).toBe(false);
  });

  it("v2 adds email intake and resume parsing", () => {
    process.env.KOROSHA_TIER = "v2";
    expect(isEnabled("emailIntake")).toBe(true);
    expect(isEnabled("resumeParsing")).toBe(true);
  });

  it("keeps telephony and AI notes off on every tier, since neither is built", () => {
    for (const tier of ["v1", "v2"]) {
      process.env.KOROSHA_TIER = tier;
      expect(isEnabled("telephony")).toBe(false);
      expect(isEnabled("aiCallNotes")).toBe(false);
    }
  });
});

describe("sign-in allowlist", () => {
  it("denies everyone when the list is empty, rather than allowing everyone", () => {
    for (const value of ["", "   ", ","]) {
      process.env.KOROSHA_ALLOWED_EMAILS = value;
      expect(isAllowedEmail("anyone@example.com")).toBe(false);
    }
    delete process.env.KOROSHA_ALLOWED_EMAILS;
    expect(isAllowedEmail("anyone@example.com")).toBe(false);
  });

  it("matches an exact address, case and whitespace insensitively", () => {
    process.env.KOROSHA_ALLOWED_EMAILS = " Recruiter@Korosha.com , other@x.com ";
    expect(isAllowedEmail("recruiter@korosha.com")).toBe(true);
    expect(isAllowedEmail("  RECRUITER@KOROSHA.COM  ")).toBe(true);
    expect(isAllowedEmail("someone@korosha.com")).toBe(false);
  });

  it("allows a whole domain with a leading @", () => {
    process.env.KOROSHA_ALLOWED_EMAILS = "@korosha.com";
    expect(isAllowedEmail("anyone@korosha.com")).toBe(true);
    expect(isAllowedEmail("anyone@elsewhere.com")).toBe(false);
    // Must not match a lookalike domain that merely ends the same way.
    expect(isAllowedEmail("attacker@notkorosha.com")).toBe(false);
  });

  it("rejects a null, empty or malformed address", () => {
    process.env.KOROSHA_ALLOWED_EMAILS = "@korosha.com";
    for (const value of [null, undefined, "", "   "]) {
      expect(isAllowedEmail(value)).toBe(false);
    }
  });
});
