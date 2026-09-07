import type { ApplicationStatus } from "@prisma/client";

/** Pipeline stages, in board order. Mirrors the ApplicationStatus enum. */
export const APPLICATION_STATUSES = [
  "NEW",
  "SCREENING",
  "PHONE_SCREEN",
  "INTERVIEW",
  "OFFER",
  "HIRED",
  "REJECTED",
  "WITHDRAWN",
] as const satisfies readonly ApplicationStatus[];

export const statusLabel: Record<ApplicationStatus, string> = {
  NEW: "New",
  SCREENING: "Screening",
  PHONE_SCREEN: "Phone screen",
  INTERVIEW: "Interview",
  OFFER: "Offer",
  HIRED: "Hired",
  REJECTED: "Rejected",
  WITHDRAWN: "Withdrawn",
};

/** Maps a stage to its Badge tone (and therefore to a --status-* token). */
export const statusTone = {
  NEW: "new",
  SCREENING: "screening",
  PHONE_SCREEN: "phone",
  INTERVIEW: "interview",
  OFFER: "offer",
  HIRED: "hired",
  REJECTED: "rejected",
  WITHDRAWN: "withdrawn",
} as const;
