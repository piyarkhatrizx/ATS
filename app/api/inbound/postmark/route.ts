import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import {
  extractForwardingCode,
  getAttachmentKey,
  getIngestAlias,
  getToAddresses,
  isResumeAttachment,
  type PostmarkInboundPayload,
} from "@/lib/inbound";
import { prisma } from "@/lib/prisma";
import { uploadBuffer } from "@/lib/storage";

function isAuthorized(request: Request) {
  const expectedUser = process.env.POSTMARK_WEBHOOK_USERNAME;
  const expectedPassword = process.env.POSTMARK_WEBHOOK_PASSWORD;
  const header = request.headers.get("authorization");
  if (!expectedUser || !expectedPassword || !header?.startsWith("Basic ")) return false;

  const decoded = Buffer.from(header.slice(6), "base64").toString("utf8");
  return decoded === `${expectedUser}:${expectedPassword}`;
}

function fromAddress(payload: PostmarkInboundPayload) {
  return payload.FromFull?.Email ?? payload.From ?? "unknown";
}

export async function POST(request: Request) {
  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  let payload: PostmarkInboundPayload;
  try {
    payload = (await request.json()) as PostmarkInboundPayload;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  if (!payload.MessageID) {
    return NextResponse.json({ error: "MessageID is required" }, { status: 400 });
  }

  const addresses = getToAddresses(payload);
  const toAddress = addresses.join(", ");
  let inbound;
  try {
    inbound = await prisma.inboundMessage.create({
      data: {
        messageId: payload.MessageID,
        fromAddress: fromAddress(payload),
        toAddress,
        subject: payload.Subject,
        jobId: undefined,
        attachments: (payload.Attachments ?? []).map((attachment) => ({
          name: attachment.Name,
          contentType: attachment.ContentType ?? null,
          contentLength: attachment.ContentLength ?? null,
        })),
        receivedAt: payload.Date ? new Date(payload.Date) : undefined,
      },
    });
  } catch (error) {
    if (
      (error instanceof Prisma.PrismaClientKnownRequestError ||
        (typeof error === "object" && error !== null && "code" in error)) &&
      (error as { code?: string }).code === "P2002"
    ) {
      return NextResponse.json({ accepted: true, duplicate: true });
    }
    throw error;
  }

  try {
    const sender = fromAddress(payload).toLowerCase();
    if (sender === "forwarding-noreply@google.com") {
      const code = extractForwardingCode(payload.Subject, payload.TextBody ?? payload.HtmlBody);
      if (code) {
        await prisma.forwardingVerification.upsert({
          where: { messageId: payload.MessageID },
          update: { code, rawSubject: payload.Subject },
          create: {
            messageId: payload.MessageID,
            code,
            fromAddress: sender,
            rawSubject: payload.Subject,
          },
        });
      }
    }

    const alias = addresses.map(getIngestAlias).find(Boolean);
    const job = alias ? await prisma.job.findUnique({ where: { ingestAlias: alias } }) : null;
    if (!job) {
      await prisma.unroutedEmail.create({
        data: {
          messageId: payload.MessageID,
          fromAddress: fromAddress(payload),
          toAddress,
          subject: payload.Subject,
          payload: payload as unknown as Prisma.InputJsonValue,
        },
      });
      return NextResponse.json({ accepted: true, routed: false });
    }

    await prisma.inboundMessage.update({
      where: { id: inbound.id },
      data: { jobId: job.id },
    });

    for (const attachment of payload.Attachments ?? []) {
      if (!isResumeAttachment(attachment)) continue;
      const buffer = Buffer.from(attachment.Content, "base64");
      const s3Key = getAttachmentKey(payload.MessageID, attachment.Name);
      await uploadBuffer(s3Key, buffer, attachment.ContentType ?? "application/octet-stream");
      const document = await prisma.document.create({
        data: {
          s3Key,
          filename: attachment.Name,
          mimeType: attachment.ContentType ?? "application/octet-stream",
          sizeBytes: buffer.byteLength,
        },
      });
      await prisma.parseJob.create({ data: { documentId: document.id, jobId: job.id } });
    }

    return NextResponse.json({ accepted: true, routed: true });
  } catch (error) {
    await prisma.inboundMessage.delete({ where: { id: inbound.id } }).catch(() => undefined);
    throw error;
  }
}