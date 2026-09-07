import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { processParseJob } from "@/lib/parser";
import { isAuthorized } from "@/lib/webhook-auth";
import { isEnabled } from "@/lib/features";

const MAX_ATTEMPTS = 3;

/** Safety net for anything `after` dropped: rerun stalled or failed parse jobs. */
export async function GET(request: Request) {
  if (!isEnabled("resumeParsing")) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  if (!isAuthorized(request)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const stalled = await prisma.parseJob.findMany({
    where: { status: { in: ["QUEUED", "FAILED"] }, attempts: { lt: MAX_ATTEMPTS } },
    select: { id: true },
    orderBy: { createdAt: "asc" },
    take: 25,
  });

  let succeeded = 0;
  let failed = 0;
  for (const { id } of stalled) {
    try {
      await processParseJob(id);
      succeeded += 1;
    } catch (error) {
      failed += 1;
      console.error(
        "Parse retry failed",
        id,
        error instanceof Error ? error.message.slice(0, 200) : "Unknown error",
      );
    }
  }

  return NextResponse.json({ picked: stalled.length, succeeded, failed });
}
