import type { ReactNode } from "react";

type BadgeTone = "neutral" | "new" | "screening" | "phone" | "interview" | "offer" | "hired" | "rejected" | "withdrawn" | "success" | "warning";

const tones: Record<BadgeTone, string> = {
  neutral: "border-[var(--line)] bg-[#eeece5] text-[var(--foreground)]",
  new: "border-[#b5c3d0] bg-[#e8eef3] text-[var(--status-new)]",
  screening: "border-[#c8bddd] bg-[#eeeaf5] text-[var(--status-screening)]",
  phone: "border-[#dfc49e] bg-[#f6ecdc] text-[var(--status-phone)]",
  interview: "border-[#a9d0c9] bg-[#e5f2ef] text-[var(--status-interview)]",
  offer: "border-[#ddc49d] bg-[#f7eddb] text-[var(--status-offer)]",
  hired: "border-[#acd0ba] bg-[#e6f3eb] text-[var(--status-hired)]",
  rejected: "border-[#dfb3af] bg-[#f8e9e7] text-[var(--status-rejected)]",
  withdrawn: "border-[var(--line)] bg-[#eeece5] text-[var(--status-withdrawn)]",
  success: "border-[#acd0ba] bg-[#e6f3eb] text-[var(--status-hired)]",
  warning: "border-[#dfc49e] bg-[#f6ecdc] text-[var(--status-phone)]",
};

export function Badge({ children, tone = "neutral" }: { children: ReactNode; tone?: BadgeTone }) {
  return <span className={`inline-flex min-h-6 items-center border px-2 text-[var(--text-xs)] font-semibold uppercase tracking-[0.12em] ${tones[tone]}`}>{children}</span>;
}