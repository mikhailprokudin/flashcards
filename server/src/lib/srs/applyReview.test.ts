import assert from "node:assert/strict";
import { describe, it } from "node:test";
import { applyReview } from "./applyReview.js";
import { SRS_MONTH_MS, SRS_MS_AFTER_KNOW_SHORT } from "./srsConfig.js";

const iso = (s: string) => new Date(s);

describe("applyReview", () => {
  it("first know: step 0→1, +30m from now", () => {
    const now = iso("2026-01-01T12:00:00.000Z");
    const out = applyReview({
      now,
      result: "know",
      state: { status: "not_started", step: 0, firstShownAt: null },
    });
    assert.equal(out.step, 1);
    assert.equal(out.status, "learning");
    assert.equal(out.nextDueAt.getTime(), now.getTime() + SRS_MS_AFTER_KNOW_SHORT[1]);
  });

  it("6→7: anchor +1d from first_shown, not before now when user lags", () => {
    const firstShown = iso("2026-01-01T00:00:00.000Z");
    const now = iso("2026-01-05T12:00:00.000Z");
    const out = applyReview({
      now,
      result: "know",
      state: { status: "learning", step: 5, firstShownAt: firstShown },
    });
    assert.equal(out.step, 6);
    assert.equal(out.nextDueAt.getTime(), now.getTime());
  });

  it("6→7: uses anchor when user is on time", () => {
    const firstShown = iso("2026-01-01T00:00:00.000Z");
    const now = iso("2026-01-01T10:00:00.000Z");
    const out = applyReview({
      now,
      result: "know",
      state: { status: "learning", step: 5, firstShownAt: firstShown },
    });
    assert.equal(out.step, 6);
    const expected = new Date(firstShown.getTime() + 24 * 60 * 60 * 1000);
    assert.equal(out.nextDueAt.getTime(), expected.getTime());
  });

  it("9→10: anchor +30d from first_shown with max(now) when behind", () => {
    const firstShown = iso("2026-01-01T00:00:00.000Z");
    const now = iso("2026-02-15T00:00:00.000Z");
    const out = applyReview({
      now,
      result: "know",
      state: { status: "learning", step: 9, firstShownAt: firstShown },
    });
    assert.equal(out.step, 10);
    assert.equal(out.nextDueAt.getTime(), now.getTime());
  });

  it("10→learned: status learned, next = now + month (30d)", () => {
    const now = iso("2026-03-01T08:00:00.000Z");
    const out = applyReview({
      now,
      result: "know",
      state: { status: "learning", step: 10, firstShownAt: iso("2026-01-01T00:00:00.000Z") },
    });
    assert.equal(out.status, "learned");
    assert.equal(out.step, 11);
    assert.equal(out.nextDueAt.getTime(), now.getTime() + SRS_MONTH_MS);
  });

  it("learned + know: reschedules +1 month from now", () => {
    const now = iso("2026-06-01T00:00:00.000Z");
    const out = applyReview({
      now,
      result: "know",
      state: { status: "learned", step: 11, firstShownAt: iso("2026-01-01T00:00:00.000Z") },
    });
    assert.equal(out.nextDueAt.getTime(), now.getTime() + SRS_MONTH_MS);
  });

  it("dont_know: does not advance step; short delay", () => {
    const now = iso("2026-01-01T12:00:00.000Z");
    const out = applyReview({
      now,
      result: "dont_know",
      state: { status: "learning", step: 5, firstShownAt: iso("2026-01-01T00:00:00.000Z") },
    });
    assert.equal(out.step, 5);
    assert.equal(out.lastResult, "dont_know");
    assert.equal(out.nextDueAt.getTime(), now.getTime() + 12 * 60 * 1000);
  });
});
