/**
 * End-to-end ingest check against a RUNNING Next server.
 *
 * This exists because vitest does not use the RSC webpack bundler. pdf-parse
 * and mammoth were mangled by that bundler at module load, so `lib/parser.ts`
 * threw on import and every parse died — while 32 vitest tests stayed green.
 * A green suite does not prove a route loads. This does.
 *
 * Nothing here is mocked, deliberately. Mocking S3 or Anthropic would recreate
 * exactly the false confidence this check exists to eliminate.
 *
 *   npm run dev            # in one terminal
 *   npm run check:ingest   # in another
 *
 * Requires, beyond a running server: POSTMARK_WEBHOOK_* credentials, working S3
 * credentials (the webhook stores the original attachment) and ANTHROPIC_API_KEY
 * (the parser calls the model). It reports which are missing rather than
 * pretending to pass without them.
 */
import fs from "node:fs";
import path from "node:path";
import { prisma } from "@/lib/prisma";

const BASE_URL = process.env.CHECK_BASE_URL ?? "http://localhost:3000";
const ALIAS = `check-ingest-${Date.now()}`;
const STAMP = Date.now();

const FIXTURES = [
  {
    label: "PDF (pdf-parse)",
    file: "test/fixtures/resume.pdf",
    contentType: "application/pdf",
    expectEmail: "marguerite.delacroix@example.com",
  },
  {
    label: "DOCX (mammoth)",
    file: "test/fixtures/resume.docx",
    contentType: "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
    expectEmail: "thaddeus.okonjo@example.com",
  },
];

function basicAuth() {
  const user = process.env.POSTMARK_WEBHOOK_USERNAME;
  const password = process.env.POSTMARK_WEBHOOK_PASSWORD;
  if (!user || !password) return null;
  return `Basic ${Buffer.from(`${user}:${password}`).toString("base64")}`;
}

function preflight() {
  const missing: string[] = [];
  if (!process.env.POSTMARK_WEBHOOK_USERNAME || !process.env.POSTMARK_WEBHOOK_PASSWORD) {
    missing.push("POSTMARK_WEBHOOK_USERNAME / POSTMARK_WEBHOOK_PASSWORD (webhook returns 401)");
  }
  if (!process.env.S3_ACCESS_KEY_ID || !process.env.S3_SECRET_ACCESS_KEY || !process.env.S3_BUCKET) {
    missing.push("S3_BUCKET / S3_ACCESS_KEY_ID / S3_SECRET_ACCESS_KEY (webhook cannot store the original)");
  }
  if (!process.env.ANTHROPIC_API_KEY) {
    missing.push("ANTHROPIC_API_KEY (parser cannot extract fields)");
  }
  return missing;
}

async function serverIsUp() {
  try {
    const response = await fetch(`${BASE_URL}/api/health`);
    return response.ok;
  } catch {
    return false;
  }
}

function payloadFor(fixture: (typeof FIXTURES)[number], messageId: string) {
  const buffer = fs.readFileSync(path.resolve(fixture.file));
  return {
    MessageID: messageId,
    From: "recruiter@example.com",
    FromFull: { Email: "recruiter@example.com" },
    To: `jobs+${ALIAS}@example.com`,
    ToFull: [{ Email: `jobs+${ALIAS}@example.com` }],
    Subject: `Application - ${fixture.label}`,
    TextBody: "Resume attached.",
    Attachments: [
      {
        Name: path.basename(fixture.file),
        Content: buffer.toString("base64"),
        ContentType: fixture.contentType,
        ContentLength: buffer.byteLength,
      },
    ],
  };
}

/** The webhook returns before parsing finishes, so poll for a terminal state. */
async function waitForTerminal(parseJobId: string, timeoutMs = 90_000) {
  const deadline = Date.now() + timeoutMs;
  while (Date.now() < deadline) {
    const job = await prisma.parseJob.findUnique({
      where: { id: parseJobId },
      select: { status: true, lastError: true, attempts: true },
    });
    if (job && (job.status === "COMPLETE" || job.status === "FAILED")) return job;
    await new Promise((resolve) => setTimeout(resolve, 1500));
  }
  return null;
}

type Result = { label: string; ok: boolean; detail: string };

async function main() {
  const results: Result[] = [];

  const missing = preflight();
  if (missing.length) {
    console.log("Missing configuration — this check cannot run end to end:\n");
    for (const item of missing) console.log(`  - ${item}`);
    console.log("\nNothing is mocked here on purpose. Set these and re-run.");
    process.exitCode = 1;
    return;
  }

  if (!(await serverIsUp())) {
    console.log(`No server at ${BASE_URL}. Start one with \`npm run dev\`,`);
    console.log("or point this at another with CHECK_BASE_URL.");
    process.exitCode = 1;
    return;
  }

  const job = await prisma.job.create({
    data: { title: "Ingest Check", reqCode: `CHK-${STAMP}`, ingestAlias: ALIAS },
  });
  const createdCandidateIds = new Set<string>();

  try {
    for (const fixture of FIXTURES) {
      const messageId = `check-${fixture.contentType.slice(-8)}-${STAMP}`;
      const response = await fetch(`${BASE_URL}/api/inbound/postmark`, {
        method: "POST",
        headers: { "content-type": "application/json", authorization: basicAuth()! },
        body: JSON.stringify(payloadFor(fixture, messageId)),
      });

      if (!response.ok) {
        results.push({ label: fixture.label, ok: false, detail: `webhook returned ${response.status}` });
        continue;
      }

      const parseJob = await prisma.parseJob.findFirst({
        where: { jobId: job.id, document: { s3Key: { contains: messageId } } },
        select: { id: true, documentId: true },
      });
      if (!parseJob) {
        results.push({ label: fixture.label, ok: false, detail: "no ParseJob row was created" });
        continue;
      }

      const terminal = await waitForTerminal(parseJob.id);
      if (!terminal) {
        results.push({ label: fixture.label, ok: false, detail: "ParseJob never reached a terminal state" });
        continue;
      }
      if (terminal.status === "FAILED") {
        results.push({
          label: fixture.label,
          ok: false,
          detail: `ParseJob FAILED after ${terminal.attempts} attempt(s): ${terminal.lastError ?? "no error recorded"}`,
        });
        continue;
      }

      const document = await prisma.document.findUnique({
        where: { id: parseJob.documentId },
        select: { candidateId: true, applicationId: true, parseStatus: true },
      });
      const candidate = await prisma.candidate.findFirst({
        where: { email: fixture.expectEmail },
        select: { id: true, firstName: true, lastName: true },
      });
      if (candidate) createdCandidateIds.add(candidate.id);

      const application = candidate
        ? await prisma.application.findUnique({
            where: { candidateId_jobId: { candidateId: candidate.id, jobId: job.id } },
            select: { id: true, source: true },
          })
        : null;

      const ok = Boolean(
        candidate && application && document?.candidateId && document.parseStatus === "COMPLETE",
      );
      results.push({
        label: fixture.label,
        ok,
        detail: ok
          ? `Candidate ${candidate!.firstName} ${candidate!.lastName}, Application ${application!.source}, Document COMPLETE`
          : `candidate=${Boolean(candidate)} application=${Boolean(application)} document=${document?.parseStatus}`,
      });
    }

    // The retry route is the safety net, and it loads lib/parser at module
    // scope — the exact import that used to throw. Exercise it separately.
    const requeued = await prisma.parseJob.findFirst({ where: { jobId: job.id }, select: { id: true } });
    if (requeued) {
      await prisma.parseJob.update({
        where: { id: requeued.id },
        data: { status: "QUEUED", attempts: 0, lastError: null },
      });
      const response = await fetch(`${BASE_URL}/api/parse/retry`, {
        headers: { authorization: basicAuth()! },
      });
      const body = response.ok ? await response.json() : null;
      const terminal = response.ok ? await waitForTerminal(requeued.id) : null;
      results.push({
        label: "/api/parse/retry",
        ok: response.ok && terminal?.status === "COMPLETE",
        detail: response.ok
          ? `HTTP 200 ${JSON.stringify(body)}, job ended ${terminal?.status ?? "unresolved"}`
          : `HTTP ${response.status}`,
      });
    }
  } finally {
    for (const id of createdCandidateIds) {
      await prisma.candidate.delete({ where: { id } }).catch(() => undefined);
    }
    await prisma.inboundMessage.deleteMany({ where: { jobId: job.id } }).catch(() => undefined);
    await prisma.job.delete({ where: { id: job.id } }).catch(() => undefined);
  }

  console.log(`\nIngest check against ${BASE_URL}\n`);
  for (const result of results) {
    console.log(`  ${result.ok ? "PASS" : "FAIL"}  ${result.label.padEnd(18)} ${result.detail}`);
  }
  const failed = results.filter((result) => !result.ok).length;
  console.log(`\n${results.length - failed}/${results.length} passed\n`);
  if (failed) process.exitCode = 1;
}

main()
  .catch((error) => {
    console.error(error instanceof Error ? error.message : error);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
