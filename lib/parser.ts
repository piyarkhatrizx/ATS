import Anthropic from "@anthropic-ai/sdk";
import { spawn } from "node:child_process";
import mammoth from "mammoth";
import { PDFParse } from "pdf-parse";
import { z } from "zod";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { downloadBuffer } from "@/lib/storage";
import { normalizeEmail, normalizePhone } from "@/lib/inbound";
import { intakeApplication } from "@/lib/intake";
import { writeActivity } from "@/lib/activity/types";

const nullableString = z.string().nullable();
const parsedResumeSchema = z.object({
  firstName: nullableString,
  lastName: nullableString,
  email: nullableString,
  phone: nullableString,
  location: nullableString,
  currentTitle: nullableString,
  currentEmployer: nullableString,
  linkedinUrl: nullableString,
  yearsExperience: z.number().nullable(),
  skills: z.array(z.string()).nullable(),
  workHistory: z
    .array(
      z.object({
        employer: nullableString,
        title: nullableString,
        startDate: nullableString,
        endDate: nullableString,
      }),
    )
    .nullable(),
  education: z.array(z.string()).nullable(),
});

export type ParsedResume = z.infer<typeof parsedResumeSchema>;

export async function extractDocumentText(
  buffer: Buffer,
  filename: string,
  mimeType: string,
) {
  const lowerName = filename.toLowerCase();
  if (mimeType === "application/pdf" || lowerName.endsWith(".pdf")) {
    const parser = new PDFParse({ data: buffer });
    try {
      return (await parser.getText()).text;
    } finally {
      await parser.destroy();
    }
  }

  if (
    mimeType ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    return (await mammoth.extractRawText({ buffer })).value;
  }

  if (mimeType === "application/msword" || lowerName.endsWith(".doc")) {
    return runAntiword(buffer);
  }

  throw new Error("Unsupported resume format");
}

function runAntiword(buffer: Buffer) {
  return new Promise<string>((resolve, reject) => {
    const child = spawn("antiword", ["-"], { stdio: ["pipe", "pipe", "pipe"] });
    const output: Buffer[] = [];
    const errors: Buffer[] = [];
    child.stdout.on("data", (chunk: Buffer) => output.push(chunk));
    child.stderr.on("data", (chunk: Buffer) => errors.push(chunk));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) return resolve(Buffer.concat(output).toString("utf8"));
      reject(new Error(errors.length ? "Legacy document extraction failed" : "antiword failed"));
    });
    child.stdin.end(buffer);
  });
}

function getAnthropicClient() {
  if (!process.env.ANTHROPIC_API_KEY) throw new Error("Parser is not configured");
  return new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
}

function parseModelJson(value: string) {
  const fenced = value.match(/```(?:json)?\s*([\s\S]*?)\s*```/i)?.[1] ?? value;
  return parsedResumeSchema.parse(JSON.parse(fenced));
}

export async function parseResumeText(text: string): Promise<ParsedResume> {
  const response = await getAnthropicClient().messages.create({
    model: process.env.ANTHROPIC_MODEL ?? "claude-3-5-haiku-latest",
    max_tokens: 3000,
    system:
      "Extract resume data as JSON only. Every requested field must be present and null when unavailable. Never invent values.",
    messages: [
      {
        role: "user",
        content: `Return JSON matching this shape exactly: {"firstName":string|null,"lastName":string|null,"email":string|null,"phone":string|null,"location":string|null,"currentTitle":string|null,"currentEmployer":string|null,"linkedinUrl":string|null,"yearsExperience":number|null,"skills":string[]|null,"workHistory":{"employer":string|null,"title":string|null,"startDate":string|null,"endDate":string|null}[]|null,"education":string[]|null}\n\nResume:\n${text}`,
      },
    ],
  });
  const output = response.content.find((block) => block.type === "text");
  if (!output || output.type !== "text") throw new Error("Parser returned no text");
  return parseModelJson(output.text);
}

function candidateData(parsed: ParsedResume) {
  return {
    firstName: parsed.firstName,
    lastName: parsed.lastName,
    email: normalizeEmail(parsed.email),
    phone: normalizePhone(parsed.phone),
    location: parsed.location,
    currentTitle: parsed.currentTitle,
    currentEmployer: parsed.currentEmployer,
    linkedinUrl: parsed.linkedinUrl,
  };
}

/** Parse after responding so Postmark never waits, and one bad resume never blocks the rest. */
export async function drainParseJobs(parseJobIds: string[]) {
  for (const parseJobId of parseJobIds) {
    try {
      await processParseJob(parseJobId);
    } catch (error) {
      // No candidate PII here — the parse job id is the only handle we log.
      console.error(
        "Parse job failed",
        parseJobId,
        error instanceof Error ? error.message.slice(0, 200) : "Unknown error",
      );
    }
  }
}

export async function processParseJob(parseJobId: string) {
  const job = await prisma.parseJob.findUnique({ include: { document: true }, where: { id: parseJobId } });
  if (!job) throw new Error("Parse job not found");

  await prisma.parseJob.update({ where: { id: job.id }, data: { status: "PROCESSING", attempts: { increment: 1 } } });
  await prisma.document.update({ where: { id: job.documentId }, data: { parseStatus: "PROCESSING" } });

  try {
    const buffer = await downloadBuffer(job.document.s3Key);
    const text = await extractDocumentText(buffer, job.document.filename, job.document.mimeType);
    let parsed: ParsedResume;
    try {
      parsed = await parseResumeText(text);
    } catch (error) {
      if (job.attempts >= 1) throw error;
      parsed = await parseResumeText(text);
    }

    // Candidate and Application come from the shared intake path, never from here.
    const intake = await intakeApplication({
      jobId: job.jobId,
      source: "EMAIL",
      ...candidateData(parsed),
    });

    await prisma.$transaction(async (transaction) => {
      const document = await transaction.document.update({
        where: { id: job.documentId },
        data: {
          candidateId: intake.candidateId,
          applicationId: intake.applicationId,
          extractedText: text,
          parsedData: parsed as unknown as Prisma.InputJsonValue,
          parseStatus: "COMPLETE",
          parsedAt: new Date(),
        },
      });
      // System write: the parser has no session, so actorId is null on purpose.
      await writeActivity(transaction, {
        candidateId: intake.candidateId,
        applicationId: intake.applicationId,
        type: "PARSED",
        payload: { documentId: document.id },
        actorId: null,
      });
    });

    await prisma.parseJob.update({ where: { id: job.id }, data: { status: "COMPLETE" } });
    return prisma.candidate.findUniqueOrThrow({ where: { id: intake.candidateId } });
  } catch (error) {
    await prisma.document.update({ where: { id: job.documentId }, data: { parseStatus: "FAILED" } });
    await prisma.parseJob.update({
      where: { id: job.id },
      data: { status: "FAILED", lastError: error instanceof Error ? error.message.slice(0, 500) : "Parse failed" },
    });
    throw error;
  }
}