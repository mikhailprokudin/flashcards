import assert from "node:assert/strict";
import { describe, it } from "node:test";
import {
  calendarDaysFromTo,
  effectiveStreakCurrent,
  streakStateAfterReview,
  utcCalendarDate,
} from "./studyStreak.js";

describe("studyStreak", () => {
  it("utcCalendarDate uses UTC", () => {
    const d = new Date("2026-04-04T23:00:00.000Z");
    assert.equal(utcCalendarDate(d), "2026-04-04");
  });

  it("calendarDaysFromTo", () => {
    assert.equal(calendarDaysFromTo("2026-04-03", "2026-04-03"), 0);
    assert.equal(calendarDaysFromTo("2026-04-03", "2026-04-04"), 1);
    assert.equal(calendarDaysFromTo("2026-04-03", "2026-04-05"), 2);
  });

  it("first review: current 1, best 1", () => {
    const out = streakStateAfterReview(
      { studyStreakCurrent: 0, studyStreakLastDate: null, studyStreakBest: 0 },
      "2026-04-04",
    );
    assert.deepEqual(out, {
      studyStreakCurrent: 1,
      studyStreakLastDate: "2026-04-04",
      studyStreakBest: 1,
    });
  });

  it("second review same day: unchanged current, best unchanged", () => {
    const out = streakStateAfterReview(
      { studyStreakCurrent: 3, studyStreakLastDate: "2026-04-04", studyStreakBest: 5 },
      "2026-04-04",
    );
    assert.deepEqual(out, {
      studyStreakCurrent: 3,
      studyStreakLastDate: "2026-04-04",
      studyStreakBest: 5,
    });
  });

  it("consecutive day: increment current, update best", () => {
    const out = streakStateAfterReview(
      { studyStreakCurrent: 3, studyStreakLastDate: "2026-04-03", studyStreakBest: 3 },
      "2026-04-04",
    );
    assert.deepEqual(out, {
      studyStreakCurrent: 4,
      studyStreakLastDate: "2026-04-04",
      studyStreakBest: 4,
    });
  });

  it("gap 2+ days: reset current to 1", () => {
    const out = streakStateAfterReview(
      { studyStreakCurrent: 10, studyStreakLastDate: "2026-04-01", studyStreakBest: 10 },
      "2026-04-04",
    );
    assert.deepEqual(out, {
      studyStreakCurrent: 1,
      studyStreakLastDate: "2026-04-04",
      studyStreakBest: 10,
    });
  });

  it("effectiveStreakCurrent: gap 0 or 1 shows stored", () => {
    assert.equal(
      effectiveStreakCurrent(
        { studyStreakCurrent: 5, studyStreakLastDate: "2026-04-04", studyStreakBest: 8 },
        "2026-04-04",
      ),
      5,
    );
    assert.equal(
      effectiveStreakCurrent(
        { studyStreakCurrent: 5, studyStreakLastDate: "2026-04-03", studyStreakBest: 8 },
        "2026-04-04",
      ),
      5,
    );
  });

  it("effectiveStreakCurrent: gap >= 2 shows 0, best untouched in row", () => {
    const row = { studyStreakCurrent: 9, studyStreakLastDate: "2026-04-01", studyStreakBest: 12 };
    assert.equal(effectiveStreakCurrent(row, "2026-04-04"), 0);
    assert.equal(row.studyStreakBest, 12);
  });

  it("effectiveStreakCurrent: no last date", () => {
    assert.equal(
      effectiveStreakCurrent(
        { studyStreakCurrent: 0, studyStreakLastDate: null, studyStreakBest: 0 },
        "2026-04-04",
      ),
      0,
    );
  });
});
