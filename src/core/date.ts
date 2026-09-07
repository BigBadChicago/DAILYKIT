/**
 * Layer 0. Requirement 4.0.3.
 *
 * Every day computation reads calendar fields out of a Date and does integer
 * arithmetic on them. Nothing here subtracts milliseconds and divides by
 * 86400000. Local days are 23 or 25 hours long twice a year in DST observing
 * regions, so the constant divisor is wrong by an hour after a transition,
 * which moves the puzzle boundary for any player awake between midnight and
 * one in the morning. That defect is invisible to every test that does not
 * construct it deliberately, so the technique is banned rather than guarded.
 *
 * This file touches no globals, reads no URL, and calls no clock. The caller
 * supplies `now`, which is what lets the debug date override of requirement
 * 3.1.4 live in Layer 1 and be compiled out of production there.
 */

import type { PuzzleNumber } from "./types.js";

/** Month is 1 through 12, matching GameIdentity.epoch and not Date.getMonth. */
export interface CivilDate {
  readonly year: number;
  readonly month: number;
  readonly day: number;
}

/** 0 is Sunday. */
export type Weekday = 0 | 1 | 2 | 3 | 4 | 5 | 6;

/** 1970-01-01 was a Thursday, so day number 0 maps to weekday 4. */
const EPOCH_WEEKDAY = 4;

function assertCivil(date: CivilDate): void {
  const { year, month, day } = date;
  if (!Number.isInteger(year) || year < 100 || year > 9999) {
    throw new RangeError(`year out of supported range, got ${year}`);
  }
  if (!Number.isInteger(month) || month < 1 || month > 12) {
    throw new RangeError(`month must be 1 through 12, got ${month}`);
  }
  if (!Number.isInteger(day) || day < 1 || day > 31) {
    throw new RangeError(`day must be 1 through 31, got ${day}`);
  }
}

/**
 * Days from 1970-01-01 in the proleptic Gregorian calendar. Howard Hinnant's
 * days_from_civil, which is exact integer arithmetic with no table and no leap
 * year special casing beyond the era shift.
 */
export function daysFromCivil(date: CivilDate): number {
  assertCivil(date);
  const y = date.year - (date.month <= 2 ? 1 : 0);
  const era = Math.floor(y / 400);
  const yoe = y - era * 400;
  const doy = Math.floor((153 * (date.month + (date.month > 2 ? -3 : 9)) + 2) / 5) + date.day - 1;
  const doe = yoe * 365 + Math.floor(yoe / 4) - Math.floor(yoe / 100) + doy;
  return era * 146097 + doe - 719468;
}

/** Inverse of daysFromCivil. Needed for archive list labels and for turning a
 *  puzzle number back into a date. */
export function civilFromDays(days: number): CivilDate {
  if (!Number.isSafeInteger(days)) {
    throw new RangeError(`day number must be a safe integer, got ${days}`);
  }
  const z = days + 719468;
  const era = Math.floor(z / 146097);
  const doe = z - era * 146097;
  const yoe = Math.floor(
    (doe - Math.floor(doe / 1460) + Math.floor(doe / 36524) - Math.floor(doe / 146096)) / 365,
  );
  const y = yoe + era * 400;
  const doy = doe - (365 * yoe + Math.floor(yoe / 4) - Math.floor(yoe / 100));
  const mp = Math.floor((5 * doy + 2) / 153);
  const day = doy - Math.floor((153 * mp + 2) / 5) + 1;
  const month = mp + (mp < 10 ? 3 : -9);
  return { year: y + (month <= 2 ? 1 : 0), month, day };
}

/** The platform has already resolved the offset, including DST, when it fills
 *  these fields. That is the entire reason this function exists. */
export function localCivilDate(now: Date): CivilDate {
  return { year: now.getFullYear(), month: now.getMonth() + 1, day: now.getDate() };
}

export function weekdayOf(date: CivilDate): Weekday {
  const days = daysFromCivil(date);
  return (((days % 7) + 7 + EPOCH_WEEKDAY) % 7) as Weekday;
}

/** Requirement 3.1.1. The epoch date itself is puzzle number 1. */
export function puzzleNumberFor(epoch: CivilDate, now: Date): PuzzleNumber {
  return daysFromCivil(localCivilDate(now)) - daysFromCivil(epoch) + 1;
}

export function dateForPuzzleNumber(epoch: CivilDate, puzzleNumber: PuzzleNumber): CivilDate {
  if (!Number.isSafeInteger(puzzleNumber)) {
    throw new RangeError(`puzzle number must be a safe integer, got ${puzzleNumber}`);
  }
  return civilFromDays(daysFromCivil(epoch) + puzzleNumber - 1);
}

/**
 * Milliseconds until the start of the next local day. Requirement 3.1.2.
 *
 * Tomorrow's midnight is constructed as a real Date from tomorrow's civil
 * fields, so the platform resolves the offset and the answer is legitimately 23
 * or 25 hours on a transition day. In the handful of zones where local midnight
 * does not exist at all, the Date constructor normalizes to the first instant
 * that does exist on that date, which is the correct rollover point.
 */
export function msUntilNextLocalMidnight(now: Date): number {
  const tomorrow = civilFromDays(daysFromCivil(localCivilDate(now)) + 1);
  const target = new Date(tomorrow.year, tomorrow.month - 1, tomorrow.day, 0, 0, 0, 0);
  return target.getTime() - now.getTime();
}

/**
 * Requirement 3.1.3, clock jump classification. Ratified boundary: archive is
 * strictly below the watermark, so a same day return resolves to `same` and
 * resumes live play with its in progress board intact.
 *
 *   advance   resolved above the watermark, live, watermark moves to it
 *   same      resolved at the watermark, live, the ordinary resumed session
 *   past      resolved below the watermark, ARCHIVED_VIEW, never affects stats
 *
 * Note what this does not do: it says nothing about streaks. A forward jump of
 * any size is `advance`, and the streak breaks or continues purely on the
 * arithmetic in stats.ts, so no clock reading can award a skipped day.
 */
export type DayRelation = "advance" | "same" | "past";

export function relateToWatermark(
  puzzleNumber: PuzzleNumber,
  watermark: PuzzleNumber,
): DayRelation {
  if (puzzleNumber > watermark) return "advance";
  if (puzzleNumber === watermark) return "same";
  return "past";
}
