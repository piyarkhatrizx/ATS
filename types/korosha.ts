/**
 * The Korosha domain vocabulary.
 *
 * "Applicant" in KOROSHA.md means an Application row: one lead, one source, one
 * status, one form payload. Candidate remains the person behind it, so
 * lib/intake.ts dedupe still applies and one person can hold several
 * applications.
 */
import type {
  Application,
  Candidate,
  RuleAction,
  RuleOperator,
  Status,
  StatusCountsAs,
} from "@prisma/client";

export type { Status, StatusCountsAs, RuleOperator, RuleAction };

/** Where a lead came from. Email requires tier v2. */
export type LeadSource = "APPLY_FORM" | "EMAIL" | "REFERRAL" | "MANUAL";

/**
 * One lead as the inbox needs it. `otherApplicationCount` exists so the row can
 * warn that this person is already in the pipeline — calling the same lead
 * twice is the failure this product is built to avoid.
 */
export type Applicant = Application & {
  candidate: Candidate;
  statusRef: Status | null;
  otherApplicationCount: number;
};

/** Append-only event types. Mirrors the Zod union in lib/activity/types.ts. */
export const ACTIVITY_EVENT_TYPES = [
  "applied",
  "called",
  "status_changed",
  "emailed",
  "forwarded",
  "auto_rejected",
] as const;

export type ActivityEventType = (typeof ACTIVITY_EVENT_TYPES)[number];

/* -- Form definitions ---------------------------------------------------- */

export const FORM_FIELD_TYPES = [
  "text",
  "email",
  "tel",
  "textarea",
  "select",
  "radio",
  "checkbox",
  "boolean",
] as const;

export type FormFieldType = (typeof FORM_FIELD_TYPES)[number];

export type FormFieldOption = { value: string; label: string };

/** `key` is the stable identifier rules reference via Rule.questionKey. */
export type FormField = {
  key: string;
  label: string;
  type: FormFieldType;
  options?: FormFieldOption[];
  required: boolean;
  helpText?: string | null;
};

export type FormDefinitionShape = {
  fields: FormField[];
  consentText: string;
};

/* -- Rules ---------------------------------------------------------------- */

/** The subset of a submission a rule sees: field key to answer. */
export type RuleContext = Record<string, string | number | boolean | null | undefined>;

export type RuleSpec = {
  id: string;
  name: string;
  questionKey: string;
  operator: RuleOperator;
  value: string | null;
  action: RuleAction;
  reason: string;
  active: boolean;
  priority: number;
};

/** The outcome of evaluating every rule against one submission. */
export type RuleVerdict =
  | { rejected: false; flagged: RuleSpec[] }
  | { rejected: true; rule: RuleSpec; reason: string; flagged: RuleSpec[] };

/* -- Analytics ------------------------------------------------------------ */

export type AnalyticsWindow = "today" | "7d" | "30d";

export type AnalyticsCounts = {
  applications: number;
  calls: number;
  accepted: number;
  rejected: number;
};

export type AnalyticsSummary = Record<AnalyticsWindow, AnalyticsCounts> & {
  bySource: Array<{ source: LeadSource; count: number }>;
  /** Headline metric. Null until at least one lead has been called. */
  medianSecondsToFirstCall: number | null;
};
