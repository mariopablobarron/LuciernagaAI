/**
 * Age range buckets used across the product to:
 *   - block under-14 at the entry screen (legal: LOPDGDD art. 7 ES = 14)
 *   - tailor the coach's tone and references
 *   - route crisis resources by audience
 *   - constrain features (e.g. circles do not mix minors with adults)
 *
 * We deliberately store a coarse bucket (not the exact age) to minimise PII
 * collected — coherent with the project's anonymous-first stance.
 */

export const AGE_RANGES = ["14_17", "18_29", "30_49", "50_69", "70_plus"] as const;
export type AgeRange = (typeof AGE_RANGES)[number];

/** Includes the rejected bucket. Used by the onboarding declaration screen. */
export const ALL_AGE_BUCKETS = ["under_14", ...AGE_RANGES] as const;
export type AgeBucket = (typeof ALL_AGE_BUCKETS)[number];

export const AGE_RANGE_LABELS: Record<AgeRange, string> = {
  "14_17": "14 a 17 años",
  "18_29": "18 a 29 años",
  "30_49": "30 a 49 años",
  "50_69": "50 a 69 años",
  "70_plus": "70 años o más",
};

export const ALL_AGE_BUCKET_LABELS: Record<AgeBucket, string> = {
  under_14: "Menos de 14 años",
  ...AGE_RANGE_LABELS,
};

export function isAgeRange(value: unknown): value is AgeRange {
  return typeof value === "string" && (AGE_RANGES as readonly string[]).includes(value);
}

export function isAgeBucket(value: unknown): value is AgeBucket {
  return typeof value === "string" && (ALL_AGE_BUCKETS as readonly string[]).includes(value);
}

/**
 * Map an exact age (in years) to the storage bucket.
 * Returns null if the user is too young to use the product.
 */
export function ageToRange(age: number): AgeRange | null {
  if (!Number.isFinite(age) || age < 0) return null;
  if (age < 14) return null; // blocked
  if (age < 18) return "14_17";
  if (age < 30) return "18_29";
  if (age < 50) return "30_49";
  if (age < 70) return "50_69";
  return "70_plus";
}

/** Whether the bucket counts as a minor for legal/protocol purposes. */
export function isMinorRange(range: AgeRange): boolean {
  return range === "14_17";
}

/** Whether the bucket is the elderly band that benefits from accessibility tweaks. */
export function isElderRange(range: AgeRange): boolean {
  return range === "70_plus";
}

/**
 * Coarse audience tier used by the coach prompt and content moderation.
 * - "minor"  → 14-17. Stricter resources, simpler tone, no circle-mixing.
 * - "adult"  → 18-69. Default experience.
 * - "elder"  → 70+. Larger UI, simpler vocabulary.
 */
export type AgeTier = "minor" | "adult" | "elder";

export function rangeToTier(range: AgeRange): AgeTier {
  if (range === "14_17") return "minor";
  if (range === "70_plus") return "elder";
  return "adult";
}
