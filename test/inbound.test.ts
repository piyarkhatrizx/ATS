import { describe, expect, it } from "vitest";
import {
  extractForwardingCode,
  findDedupeMatch,
  getIngestAlias,
  isResumeAttachment,
  normalizePhone,
} from "@/lib/inbound";

describe("plus-address routing", () => {
  it("extracts the job alias from a jobs plus-address", () => {
    expect(getIngestAlias("jobs+eng-042@example.com")).toBe("eng-042");
    expect(getIngestAlias("Hiring <jobs+eng-042@example.com>")).toBe("eng-042");
  });

  it("does not route ordinary addresses", () => {
    expect(getIngestAlias("recruiting@example.com")).toBeNull();
  });
});

describe("candidate dedupe", () => {
  const existing = [
    { id: "email", email: "Ada@Example.com", phone: "555-111-2222" },
    { id: "phone", email: "other@example.com", phone: "+1 (555) 333-4444" },
  ];

  it("matches normalized email before phone", () => {
    expect(findDedupeMatch({ id: "new", email: "ada@example.com", phone: "5553334444" }, existing)?.id).toBe("email");
  });

  it("matches the last ten phone digits", () => {
    expect(normalizePhone("+1 (555) 333-4444")).toBe("5553334444");
    expect(findDedupeMatch({ id: "new", email: null, phone: "5553334444" }, existing)?.id).toBe("phone");
  });

  it("does not match on name-only data", () => {
    expect(findDedupeMatch({ id: "new", email: null, phone: null }, existing)).toBeNull();
  });
});

describe("inbound helpers", () => {
  it("recognizes supported resume attachments", () => {
    expect(isResumeAttachment({ Name: "resume.pdf", Content: "x" })).toBe(true);
    expect(isResumeAttachment({ Name: "portfolio.png", Content: "x" })).toBe(false);
  });

  it("extracts forwarding verification codes", () => {
    expect(extractForwardingCode("Google forwarding confirmation", "Confirmation code: 482913")).toBe("482913");
  });
});