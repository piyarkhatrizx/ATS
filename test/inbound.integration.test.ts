import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";
import fixture from "@/test/fixtures/postmark-resume.json";

vi.mock("@/lib/storage", () => ({
  uploadBuffer: vi.fn(async (key: string) => key),
  downloadBuffer: vi.fn(async () => Buffer.from("fixture resume text")),
}));

vi.mock("pdf-parse", () => ({
  PDFParse: class {
    async getText() {
      return { text: "fixture resume text" };
    }

    async destroy() {}
  },
}));

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      create: async () => ({
        content: [{ type: "text", text: JSON.stringify({
          firstName: "Ada",
          lastName: "Lovelace",
          email: "ada@example.com",
          phone: "+1 555 111 2222",
          location: "London",
          currentTitle: "Software Engineer",
          currentEmployer: "Analytical Engines",
          linkedinUrl: null,
          yearsExperience: 8,
          skills: ["TypeScript"],
          workHistory: [],
          education: [],
        }) }],
      }),
    }
  },
}));

const runIntegration = Boolean(process.env.DATABASE_URL);
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("Postmark ingest integration", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let post: typeof import("@/app/api/inbound/postmark/route").POST;
  let processParseJob: typeof import("@/lib/parser").processParseJob;
  let jobId: string;
  const messageId = `integration-${Date.now()}`;

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    ({ POST: post } = await import("@/app/api/inbound/postmark/route"));
    ({ processParseJob } = await import("@/lib/parser"));
    process.env.POSTMARK_WEBHOOK_USERNAME = "postmark";
    process.env.POSTMARK_WEBHOOK_PASSWORD = "secret";
    process.env.ANTHROPIC_API_KEY = "integration-test-key";
    const job = await prisma.job.create({ data: { title: "Software Engineer", reqCode: `INT-${Date.now()}`, ingestAlias: `eng-${Date.now()}` } });
    jobId = job.id;
  });

  afterAll(async () => {
    await prisma.job.delete({ where: { id: jobId } });
    await prisma.$disconnect();
  });

  it("creates one candidate, application, and document from the fixture", async () => {
    const payload = { ...fixture, MessageID: messageId, To: `jobs+${(await prisma.job.findUniqueOrThrow({ where: { id: jobId } })).ingestAlias}@example.com` };
    const authorization = `Basic ${Buffer.from("postmark:secret").toString("base64")}`;
    const response = await post(new Request("http://localhost/api/inbound/postmark", { method: "POST", headers: { authorization }, body: JSON.stringify(payload) }));
    expect(response.status).toBe(200);

    const queued = await prisma.parseJob.findFirstOrThrow({ where: { jobId } });
    await processParseJob(queued.id);

    expect(await prisma.candidate.count({ where: { email: "ada@example.com" } })).toBe(1);
    expect(await prisma.application.count({ where: { jobId } })).toBe(1);
    expect(await prisma.document.count({ where: { s3Key: { contains: messageId } } })).toBe(1);
  });
});