import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

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

// Returns whatever the current test staged, so one mock serves every parse case.
const parsedResume = {
  current: {
    firstName: "Ada",
    lastName: "Lovelace",
    email: "ada@example.com",
    phone: "+1 (555) 111-2222",
    location: "London",
    currentTitle: "Software Engineer",
    currentEmployer: "Analytical Engines",
    linkedinUrl: "https://linkedin.com/in/ada",
    yearsExperience: 8,
    skills: ["TypeScript"],
    workHistory: [],
    education: [],
  } as Record<string, unknown>,
};

vi.mock("@anthropic-ai/sdk", () => ({
  default: class {
    messages = {
      create: async () => ({
        content: [{ type: "text", text: JSON.stringify(parsedResume.current) }],
      }),
    };
  },
}));

const runIntegration = Boolean(process.env.DATABASE_URL);
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("intake", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let intakeApplication: typeof import("@/lib/intake").intakeApplication;
  let processParseJob: typeof import("@/lib/parser").processParseJob;
  let applyPost: typeof import("@/app/api/apply/route").POST;
  let moveApplicationStatus: typeof import("@/app/actions/application").moveApplicationStatus;

  const stamp = Date.now();
  const alias = `caregiver-test-${stamp}`;
  let jobId: string;
  let otherJobId: string;
  const createdCandidateIds = new Set<string>();

  function track<T extends { candidateId: string }>(result: T) {
    createdCandidateIds.add(result.candidateId);
    return result;
  }

  async function submitApplyForm(body: Record<string, unknown>) {
    return applyPost(
      new Request("http://localhost/api/apply", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      }),
    );
  }

  function applyPayload(overrides: Record<string, unknown> = {}) {
    return {
      isAtLeast18: true,
      isCpaCertified: null,
      patientUsesMedicare: false,
      caregivingInterest: "GENERAL_CAREGIVER",
      firstName: "Grace",
      lastName: "Hopper",
      phone: "555-333-4444",
      email: `grace-${stamp}@example.com`,
      ...overrides,
    };
  }

  beforeAll(async () => {
    process.env.CAREGIVER_JOB_ALIAS = alias;
    ({ prisma } = await import("@/lib/prisma"));
    ({ intakeApplication } = await import("@/lib/intake"));
    ({ processParseJob } = await import("@/lib/parser"));
    ({ POST: applyPost } = await import("@/app/api/apply/route"));
    ({ moveApplicationStatus } = await import("@/app/actions/application"));
    process.env.ANTHROPIC_API_KEY = "integration-test-key";

    const job = await prisma.job.create({
      data: { title: "Caregiver", reqCode: `CARE-${stamp}`, ingestAlias: alias },
    });
    jobId = job.id;
    const other = await prisma.job.create({
      data: { title: "Night Nurse", reqCode: `NURSE-${stamp}`, ingestAlias: `nurse-${stamp}` },
    });
    otherJobId = other.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    for (const id of createdCandidateIds) {
      await prisma.candidate.delete({ where: { id } }).catch(() => undefined);
    }
    // Guard against a failed beforeAll: an undefined id here throws a Prisma
    // validation error that buries the real reason the suite could not start.
    const jobIds = [jobId, otherJobId].filter(Boolean);
    if (jobIds.length) {
      await prisma.job.deleteMany({ where: { id: { in: jobIds } } }).catch(() => undefined);
    }
    await prisma.$disconnect().catch(() => undefined);
  });

  it("creates candidate, application and activity with no document or parse job", async () => {
    const response = await submitApplyForm(applyPayload());
    expect(response.status).toBe(201);

    const application = await prisma.application.findFirstOrThrow({
      where: { jobId },
      include: { candidate: true, documents: true, activities: true },
    });
    createdCandidateIds.add(application.candidateId);

    expect(application.source).toBe("APPLY_FORM");
    expect(application.status).toBe("NEW");
    expect(application.screening).toMatchObject({
      isAtLeast18: true,
      caregivingInterest: "GENERAL_CAREGIVER",
    });
    expect(application.candidate.email).toBe(`grace-${stamp}@example.com`);
    expect(application.candidate.phone).toBe("5553334444");
    expect(application.documents).toHaveLength(0);
    expect(application.activities.map((a) => a.type)).toEqual(["APPLICATION_CREATED"]);
    expect(await prisma.parseJob.count({ where: { jobId } })).toBe(0);
  });

  it("dedupes a repeat submission and does not reset a status already moved on", async () => {
    const email = `repeat-${stamp}@example.com`;
    const first = track(
      await intakeApplication({
        jobId,
        source: "APPLY_FORM",
        firstName: "Rita",
        lastName: "Levi",
        email,
        phone: "555-777-8888",
        screening: { isAtLeast18: true },
      }),
    );

    await prisma.application.update({
      where: { id: first.applicationId },
      data: { status: "PHONE_SCREEN" },
    });

    const second = await intakeApplication({
      jobId,
      source: "APPLY_FORM",
      firstName: "Rita",
      lastName: "Levi",
      email,
      phone: "555-777-8888",
      screening: { patientUsesMedicare: true },
    });

    expect(second.candidateId).toBe(first.candidateId);
    expect(second.applicationId).toBe(first.applicationId);
    expect(second.isNewApplication).toBe(false);

    const application = await prisma.application.findUniqueOrThrow({
      where: { id: first.applicationId },
      include: { activities: { orderBy: { createdAt: "asc" } } },
    });
    expect(application.status).toBe("PHONE_SCREEN");
    expect(application.screening).toMatchObject({ isAtLeast18: true, patientUsesMedicare: true });
    expect(application.activities.map((a) => a.type)).toEqual(["APPLICATION_CREATED", "REAPPLIED"]);
    expect(await prisma.application.count({ where: { candidateId: first.candidateId } })).toBe(1);
  });

  it("gives one candidate two applications across two jobs", async () => {
    const email = `twojobs-${stamp}@example.com`;
    const first = track(
      await intakeApplication({ jobId, source: "APPLY_FORM", email, phone: "555-222-3333" }),
    );
    const second = await intakeApplication({
      jobId: otherJobId,
      source: "REFERRAL",
      email,
      phone: "555-222-3333",
    });

    expect(second.candidateId).toBe(first.candidateId);
    expect(second.isNewCandidate).toBe(false);
    expect(second.isNewApplication).toBe(true);
    expect(await prisma.application.count({ where: { candidateId: first.candidateId } })).toBe(2);
  });

  it("dedupes on phone when the email differs", async () => {
    const phone = "(555) 909-0101";
    const first = track(
      await intakeApplication({
        jobId,
        source: "APPLY_FORM",
        email: `phone-a-${stamp}@example.com`,
        phone,
      }),
    );
    const second = await intakeApplication({
      jobId,
      source: "EMAIL",
      email: null,
      phone: "555.909.0101",
    });

    expect(second.candidateId).toBe(first.candidateId);
    expect(second.isNewCandidate).toBe(false);
  });

  it("does not blank fields a parsed resume already filled", async () => {
    const email = `sparse-${stamp}@example.com`;
    const rich = track(
      await intakeApplication({
        jobId: otherJobId,
        source: "EMAIL",
        firstName: "Katherine",
        lastName: "Johnson",
        email,
        phone: "555-464-6464",
        location: "Hampton, VA",
        currentTitle: "Research Mathematician",
        currentEmployer: "NASA",
        linkedinUrl: "https://linkedin.com/in/kjohnson",
      }),
    );

    await intakeApplication({
      jobId,
      source: "APPLY_FORM",
      firstName: "Katherine",
      lastName: "Johnson",
      email,
      phone: "555-464-6464",
      screening: { isAtLeast18: true },
    });

    const candidate = await prisma.candidate.findUniqueOrThrow({ where: { id: rich.candidateId } });
    expect(candidate.location).toBe("Hampton, VA");
    expect(candidate.currentTitle).toBe("Research Mathematician");
    expect(candidate.currentEmployer).toBe("NASA");
    expect(candidate.linkedinUrl).toBe("https://linkedin.com/in/kjohnson");
  });

  it("moves status writing exactly one activity, and rejects a no-op", async () => {
    const intake = track(
      await intakeApplication({
        jobId: otherJobId,
        source: "MANUAL",
        firstName: "Dorothy",
        lastName: "Vaughan",
        email: `status-${stamp}@example.com`,
        phone: "555-808-0808",
      }),
    );

    const activitiesBefore = await prisma.activity.count({
      where: { applicationId: intake.applicationId, type: "STATUS_CHANGED" },
    });

    const moved = await moveApplicationStatus(intake.applicationId, "SCREENING");
    expect(moved.ok).toBe(true);

    const application = await prisma.application.findUniqueOrThrow({
      where: { id: intake.applicationId },
    });
    expect(application.status).toBe("SCREENING");

    const changes = await prisma.activity.findMany({
      where: { applicationId: intake.applicationId, type: "STATUS_CHANGED" },
    });
    expect(changes).toHaveLength(activitiesBefore + 1);
    expect(changes[0].payload).toMatchObject({ from: "NEW", to: "SCREENING" });

    // A no-op is refused and writes nothing.
    const repeat = await moveApplicationStatus(intake.applicationId, "SCREENING");
    expect(repeat.ok).toBe(false);
    if (!repeat.ok) expect(repeat.error).toBeTruthy();
    expect(
      await prisma.activity.count({
        where: { applicationId: intake.applicationId, type: "STATUS_CHANGED" },
      }),
    ).toBe(activitiesBefore + 1);
  });

  it("rejects a move on an application that does not exist", async () => {
    const result = await moveApplicationStatus("cl00000000000000000000000", "OFFER");
    expect(result.ok).toBe(false);
  });

  it("produces structurally equivalent rows from email ingest and the apply form", async () => {
    const emailPerson = `equiv-email-${stamp}@example.com`;
    parsedResume.current = {
      ...parsedResume.current,
      firstName: "Mary",
      lastName: "Jackson",
      email: emailPerson,
      phone: "555-616-1616",
      location: null,
      currentTitle: null,
      currentEmployer: null,
      linkedinUrl: null,
    };

    const document = await prisma.document.create({
      data: {
        s3Key: `test/${stamp}/resume.pdf`,
        filename: "resume.pdf",
        mimeType: "application/pdf",
        sizeBytes: 1024,
      },
    });
    const parseJob = await prisma.parseJob.create({ data: { documentId: document.id, jobId } });
    const parsedCandidate = await processParseJob(parseJob.id);
    createdCandidateIds.add(parsedCandidate.id);

    const formResponse = await submitApplyForm(
      applyPayload({
        firstName: "Mary",
        lastName: "Jackson",
        email: `equiv-form-${stamp}@example.com`,
        phone: "555-626-2626",
      }),
    );
    expect(formResponse.status).toBe(201);

    const emailApplication = await prisma.application.findFirstOrThrow({
      where: { candidateId: parsedCandidate.id },
      include: { candidate: true, documents: true },
    });
    const formApplication = await prisma.application.findFirstOrThrow({
      where: { jobId, candidate: { email: `equiv-form-${stamp}@example.com` } },
      include: { candidate: true, documents: true },
    });
    createdCandidateIds.add(formApplication.candidateId);

    // Same shape: same job, same starting status, both normalized the same way.
    expect(emailApplication.jobId).toBe(formApplication.jobId);
    expect(emailApplication.status).toBe(formApplication.status);
    expect(emailApplication.candidate.firstName).toBe(formApplication.candidate.firstName);
    expect(emailApplication.candidate.lastName).toBe(formApplication.candidate.lastName);
    expect(emailApplication.candidate.phone).toBe("5556161616");
    expect(formApplication.candidate.phone).toBe("5556262626");

    // Differing only in source and the presence of a document.
    expect(emailApplication.source).toBe("EMAIL");
    expect(formApplication.source).toBe("APPLY_FORM");
    expect(emailApplication.documents).toHaveLength(1);
    expect(formApplication.documents).toHaveLength(0);
  });
});
