import { afterAll, beforeAll, describe, expect, it, vi } from "vitest";

// The actions call requireUser(), which throws outside a request scope. Mocking
// the auth boundary — not the database — keeps the real logic under test.
vi.mock("@/lib/auth", () => ({
  getUser: async () => ({ id: "test-actor", email: "test@korosha.local", name: "Test" }),
  requireUser: async () => ({ id: "test-actor", email: "test@korosha.local", name: "Test" }),
}));

const runIntegration = Boolean(process.env.DATABASE_URL);
const describeIntegration = runIntegration ? describe : describe.skip;

describeIntegration("status settings actions", () => {
  let prisma: typeof import("@/lib/prisma").prisma;
  let actions: typeof import("@/app/actions/statuses");

  const stamp = Date.now();
  const madeStatusIds: string[] = [];
  let candidateId: string;
  let jobId: string;
  let actorId: string;

  beforeAll(async () => {
    ({ prisma } = await import("@/lib/prisma"));
    actions = await import("@/app/actions/statuses");

    // A real actor row, because reassignment writes activities that FK to User.
    const actor = await prisma.user.upsert({
      where: { email: "test@korosha.local" },
      update: {},
      create: { id: "test-actor", email: "test@korosha.local", name: "Test" },
    });
    actorId = actor.id;

    const candidate = await prisma.candidate.create({
      data: { firstName: "Status", lastName: "Subject", email: `st-${stamp}@example.com` },
    });
    candidateId = candidate.id;
    const job = await prisma.job.create({
      data: { title: "Status Job", reqCode: `ST-${stamp}`, ingestAlias: `st-${stamp}` },
    });
    jobId = job.id;
  });

  afterAll(async () => {
    if (!prisma) return;
    await prisma.candidate.delete({ where: { id: candidateId } }).catch(() => undefined);
    await prisma.job.delete({ where: { id: jobId } }).catch(() => undefined);
    await prisma.status.deleteMany({ where: { id: { in: madeStatusIds } } }).catch(() => undefined);
    await prisma.user.delete({ where: { id: actorId } }).catch(() => undefined);
    await prisma.$disconnect().catch(() => undefined);
  });

  async function makeStatus(label: string) {
    const result = await actions.createStatus({
      label,
      color: "--status-open",
      countsAs: "OPEN",
      isTerminal: false,
    });
    expect(result.ok).toBe(true);
    const key = label.trim().toUpperCase().replace(/[^A-Z0-9]+/g, "_");
    const status = await prisma.status.findUniqueOrThrow({ where: { key } });
    madeStatusIds.push(status.id);
    return status;
  }

  it("creates a status with a derived key and appends it to the order", async () => {
    const last = await prisma.status.findFirst({ orderBy: { order: "desc" }, select: { order: true } });
    const created = await makeStatus(`Awaiting Docs ${stamp}`);
    expect(created.key).toContain("AWAITING_DOCS");
    expect(created.order).toBe((last?.order ?? -1) + 1);
    expect(created.active).toBe(true);
  });

  it("refuses a color outside the palette, so a status cannot fail contrast", async () => {
    const result = await actions.createStatus({
      label: `Bad Color ${stamp}`,
      color: "#ff00ff",
      countsAs: "OPEN",
      isTerminal: false,
    });
    expect(result.ok).toBe(false);
  });

  it("refuses a duplicate name", async () => {
    const label = `Dupe ${stamp}`;
    await makeStatus(label);
    const again = await actions.createStatus({
      label,
      color: "--status-open",
      countsAs: "OPEN",
      isTerminal: false,
    });
    expect(again.ok).toBe(false);
  });

  it("renaming does not rewrite history", async () => {
    const status = await makeStatus(`Renameable ${stamp}`);
    const application = await prisma.application.create({
      data: { candidateId, jobId, source: "MANUAL", statusId: status.id },
    });
    await prisma.activity.create({
      data: {
        candidateId,
        applicationId: application.id,
        type: "STATUS_CHANGED",
        payload: { from: "New", to: status.label, fromStatusId: null, toStatusId: status.id },
      },
    });

    await actions.updateStatus({ id: status.id, label: `Renamed ${stamp}` });

    const event = await prisma.activity.findFirstOrThrow({
      where: { applicationId: application.id, type: "STATUS_CHANGED" },
    });
    // The snapshot still says what the status was CALLED at the time.
    expect((event.payload as { to: string }).to).toBe(status.label);
    expect((event.payload as { toStatusId: string }).toStatusId).toBe(status.id);

    await prisma.application.delete({ where: { id: application.id } });
  });

  it("never deletes a status that has applications attached", async () => {
    const status = await makeStatus(`Occupied ${stamp}`);
    const application = await prisma.application.create({
      data: { candidateId, jobId, source: "MANUAL", statusId: status.id },
    });

    const refused = await actions.deleteStatus({ id: status.id });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toMatch(/reassign|deactivate/i);

    // The status and the application both survive the refusal.
    expect(await prisma.status.findUnique({ where: { id: status.id } })).not.toBeNull();
    expect(await prisma.application.findUnique({ where: { id: application.id } })).not.toBeNull();

    await prisma.application.delete({ where: { id: application.id } });
  });

  it("reassigns then deletes, writing one event per moved application", async () => {
    const doomed = await makeStatus(`Doomed ${stamp}`);
    const target = await makeStatus(`Target ${stamp}`);
    const applications = await Promise.all([
      prisma.application.create({ data: { candidateId, jobId, source: "MANUAL", statusId: doomed.id } }),
      prisma.application.create({
        data: {
          candidateId,
          jobId: (await prisma.job.create({ data: { title: "B", reqCode: `STB-${stamp}`, ingestAlias: `stb-${stamp}` } })).id,
          source: "MANUAL",
          statusId: doomed.id,
        },
      }),
    ]);

    const result = await actions.deleteStatus({ id: doomed.id, reassignToId: target.id });
    expect(result.ok).toBe(true);

    expect(await prisma.status.findUnique({ where: { id: doomed.id } })).toBeNull();
    for (const application of applications) {
      const moved = await prisma.application.findUniqueOrThrow({ where: { id: application.id } });
      expect(moved.statusId).toBe(target.id);

      // Exactly one event per application: the log must not gain rows for a
      // status it has no record of them entering, nor miss the move entirely.
      const events = await prisma.activity.findMany({
        where: { applicationId: application.id, type: "STATUS_CHANGED" },
      });
      expect(events).toHaveLength(1);
      expect(events[0].payload).toMatchObject({ toStatusId: target.id, reassigned: true });
      expect(events[0].actorId).toBe("test-actor");
    }

    await prisma.application.deleteMany({ where: { id: { in: applications.map((a) => a.id) } } });
    await prisma.job.deleteMany({ where: { reqCode: `STB-${stamp}` } });
  });

  it("persists a reorder", async () => {
    const before = await prisma.status.findMany({ orderBy: { order: "asc" }, select: { id: true } });
    const flipped = [before[1].id, before[0].id, ...before.slice(2).map((s) => s.id)];

    expect((await actions.reorderStatuses(flipped)).ok).toBe(true);

    const after = await prisma.status.findMany({ orderBy: { order: "asc" }, select: { id: true } });
    expect(after.map((s) => s.id)).toEqual(flipped);

    // Restore, so the seeded board order survives the test run.
    await actions.reorderStatuses(before.map((s) => s.id));
    const restored = await prisma.status.findMany({ orderBy: { order: "asc" }, select: { id: true } });
    expect(restored.map((s) => s.id)).toEqual(before.map((s) => s.id));
  });

  it("rejects a reorder containing an unknown id rather than partially applying it", async () => {
    const before = await prisma.status.findMany({ orderBy: { order: "asc" }, select: { id: true } });
    const result = await actions.reorderStatuses([...before.map((s) => s.id), "not-a-status"]);
    expect(result.ok).toBe(false);

    const after = await prisma.status.findMany({ orderBy: { order: "asc" }, select: { id: true } });
    expect(after.map((s) => s.id)).toEqual(before.map((s) => s.id));
  });

  it("deactivating keeps applications and history intact", async () => {
    const status = await makeStatus(`Retired ${stamp}`);
    const application = await prisma.application.create({
      data: { candidateId, jobId, source: "MANUAL", statusId: status.id },
    });

    expect((await actions.updateStatus({ id: status.id, active: false })).ok).toBe(true);

    const after = await prisma.status.findUniqueOrThrow({ where: { id: status.id } });
    expect(after.active).toBe(false);
    const stillThere = await prisma.application.findUniqueOrThrow({ where: { id: application.id } });
    expect(stillThere.statusId).toBe(status.id);

    await prisma.application.delete({ where: { id: application.id } });
  });
});
