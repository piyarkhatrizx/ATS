import { Prisma, type ApplicationSource } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { normalizeEmail, normalizePhone } from "@/lib/inbound";

export type IntakeInput = {
  jobId: string;
  source: ApplicationSource;
  firstName?: string | null;
  lastName?: string | null;
  email?: string | null;
  phone?: string | null;
  location?: string | null;
  currentTitle?: string | null;
  currentEmployer?: string | null;
  linkedinUrl?: string | null;
  screening?: Prisma.InputJsonValue | null;
  /** Preserve an original submission time. Defaults to now. */
  appliedAt?: Date;
};

export type IntakeResult = {
  candidateId: string;
  applicationId: string;
  isNewCandidate: boolean;
  isNewApplication: boolean;
};

/** Drop null/undefined keys so a sparse intake never blanks richer existing data. */
function definedOnly<T extends Record<string, unknown>>(data: T) {
  return Object.fromEntries(
    Object.entries(data).filter(([, value]) => value !== null && value !== undefined),
  ) as Partial<T>;
}

/**
 * The only code path that creates a Candidate. Both the apply form and the
 * email parser route through here so dedupe and activity logging stay identical.
 */
export async function intakeApplication(input: IntakeInput): Promise<IntakeResult> {
  const email = normalizeEmail(input.email);
  const phone = normalizePhone(input.phone);
  if (!email && !phone) {
    throw new Error("Intake requires an email or a phone number to dedupe on");
  }

  const candidateData = {
    firstName: input.firstName ?? null,
    lastName: input.lastName ?? null,
    email,
    phone,
    location: input.location ?? null,
    currentTitle: input.currentTitle ?? null,
    currentEmployer: input.currentEmployer ?? null,
    linkedinUrl: input.linkedinUrl ?? null,
  };

  return prisma.$transaction(async (transaction) => {
    // Email first, then phone. Never name. Targeted lookups, not a table scan.
    // ponytail: a concurrent first-time submit can double-insert; Candidate.email
    // cannot be unique because parsed resumes legitimately have none. Add a
    // partial unique index on email/phone where not null if it ever bites.
    const existing =
      (email
        ? await transaction.candidate.findFirst({
            where: { email },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          })
        : null) ??
      (phone
        ? await transaction.candidate.findFirst({
            where: { phone },
            orderBy: { createdAt: "asc" },
            select: { id: true },
          })
        : null);

    const candidate = existing
      ? await transaction.candidate.update({
          where: { id: existing.id },
          data: definedOnly(candidateData),
        })
      : await transaction.candidate.create({ data: candidateData });

    const priorApplication = await transaction.application.findUnique({
      where: { candidateId_jobId: { candidateId: candidate.id, jobId: input.jobId } },
      select: { id: true, screening: true },
    });

    let applicationId: string;
    if (priorApplication) {
      // Never reset status, never overwrite source. Screening answers merge.
      applicationId = priorApplication.id;
      if (input.screening) {
        const merged = {
          ...(priorApplication.screening as Record<string, unknown> | null),
          ...(input.screening as Record<string, unknown>),
        };
        await transaction.application.update({
          where: { id: applicationId },
          data: { screening: merged as Prisma.InputJsonValue },
        });
      }
    } else {
      const created = await transaction.application.create({
        data: {
          candidateId: candidate.id,
          jobId: input.jobId,
          source: input.source,
          screening: input.screening ?? Prisma.JsonNull,
          ...(input.appliedAt ? { appliedAt: input.appliedAt } : {}),
        },
        select: { id: true },
      });
      applicationId = created.id;
    }

    await transaction.activity.create({
      data: {
        candidateId: candidate.id,
        applicationId,
        type: priorApplication ? "REAPPLIED" : "APPLICATION_CREATED",
        payload: { source: input.source },
      },
    });

    return {
      candidateId: candidate.id,
      applicationId,
      isNewCandidate: !existing,
      isNewApplication: !priorApplication,
    };
  });
}
