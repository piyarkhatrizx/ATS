import { NextResponse } from "next/server";
import { caregiverApplicationSchema } from "@/lib/caregiver-application";
import { prisma } from "@/lib/prisma";

export async function POST(request: Request) {
  try {
    const body = await request.json();
    const input = caregiverApplicationSchema.parse(body);

    const application = await prisma.caregiverApplication.create({ data: input });

    return NextResponse.json({ accepted: true, id: application.id }, { status: 201 });
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