import { normalizePhone } from "@/lib/inbound";

/**
 * Whether the Call button is disabled, as a pure function so it can be tested
 * without a DOM. A candidate with an unusable number is the same as one with no
 * number: there is nothing to dial.
 */
export function isCallDisabled(phone: string | null | undefined) {
  return normalizePhone(phone) === null;
}

/** Digits for `tel:`, formatted for the label. Never mix the two. */
export function formatPhoneLabel(digits: string) {
  return digits.length === 10
    ? `(${digits.slice(0, 3)}) ${digits.slice(3, 6)}-${digits.slice(6)}`
    : digits;
}

/** Minutes and seconds inputs to total seconds, or null when both are blank. */
export function toDurationSeconds(minutes: string, seconds: string) {
  const m = Number(minutes.trim() || 0);
  const s = Number(seconds.trim() || 0);
  if (!Number.isFinite(m) || !Number.isFinite(s)) return null;
  const total = Math.floor(m) * 60 + Math.floor(s);
  return total > 0 ? total : null;
}
