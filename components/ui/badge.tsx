import type { ReactNode } from "react";

export type BadgeTone = "neutral" | "new" | "screening" | "phone" | "interview" | "offer" | "hired" | "rejected" | "withdrawn" | "success" | "warning";

/**
 * Tones map onto the Korosha status tokens. Badge no longer renders pipeline
 * statuses — StatusPill does, driven by the Status table — so what remains here
 * is yes/no answers and parse states.
 */
const toneToken: Record<BadgeTone, string> = {
  neutral: "--status-neutral",
  new: "--status-open",
  screening: "--status-active",
  phone: "--status-active",
  interview: "--status-active",
  offer: "--status-accepted",
  hired: "--status-accepted",
  rejected: "--status-rejected",
  withdrawn: "--status-neutral",
  success: "--status-accepted",
  warning: "--status-open",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  const token = toneToken[tone];
  return (
    <span
      className="inline-flex min-h-5 items-center border px-[var(--space-1)] text-[var(--text-xs)] font-semibold uppercase leading-none tracking-[0.1em]"
      style={{
        color: `var(${token})`,
        backgroundColor: `color-mix(in oklab, var(${token}) 14%, transparent)`,
        borderColor: `color-mix(in oklab, var(${token}) 34%, transparent)`,
      }}
    >
      {children}
    </span>
  );
}
