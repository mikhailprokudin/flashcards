/** Fixed convention: "month" = 30 calendar days in milliseconds. */
export const SRS_MONTH_MS = 30 * 24 * 60 * 60 * 1000;

/** Default delay after `dont_know` (configurable at call site if needed). */
export const SRS_DONT_KNOW_DEFAULT_MS = 12 * 60 * 1000;

/**
 * After know #1 … #5: next from last know (relative to `now`).
 * Index = new step after the know.
 */
export const SRS_MS_AFTER_KNOW_SHORT: Record<1 | 2 | 3 | 4 | 5, number> = {
  1: 30 * 60 * 1000,
  2: 60 * 60 * 1000,
  3: 2 * 60 * 60 * 1000,
  4: 4 * 60 * 60 * 1000,
  5: 8 * 60 * 60 * 1000,
};

/**
 * After know #6 … #10: absolute due from `first_shown_at` (days).
 * Index = new step after the know.
 */
export const SRS_ANCHOR_DAYS: Record<6 | 7 | 8 | 9 | 10, number> = {
  6: 1,
  7: 3,
  8: 7,
  9: 14,
  10: 30,
};
