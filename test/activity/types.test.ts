import { describe, expect, it } from "vitest";
import {
  ACTIVITY_TYPES,
  activityPayloadSchema,
  safeParseActivity,
  writeActivity,
} from "@/lib/activity/types";
import { isCallDisabled, toDurationSeconds } from "@/lib/activity/call";

describe("activity payload variants", () => {
  it("accepts the shape each existing call site writes", () => {
    const valid = [
      { type: "PARSED", documentId: "doc_1" },
      { type: "APPLICATION_CREATED", source: "APPLY_FORM" },
      { type: "REAPPLIED", source: "EMAIL" },
      { type: "STATUS_CHANGED", from: "NEW", to: "SCREENING" },
      { type: "NOTE_ADDED" },
      { type: "EMAIL_SENT", subject: "Hello", messageId: null },
      { type: "EMAIL_RECEIVED", subject: null, messageId: "m_1" },
      { type: "DOCUMENT_ATTACHED", documentId: "doc_2", filename: "cv.pdf" },
      {
        type: "CALL_LOGGED",
        direction: "OUTBOUND",
        outcome: "VOICEMAIL",
        durationSeconds: null,
        phoneNumber: "2165550142",
        loggedManually: true,
      },
    ];
    for (const payload of valid) {
      expect(activityPayloadSchema.safeParse(payload).success, JSON.stringify(payload)).toBe(true);
    }
    // Every type in the union has a variant.
    expect(new Set(valid.map((v) => v.type)).size).toBe(ACTIVITY_TYPES.length);
  });

  it("permits a no-op STATUS_CHANGED, because real history contains one", () => {
    // Rows predating the no-op rejection carry {"from":"NEW","to":"NEW"}.
    expect(
      activityPayloadSchema.safeParse({ type: "STATUS_CHANGED", from: "NEW", to: "NEW" }).success,
    ).toBe(true);
  });

  it("rejects the wrong payload for a type", () => {
    const invalid = [
      { type: "STATUS_CHANGED", source: "APPLY_FORM" },
      { type: "APPLICATION_CREATED", documentId: "doc_1" },
      { type: "PARSED" },
      { type: "STATUS_CHANGED", from: "NEW", to: "NOT_A_STAGE" },
      { type: "CALL_LOGGED", direction: "SIDEWAYS", outcome: "CONNECTED", durationSeconds: 5, phoneNumber: "1", loggedManually: true },
      // loggedManually must be literally true until telephony is real.
      { type: "CALL_LOGGED", direction: "INBOUND", outcome: "CONNECTED", durationSeconds: 5, phoneNumber: "1", loggedManually: false },
    ];
    for (const payload of invalid) {
      expect(activityPayloadSchema.safeParse(payload).success, JSON.stringify(payload)).toBe(false);
    }
  });

  it("refuses to reach Prisma with an invalid payload", async () => {
    let touched = false;
    const tx = {
      activity: {
        create: async () => {
          touched = true;
          return { id: "never" };
        },
      },
    };

    await expect(
      writeActivity(tx, {
        candidateId: "c_1",
        type: "STATUS_CHANGED",
        // @ts-expect-error deliberately the wrong payload for this type
        payload: { source: "APPLY_FORM" },
      }),
    ).rejects.toThrow();
    expect(touched).toBe(false);
  });

  it("strips the discriminant rather than storing it twice", async () => {
    let written: Record<string, unknown> | null = null;
    const tx = {
      activity: {
        create: async ({ data }: { data: Record<string, unknown> }) => {
          written = data;
          return { id: "a_1" };
        },
      },
    };

    await writeActivity(tx, {
      candidateId: "c_1",
      type: "NOTE_ADDED",
      payload: {},
      actorId: "u_1",
      body: "  spoke briefly  ",
    });

    expect(written).toMatchObject({ type: "NOTE_ADDED", actorId: "u_1", pinned: false });
    expect(written!.payload).toEqual({});
  });
});

describe("safeParseActivity", () => {
  it("marks an unrecognized type as unknown rather than throwing", () => {
    const parsed = safeParseActivity({
      id: "a_1",
      type: "SMOKE_SIGNAL_SENT",
      payload: { whatever: true },
      createdAt: new Date(),
    });
    expect(parsed.known).toBe(false);
    if (!parsed.known) expect(parsed.reason).toBe("unknown-type");
  });

  it("marks a known type with the wrong shape as unknown", () => {
    const parsed = safeParseActivity({
      id: "a_2",
      type: "STATUS_CHANGED",
      payload: { from: "NEW" },
      createdAt: new Date(),
    });
    expect(parsed.known).toBe(false);
    if (!parsed.known) expect(parsed.reason).toBe("unknown-shape");
  });

  it("tolerates a null or non-object payload", () => {
    for (const payload of [null, "a string", 42, ["a"]]) {
      expect(() =>
        safeParseActivity({ id: "a_3", type: "PARSED", payload, createdAt: new Date() }),
      ).not.toThrow();
    }
  });
});

describe("call helpers", () => {
  it("disables the call button when there is no dialable number", () => {
    expect(isCallDisabled(null)).toBe(true);
    expect(isCallDisabled(undefined)).toBe(true);
    expect(isCallDisabled("")).toBe(true);
    expect(isCallDisabled("   ")).toBe(true);
    // Too few digits to dial.
    expect(isCallDisabled("555-01")).toBe(true);
    expect(isCallDisabled("2165550142")).toBe(false);
    expect(isCallDisabled("(216) 555-0142")).toBe(false);
  });

  it("treats a blank or zero duration as null", () => {
    expect(toDurationSeconds("", "")).toBeNull();
    expect(toDurationSeconds("0", "0")).toBeNull();
    expect(toDurationSeconds("1", "30")).toBe(90);
    expect(toDurationSeconds("", "45")).toBe(45);
  });
});
