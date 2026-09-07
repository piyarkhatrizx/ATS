import { beforeEach, describe, expect, it, vi } from "vitest";
import fixture from "@/test/fixtures/postmark-resume.json";

const state = {
  messages: new Map<string, { id: string; messageId: string }>(),
  documents: [] as Array<{ s3Key: string; filename: string }>,
  parseJobs: [] as Array<{ documentId: string; jobId: string }>,
};

vi.mock("@/lib/storage", () => ({
  uploadBuffer: vi.fn(async (key: string) => key),
}));

vi.mock("@/lib/prisma", () => ({
  prisma: {
    inboundMessage: {
      create: vi.fn(async ({ data }: { data: { messageId: string } }) => {
        if (state.messages.has(data.messageId)) {
          const error = Object.assign(new Error("duplicate"), { code: "P2002" });
          throw error;
        }
        const record = { id: `message-${state.messages.size + 1}`, messageId: data.messageId };
        state.messages.set(data.messageId, record);
        return record;
      }),
      update: vi.fn(),
      delete: vi.fn(async () => undefined),
    },
    job: { findUnique: vi.fn(async () => ({ id: "job-1", ingestAlias: "eng-042" })) },
    document: {
      create: vi.fn(async ({ data }: { data: { s3Key: string; filename: string } }) => {
        const record = { id: `document-${state.documents.length + 1}`, ...data };
        state.documents.push(record);
        return record;
      }),
    },
    parseJob: { create: vi.fn(async ({ data }: { data: { documentId: string; jobId: string } }) => { state.parseJobs.push(data); return { id: `parse-job-${state.parseJobs.length}`, ...data }; }) },
    forwardingVerification: { upsert: vi.fn() },
    unroutedEmail: { create: vi.fn() },
  },
}));

const { POST } = await import("@/app/api/inbound/postmark/route");

describe("Postmark inbound route", () => {
  beforeEach(() => {
    state.messages.clear();
    state.documents.length = 0;
    state.parseJobs.length = 0;
  });

  it("rejects requests without Postmark basic auth", async () => {
    process.env.POSTMARK_WEBHOOK_USERNAME = "postmark";
    process.env.POSTMARK_WEBHOOK_PASSWORD = "secret";
    const response = await POST(new Request("http://localhost/api/inbound/postmark", { method: "POST", body: JSON.stringify(fixture) }));
    expect(response.status).toBe(401);
  });

  it("stores one original and one queued parse job", async () => {
    process.env.POSTMARK_WEBHOOK_USERNAME = "postmark";
    process.env.POSTMARK_WEBHOOK_PASSWORD = "secret";
    const authorization = `Basic ${Buffer.from("postmark:secret").toString("base64")}`;
    const response = await POST(new Request("http://localhost/api/inbound/postmark", { method: "POST", headers: { authorization }, body: JSON.stringify(fixture) }));
    expect(response.status).toBe(200);
    expect(state.messages.size).toBe(1);
    expect(state.documents).toHaveLength(1);
    expect(state.parseJobs).toHaveLength(1);
  });

  it("does not create anything on MessageID replay", async () => {
    process.env.POSTMARK_WEBHOOK_USERNAME = "postmark";
    process.env.POSTMARK_WEBHOOK_PASSWORD = "secret";
    const authorization = `Basic ${Buffer.from("postmark:secret").toString("base64")}`;
    const request = () => POST(new Request("http://localhost/api/inbound/postmark", { method: "POST", headers: { authorization }, body: JSON.stringify(fixture) }));
    await request();
    const response = await request();
    expect(response.status).toBe(200);
    expect(state.documents).toHaveLength(1);
    expect(state.parseJobs).toHaveLength(1);
  });
});