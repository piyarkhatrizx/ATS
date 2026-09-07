import type { ReactNode } from "react";

export type BadgeTone =
  | "neutral"
  | "new"
  | "screening"
  | "phone"
  | "interview"
  | "offer"
  | "hired"
  | "rejected"
  | "withdrawn"
  | "success"
  | "warning";

/**
 * Every tone is a --status-* token plus its derived -tint / -line pair, so a
 * palette change in globals.css moves badges, chips and the status menu together.
 */
const tones: Record<BadgeTone, string> = {
  neutral: "border-[var(--line)] bg-[var(--surface-sunken)] text-[var(--foreground)]",
  new: "border-[var(--status-new-line)] bg-[var(--status-new-tint)] text-[var(--status-new)]",
  screening:
    "border-[var(--status-screening-line)] bg-[var(--status-screening-tint)] text-[var(--status-screening)]",
  phone: "border-[var(--status-phone-line)] bg-[var(--status-phone-tint)] text-[var(--status-phone)]",
  interview:
    "border-[var(--status-interview-line)] bg-[var(--status-interview-tint)] text-[var(--status-interview)]",
  offer: "border-[var(--status-offer-line)] bg-[var(--status-offer-tint)] text-[var(--status-offer)]",
  hired: "border-[var(--status-hired-line)] bg-[var(--status-hired-tint)] text-[var(--status-hired)]",
  rejected:
    "border-[var(--status-rejected-line)] bg-[var(--status-rejected-tint)] text-[var(--status-rejected)]",
  withdrawn:
    "border-[var(--status-withdrawn-line)] bg-[var(--status-withdrawn-tint)] text-[var(--status-withdrawn)]",
  success: "border-[var(--status-hired-line)] bg-[var(--status-hired-tint)] text-[var(--status-hired)]",
  warning: "border-[var(--status-phone-line)] bg-[var(--status-phone-tint)] text-[var(--status-phone)]",
};

export function Badge({
  children,
  tone = "neutral",
  className = "",
}: {
  children: ReactNode;
  tone?: BadgeTone;
  className?: string;
}) {
  return (
    <span
      className={`inline-flex min-h-5 items-center border px-1.5 text-[var(--text-xs)] font-semibold uppercase leading-none tracking-[0.1em] ${tones[tone]} ${className}`}
    >
      {children}
    </span>
  );
}
