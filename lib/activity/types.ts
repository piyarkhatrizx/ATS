import { z } from "zod";
import type { Prisma } from "@prisma/client";
import { APPLICATION_SOURCES } from "@/lib/application-source";

/**
 * Activity.type stays a String column, not a Prisma enum, so the rows written
 * before this module existed remain valid and readable. The union is the
 * contract; the database is deliberately permissive.
 */
export const ACTIVITY_TYPES = [
  "PARSED",
  "APPLICATION_CREATED",
  "REAPPLIED",
  "STATUS_CHANGED",
  "NOTE_ADDED",
  "EMAIL_SENT",
  "EMAIL_RECEIVED",
  "CALL_LOGGED",
  "DOCUMENT_ATTACHED",
  "FORWARDED",
  "AUTO_REJECTED",
] as const;

export type ActivityType = (typeof ACTIVITY_TYPES)[number];

export const CALL_DIRECTIONS = ["OUTBOUND", "INBOUND"] as const;
export const CALL_OUTCOMES = [
  "CONNECTED",
  "VOICEMAIL",
  "NO_ANSWER",
  "WRONG_NUMBER",
  "CALLBACK_REQUESTED",
] as const;

export type CallOutcome = (typeof CALL_OUTCOMES)[number];

const sourceEnum = z.enum(APPLICATION_SOURCES);

/**
 * One variant per type. The legacy shapes are transcribed from what the call
 * sites actually write, not invented:
 *   PARSED              { documentId }        lib/parser.ts
 *   APPLICATION_CREATED { source }            lib/intake.ts
 *   REAPPLIED           { source }            lib/intake.ts
 *   STATUS_CHANGED      { from, to }          app/actions/activity.ts
 *
 * STATUS_CHANGED deliberately permits from === to. Rows predating the no-op
 * rejection carry {"from":"NEW","to":"NEW"}, and encoding the newer rule here
 * would retroactively invalidate real history. `from`/`to` are plain strings
 * rather than an enum now that statuses are user-editable rows.
 */
export const activityPayloadSchema = z.discriminatedUnion("type", [
  z.object({ type: z.literal("PARSED"), documentId: z.string() }),
  z.object({ type: z.literal("APPLICATION_CREATED"), source: sourceEnum }),
  z.object({ type: z.literal("REAPPLIED"), source: sourceEnum }),
  /**
   * Stores BOTH ids and label snapshots.
   *
   * The ids are the truth: renaming a status must not rewrite history, and
   * analytics joins on them. The labels are what the status was CALLED at the
   * time, so a timeline still reads correctly after a rename and still renders
   * if a status is later reassigned away.
   *
   * Both id fields are nullable because the 29 rows written before this change
   * carry labels only. Strict on write, lenient on read.
   */
  z.object({
    type: z.literal("STATUS_CHANGED"),
    from: z.string(),
    to: z.string(),
    fromStatusId: z.string().nullable().optional(),
    toStatusId: z.string().nullable().optional(),
  }),
  // The note text lives in Activity.body, which is searchable; the payload
  // carries nothing so a note is never half in one place and half in the other.
  z.object({ type: z.literal("NOTE_ADDED") }),
  z.object({
    type: z.literal("EMAIL_SENT"),
    subject: z.string().nullable(),
    messageId: z.string().nullable(),
  }),
  z.object({
    type: z.literal("EMAIL_RECEIVED"),
    subject: z.string().nullable(),
    messageId: z.string().nullable(),
  }),
  z.object({
    type: z.literal("CALL_LOGGED"),
    direction: z.enum(CALL_DIRECTIONS),
    outcome: z.enum(CALL_OUTCOMES),
    durationSeconds: z.number().int().nonnegative().nullable(),
    /** Normalized digits, exactly as dialed. */
    phoneNumber: z.string(),
    /** Flips to false once telephony places the call itself. */
    loggedManually: z.literal(true),
  }),
  z.object({
    type: z.literal("DOCUMENT_ATTACHED"),
    documentId: z.string(),
    filename: z.string().nullable(),
  }),
  // Sent to a client list. destination is free text for now; telephony and
  // client records are later phases and should not force a shape yet.
  z.object({
    type: z.literal("FORWARDED"),
    destination: z.string(),
    note: z.string().nullable(),
  }),
  // Written when a rule rejects a submission. The lead keeps its record, and
  // the row shows which rule fired and why.
  z.object({
    type: z.literal("AUTO_REJECTED"),
    ruleId: z.string(),
    ruleName: z.string(),
    reason: z.string(),
    questionKey: z.string(),
  }),
]);

export type ActivityPayload = z.infer<typeof activityPayloadSchema>;
export type PayloadFor<T extends ActivityType> = Extract<ActivityPayload, { type: T }>;

/** The payload minus its discriminant, which is what callers actually pass. */
export type PayloadBody<T extends ActivityType> = Omit<PayloadFor<T>, "type">;

export type WriteActivityInput<T extends ActivityType = ActivityType> = {
  candidateId: string;
  applicationId?: string | null;
  type: T;
  payload: PayloadBody<T>;
  /** Explicit on purpose: system writes pass null rather than inheriting one. */
  actorId?: string | null;
  body?: string | null;
  pinned?: boolean;
  createdAt?: Date;
};

/** Any Prisma client, so this works inside `$transaction` and standalone. */
type ActivityWriter = {
  activity: {
    create: (args: { data: Prisma.ActivityUncheckedCreateInput }) => Promise<{ id: string }>;
  };
};

/**
 * The only way an Activity row should be written.
 *
 * Validation happens before Prisma is touched, so an invalid payload throws
 * instead of persisting a shape the timeline cannot render.
 */
export async function writeActivity<T extends ActivityType>(
  tx: ActivityWriter,
  input: WriteActivityInput<T>,
) {
  const payload = activityPayloadSchema.parse({ type: input.type, ...input.payload });
  // The discriminant is redundant with the column, so it is not stored twice.
  const { type: _discriminant, ...stored } = payload;

  return tx.activity.create({
    data: {
      candidateId: input.candidateId,
      applicationId: input.applicationId ?? null,
      type: input.type,
      payload: stored as Prisma.InputJsonValue,
      actorId: input.actorId ?? null,
      body: input.body ?? null,
      pinned: input.pinned ?? false,
      ...(input.createdAt ? { createdAt: input.createdAt } : {}),
    },
  });
}

export type ActivityRow = {
  id: string;
  type: string;
  payload: unknown;
  createdAt: Date;
  body?: string | null;
  pinned?: boolean;
};

export type ParsedActivity<R extends ActivityRow = ActivityRow> =
  | { known: true; row: R; type: ActivityType; payload: ActivityPayload }
  | { known: false; row: R; type: string; reason: "unknown-type" | "unknown-shape" };

/**
 * Strict on write, lenient on read.
 *
 * Rows written before this module existed, or by a future version that adds a
 * type this build has never heard of, must render rather than crash the
 * timeline. Callers switch on `known`.
 */
export function safeParseActivity<R extends ActivityRow>(row: R): ParsedActivity<R> {
  if (!(ACTIVITY_TYPES as readonly string[]).includes(row.type)) {
    return { known: false, row, type: row.type, reason: "unknown-type" };
  }

  const candidate =
    row.payload && typeof row.payload === "object" && !Array.isArray(row.payload)
      ? { type: row.type, ...(row.payload as Record<string, unknown>) }
      : { type: row.type };

  const result = activityPayloadSchema.safeParse(candidate);
  if (!result.success) {
    return { known: false, row, type: row.type, reason: "unknown-shape" };
  }

  return { known: true, row, type: row.type as ActivityType, payload: result.data };
}
