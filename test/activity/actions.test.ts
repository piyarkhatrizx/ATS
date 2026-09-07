import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { ACTIVITY_TYPES } from "@/lib/activity/types";

const runIntegration = Boolean(process.env.DATABASE_URL);
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("activity actions and timeline", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let addNote: typeof import("@/app/actions/activity").addNote;
  let logCall: typeof import("@/app/actions/activity").logCall;
  let togglePinned: typeof import("@/app/actions/activity").togglePinned;
  let moveApplicationStatus: typeof import("@/app/actions/activity").moveApplicationStatus;
  let getCandidateTimeline: typeof import("@/lib/activity/timeline").getCandidateTimeline;
  let safeParseActivity: typeof import("@/lib/activity/types").safeParseActivity;

  const stamp = Date.now();
  let candidateId: string;
  let jobAId: string;
  let jobBId: string;
  let applicationAId: string;
  let applicationBId: string;
  let actorId: string;

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    ({ addNote, logCall, togglePinned, moveApplicationStatus } = await import(
      "@/app/actions/activity"
    ));
    ({ getCandidateTimeline } = await import("@/lib/activity/timeline"));
    ({ safeParseActivity } = await import("@/lib/activity/types"));

    const actor = await prisma.user.create({
      data: { email: `activity-actor-${stamp}@example.com`, name: "Test Actor" },
    });
    actorId = actor.id;

    const candidate = await prisma.candidate.create({
      data: { firstName: "Timeline", lastName: "Subject", email: `tl-${stamp}@example.com`, phone: "2165550001" },
    });
    candidateId = candidate.id;

    const jobA = await prisma.job.create({
      data: { title: "Job A", reqCode: `TLA-${stamp}`, ingestAlias: `tl-a-${stamp}` },
    });
    const jobB = await prisma.job.create({
      data: { title: "Job B", reqCode: `TLB-${stamp}`, ingestAlias: `tl-b-${stamp}` },
    });
    jobAId = jobA.id;
    jobBId = jobB.id;

    applicationAId = (
      await prisma.application.create({ data: { candidateId, jobId: jobAId, source: "APPLY_FORM" } })
    ).id;
    applicationBId = (
      await prisma.application.create({ data: { candidateId, jobId: jobBId, source: "REFERRAL" } })
    ).id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.candidate.delete({ where: { id: candidateId } }).catch(() => undefined);
    await prisma.job.deleteMany({ where: { id: { in: [jobAId, jobBId] } } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: actorId } }).catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
  });

  it("addNote writes exactly one NOTE_ADDED with the actor set", async () => {
    const before = await prisma.activity.count({ where: { candidateId, type: "NOTE_ADDED" } });
    const result = await addNote({
      candidateId,
      applicationId: applicationAId,
      body: "  Left a message with the front desk.  ",
      actorId,
    });
    expect(result.ok).toBe(true);

    const notes = await prisma.activity.findMany({ where: { candidateId, type: "NOTE_ADDED" } });
    expect(notes).toHaveLength(before + 1);
    expect(notes[0].actorId).toBe(actorId);
    expect(notes[0].body).toBe("Left a message with the front desk.");
    expect(notes[0].payload).toEqual({});
  });

  it("addNote rejects an empty body without writing", async () => {
    const before = await prisma.activity.count({ where: { candidateId } });
    const result = await addNote({ candidateId, body: "   ", actorId });
    expect(result.ok).toBe(false);
    expect(await prisma.activity.count({ where: { candidateId } })).toBe(before);
  });

  it("logCall rejects CONNECTED with a null or zero duration", async () => {
    for (const durationSeconds of [null, 0]) {
      const before = await prisma.activity.count({ where: { candidateId, type: "CALL_LOGGED" } });
      const result = await logCall({
        candidateId,
        payload: {
          direction: "OUTBOUND",
          outcome: "CONNECTED",
          durationSeconds,
          phoneNumber: "2165550001",
          loggedManually: true,
        },
        actorId,
      });
      expect(result.ok).toBe(false);
      expect(await prisma.activity.count({ where: { candidateId, type: "CALL_LOGGED" } })).toBe(before);
    }
  });

  it("logCall accepts a null duration for VOICEMAIL and NO_ANSWER", async () => {
    for (const outcome of ["VOICEMAIL", "NO_ANSWER"] as const) {
      const result = await logCall({
        candidateId,
        applicationId: applicationAId,
        payload: {
          direction: "OUTBOUND",
          outcome,
          durationSeconds: null,
          phoneNumber: "(216) 555-0001",
          loggedManually: true,
        },
        body: `logged ${outcome}`,
        actorId,
      });
      expect(result.ok, outcome).toBe(true);
    }

    const calls = await prisma.activity.findMany({ where: { candidateId, type: "CALL_LOGGED" } });
    expect(calls.length).toBeGreaterThanOrEqual(2);
    // The number is stored normalized, not as typed.
    expect((calls[0].payload as { phoneNumber: string }).phoneNumber).toBe("2165550001");
  });

  it("moveApplicationStatus still writes STATUS_CHANGED and rejects a no-op", async () => {
    const moved = await moveApplicationStatus(applicationAId, "SCREENING", { actorId });
    expect(moved.ok).toBe(true);

    const changes = await prisma.activity.findMany({
      where: { applicationId: applicationAId, type: "STATUS_CHANGED" },
    });
    expect(changes).toHaveLength(1);
    expect(changes[0].payload).toMatchObject({ from: "NEW", to: "SCREENING" });
    expect(changes[0].actorId).toBe(actorId);

    const repeat = await moveApplicationStatus(applicationAId, "SCREENING", { actorId });
    expect(repeat.ok).toBe(false);
    expect(
      await prisma.activity.count({ where: { applicationId: applicationAId, type: "STATUS_CHANGED" } }),
    ).toBe(1);
  });

  it("an explicit null actorId stays null, so system writes are not misattributed", async () => {
    await moveApplicationStatus(applicationBId, "PHONE_SCREEN", { actorId: null });
    const change = await prisma.activity.findFirstOrThrow({
      where: { applicationId: applicationBId, type: "STATUS_CHANGED" },
    });
    expect(change.actorId).toBeNull();
  });

  it("the timeline spans both applications, newest first, with pinned separated", async () => {
    const pinTarget = await prisma.activity.findFirstOrThrow({
      where: { candidateId, type: "NOTE_ADDED" },
    });
    const pinned = await togglePinned({ activityId: pinTarget.id, actorId });
    expect(pinned.ok).toBe(true);

    const timeline = await getCandidateTimeline(candidateId);

    const applicationIds = new Set(timeline.entries.map((entry) => entry.row.applicationId));
    expect(applicationIds.has(applicationAId)).toBe(true);
    expect(applicationIds.has(applicationBId)).toBe(true);

    const times = timeline.entries.map((entry) => entry.row.createdAt.getTime());
    expect([...times].sort((a, b) => b - a)).toEqual(times);

    expect(timeline.pinned.map((entry) => entry.row.id)).toContain(pinTarget.id);
    // Pinned rows stay in the main list too; the block is a surface, not a move.
    expect(timeline.entries.some((entry) => entry.row.id === pinTarget.id)).toBe(true);

    // The joined Job came back in the same query, not an N+1.
    const withJob = timeline.entries.find((entry) => entry.row.application);
    expect(withJob?.row.application?.job?.title).toBeTruthy();
  });

  it("pages without a gap or a duplicate at the boundary", async () => {
    // Identical timestamps are the case a createdAt-only cursor gets wrong.
    const sameInstant = new Date();
    await prisma.activity.createMany({
      data: Array.from({ length: 60 }, (_, index) => ({
        candidateId,
        applicationId: applicationAId,
        type: "NOTE_ADDED",
        payload: {},
        body: `bulk ${index}`,
        createdAt: sameInstant,
      })),
    });

    const first = await getCandidateTimeline(candidateId);
    expect(first.entries).toHaveLength(50);
    expect(first.nextCursor).toBeTruthy();

    const second = await getCandidateTimeline(candidateId, { cursor: first.nextCursor });
    const firstIds = first.entries.map((entry) => entry.row.id);
    const secondIds = second.entries.map((entry) => entry.row.id);

    expect(new Set([...firstIds, ...secondIds]).size).toBe(firstIds.length + secondIds.length);

    const total = await prisma.activity.count({ where: { candidateId } });
    expect(firstIds.length + secondIds.length).toBe(Math.min(total, 100));
  });

  it("renders a real legacy row from the database without crashing", async () => {
    // Every one of the ~76 pre-existing rows conforms, so an unknown row has to
    // be written the way a legacy one was: straight to the column, bypassing
    // writeActivity. This is a real database row, not a synthetic object.
    const legacy = await prisma.activity.create({
      data: {
        candidateId,
        type: "INTERVIEW_SCHEDULED",
        payload: { slot: "2026-01-01T10:00:00Z", interviewer: "someone" },
      },
    });

    const [row] = await prisma.activity.findMany({ where: { id: legacy.id } });
    const parsed = safeParseActivity(row);
    expect(parsed.known).toBe(false);
    if (!parsed.known) expect(parsed.reason).toBe("unknown-type");

    const timeline = await getCandidateTimeline(candidateId);
    expect(timeline.entries.length).toBeGreaterThan(0);
  });

  it("every row carrying a recognized type parses cleanly", async () => {
    // The assumption worth proving: this module did not invalidate real
    // history. Rows with a type outside the union are deliberately excluded —
    // those are the legacy case, and rendering them is safeParseActivity's job,
    // not something to assert away. Asserting "no unknown rows exist" would
    // fail the moment anyone imports old data, which is not a defect.
    const rows = await prisma.activity.findMany({
      where: { candidateId: { not: candidateId }, type: { in: [...ACTIVITY_TYPES] } },
      select: { id: true, type: true, payload: true, createdAt: true },
      take: 500,
    });
    expect(rows.length).toBeGreaterThan(0);

    const unknown = rows
      .map((row) => safeParseActivity(row))
      .filter((parsed) => !parsed.known)
      .map((parsed) => ({ id: parsed.row.id, type: parsed.type }));

    expect(unknown).toEqual([]);
  });
});
