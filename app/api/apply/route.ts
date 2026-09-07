import { NextResponse } from "next/server";
import { caregiverApplicationSchema } from "@/lib/caregiver-application";
import { intakeApplication } from "@/lib/intake";
import { prisma } from "@/lib/prisma";

const CAREGIVER_JOB_ALIAS = process.env.CAREGIVER_JOB_ALIAS ?? "caregiver";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = caregiverApplicationSchema.parse(body);

    const job = await prisma.job.findUnique({
      where: { ingestAlias: CAREGIVER_JOB_ALIAS },
      select: { id: true, status: true },
    });
    if (!job || job.status !== "OPEN") {
      return NextResponse.json(
        { error: "We are not accepting applications right now. Please check back soon." },
        { status: 409 },
      );
    }

    const result = await intakeApplication({
      jobId: job.id,
      source: "APPLY_FORM",
      firstName: input.firstName,
      lastName: input.lastName,
      email: input.email,
      phone: input.phone,
      screening: {
        isAtLeast18: input.isAtLeast18,
        isCpaCertified: input.isCpaCertified,
        patientUsesMedicare: input.patientUsesMedicare,
        caregivingInterest: input.caregivingInterest,
      },
    });

    return NextResponse.json({ accepted: true, id: result.applicationId }, { status: 201 });
  } catch (error) {
    if (error instanceof SyntaxError) {
      return NextResponse.json({ error: "Invalid request" }, { status: 400 });
    }

    if (error && typeof error === "object" && "issues" in error) {
      return NextResponse.json({ error: "Please review the form fields" }, { status: 400 });
    }

    console.error("Caregiver application submission failed", error instanceof Error ? error.message : "Unknown error");
    return NextResponse.json({ error: "Unable to submit application" }, { status: 500 });
  }
}
