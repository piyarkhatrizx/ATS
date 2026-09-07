/**
 * The only place KOROSHA_TIER is read.
 *
 * One codebase, one flag — never scatter env checks. If you find yourself
 * writing `process.env.KOROSHA_TIER` anywhere else, add a feature here instead.
 */
export const KOROSHA_TIERS = ["v1", "v2"] as const;
export type KoroshaTier = (typeof KOROSHA_TIERS)[number];

/** Unrecognized or unset values fall back to v1: the demo tier is the safe default. */
export function getTier(): KoroshaTier {
  const raw = process.env.KOROSHA_TIER?.trim().toLowerCase();
  return KOROSHA_TIERS.includes(raw as KoroshaTier) ? (raw as KoroshaTier) : "v1";
}

/**
 * v1 (demo): apply page intake only.
 * v2 (full): adds email intake, resume parsing, and later telephony and AI notes.
 */
const FEATURES = {
  emailIntake: ["v2"],
  resumeParsing: ["v2"],
  telephony: [],
  aiCallNotes: [],
} as const satisfies Record<string, readonly KoroshaTier[]>;

export type Feature = keyof typeof FEATURES;

export function isEnabled(feature: Feature): boolean {
  return (FEATURES[feature] as readonly KoroshaTier[]).includes(getTier());
}

/** For routes that must refuse rather than degrade when a tier lacks a feature. */
export function assertEnabled(feature: Feature) {
  if (!isEnabled(feature)) {
    throw new Error(`${feature} is not available on tier ${getTier()}`);
  }
}
