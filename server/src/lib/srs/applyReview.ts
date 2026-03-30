import {
  SRS_ANCHOR_DAYS,
  SRS_DONT_KNOW_DEFAULT_MS,
  SRS_MS_AFTER_KNOW_SHORT,
  SRS_MONTH_MS,
} from "./srsConfig.js";

export type ReviewResult = "know" | "dont_know";

export type ProgressStatus = "not_started" | "learning" | "learned";

export type SrsProgressState = {
  status: ProgressStatus;
  /** 0 = no "know" yet; 1–10 while learning; 11 only when `status` is `learned` (after 11th know). */
  step: number;
  firstShownAt: Date | null;
};

export type ApplyReviewInput = {
  now: Date;
  result: ReviewResult;
  state: SrsProgressState;
  /** Overrides default `SRS_DONT_KNOW_DEFAULT_MS`. */
  dontKnowDelayMs?: number;
};

export type ApplyReviewOutput = {
  status: ProgressStatus;
  step: number;
  firstShownAt: Date;
  nextDueAt: Date;
  lastReviewAt: Date;
  lastResult: ReviewResult;
};

function addMs(d: Date, ms: number): Date {
  return new Date(d.getTime() + ms);
}

function addDays(d: Date, days: number): Date {
  return new Date(d.getTime() + days * 24 * 60 * 60 * 1000);
}

function maxDate(a: Date, b: Date): Date {
  return a.getTime() >= b.getTime() ? a : b;
}

/**
 * Pure SRS transition for one review. Does not touch the database.
 * Callers must persist `ApplyReviewOutput` fields.
 */
export function applyReview(input: ApplyReviewInput): ApplyReviewOutput {
  const { now, result, state } = input;
  const dontKnowMs = input.dontKnowDelayMs ?? SRS_DONT_KNOW_DEFAULT_MS;
  const lastReviewAt = now;
  const firstShownAt = state.firstShownAt ?? now;

  if (result === "dont_know") {
    return {
      status: state.status === "not_started" ? "learning" : state.status,
      step: state.step,
      firstShownAt,
      nextDueAt: addMs(now, dontKnowMs),
      lastReviewAt,
      lastResult: "dont_know",
    };
  }

  if (state.status === "learned") {
    return {
      status: "learned",
      step: state.step,
      firstShownAt,
      nextDueAt: addMs(now, SRS_MONTH_MS),
      lastReviewAt,
      lastResult: "know",
    };
  }

  const step = state.step;

  if (step === 0) {
    return {
      status: "learning",
      step: 1,
      firstShownAt,
      nextDueAt: addMs(now, SRS_MS_AFTER_KNOW_SHORT[1]),
      lastReviewAt,
      lastResult: "know",
    };
  }

  if (step >= 1 && step <= 4) {
    const newStep = step + 1;
    return {
      status: "learning",
      step: newStep,
      firstShownAt,
      nextDueAt: addMs(now, SRS_MS_AFTER_KNOW_SHORT[newStep as 1 | 2 | 3 | 4 | 5]),
      lastReviewAt,
      lastResult: "know",
    };
  }

  if (step === 5) {
    return {
      status: "learning",
      step: 6,
      firstShownAt,
      nextDueAt: maxDate(addDays(firstShownAt, SRS_ANCHOR_DAYS[6]), now),
      lastReviewAt,
      lastResult: "know",
    };
  }

  if (step >= 6 && step <= 9) {
    const newStep = step + 1;
    return {
      status: "learning",
      step: newStep,
      firstShownAt,
      nextDueAt: maxDate(
        addDays(firstShownAt, SRS_ANCHOR_DAYS[newStep as 6 | 7 | 8 | 9 | 10]),
        now,
      ),
      lastReviewAt,
      lastResult: "know",
    };
  }

  if (step === 10) {
    return {
      status: "learned",
      step: 11,
      firstShownAt,
      nextDueAt: addMs(now, SRS_MONTH_MS),
      lastReviewAt,
      lastResult: "know",
    };
  }

  throw new Error(`Invalid SRS step for learn: ${step}`);
}
