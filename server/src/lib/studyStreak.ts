/** Calendar date in UTC as `YYYY-MM-DD` (matches MySQL DATE + review timestamps). */
export function utcCalendarDate(d: Date): string {
  return d.toISOString().slice(0, 10);
}

function parseUtcMidnight(ymd: string): number {
  const [y, m, day] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, day);
}

/** Whole calendar days from `fromYmd` to `toYmd` (non-negative if to >= from). */
export function calendarDaysFromTo(fromYmd: string, toYmd: string): number {
  const a = parseUtcMidnight(fromYmd);
  const b = parseUtcMidnight(toYmd);
  return Math.round((b - a) / 86_400_000);
}

export type StudyStreakRow = {
  studyStreakCurrent: number;
  studyStreakLastDate: string | null;
  studyStreakBest: number;
};

/** Streak shown in UI: 0 if user skipped a full calendar day (gap ≥ 2). */
export function effectiveStreakCurrent(row: StudyStreakRow, todayYmd: string): number {
  const last = row.studyStreakLastDate;
  if (last == null) return 0;
  const gap = calendarDaysFromTo(last, todayYmd);
  if (gap >= 2) return 0;
  return row.studyStreakCurrent;
}

/** New streak state after a successful review on `todayYmd`. */
export function streakStateAfterReview(row: StudyStreakRow, todayYmd: string): StudyStreakRow {
  const last = row.studyStreakLastDate;
  let nextCurrent = row.studyStreakCurrent;

  if (last == null) {
    nextCurrent = 1;
  } else {
    const gap = calendarDaysFromTo(last, todayYmd);
    if (gap === 0) {
      nextCurrent = row.studyStreakCurrent;
    } else if (gap === 1) {
      nextCurrent = row.studyStreakCurrent + 1;
    } else {
      nextCurrent = 1;
    }
  }

  const nextBest = Math.max(row.studyStreakBest, nextCurrent);
  return {
    studyStreakCurrent: nextCurrent,
    studyStreakLastDate: todayYmd,
    studyStreakBest: nextBest,
  };
}
