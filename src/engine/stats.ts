/**
 * Layer 1. Requirement 3.4, 3.6.1, 7.3.4, and resolution 6.
 *
 * Pure functions over a record. Nothing here reads a clock, so the streak rule
 * cannot be reached by a clock jump: the caller has already resolved the day in
 * scheduler.ts and only calls completeLive for a live puzzle.
 */

import type { PuzzleNumber } from "../core/types.js";
import {
  HISTORY_CAP,
  type GameRecord,
  type HistoryEntry,
  type StoredResult,
  type SuiteRecord,
} from "./storage.js";

function capped(entries: readonly HistoryEntry[]): readonly HistoryEntry[] {
  return entries.length <= HISTORY_CAP ? entries : entries.slice(entries.length - HISTORY_CAP);
}

/**
 * Requirement 3.1.3, the whole of it.
 *
 * A streak day is earned only by completing the puzzle immediately after the
 * last completed one. A forward jump of any size fails the equality and resets,
 * with no clock specific branch anywhere. The reset value is 1 and not 0
 * because the day just completed is itself the first day of the new streak, and
 * a player who has just finished a puzzle must never be shown a streak of zero.
 */
export function nextStreak(
  currentStreak: number,
  lastCompletedPuzzle: PuzzleNumber,
  puzzleNumber: PuzzleNumber,
): number {
  return puzzleNumber === lastCompletedPuzzle + 1 ? currentStreak + 1 : 1;
}

/**
 * Records a completed live puzzle. Idempotent for the same puzzle number, so a
 * double dispatch on the completing action cannot double count a game or
 * advance a streak twice.
 */
export function completeLive(
  record: GameRecord,
  puzzleNumber: PuzzleNumber,
  result: StoredResult,
): GameRecord {
  if (record.history.some((entry) => entry.puzzleNumber === puzzleNumber)) {
    return record;
  }

  const streak = nextStreak(record.currentStreak, record.lastCompletedPuzzle, puzzleNumber);
  const distribution = record.distribution.slice();
  if (result.bucket < distribution.length) {
    distribution[result.bucket] = (distribution[result.bucket] as number) + 1;
  }

  return {
    ...record,
    lastCompletedPuzzle: puzzleNumber,
    watermark: Math.max(record.watermark, puzzleNumber),
    currentStreak: streak,
    maxStreak: Math.max(record.maxStreak, streak),
    played: record.played + 1,
    won: record.won + (result.won === true ? 1 : 0),
    distribution,
    live: { puzzleNumber, state: record.live?.state ?? null, result },
    history: capped([...record.history, { puzzleNumber, result }]),
  };
}

/**
 * Requirement 3.6.1. Touches no aggregate, no streak, and no distribution. The
 * separation is structural rather than a remembered condition: this function
 * simply has no access to a code path that changes them.
 */
export function completeArchive(
  record: GameRecord,
  puzzleNumber: PuzzleNumber,
  result: StoredResult,
): GameRecord {
  const withoutPrevious = record.archive.filter((entry) => entry.puzzleNumber !== puzzleNumber);
  return { ...record, archive: capped([...withoutPrevious, { puzzleNumber, result }]) };
}

export function advanceWatermark(record: GameRecord, puzzleNumber: PuzzleNumber): GameRecord {
  if (puzzleNumber <= record.watermark) return record;
  /* An in progress board for an older day is discarded, not migrated. The day
     has passed and the board is no longer today's puzzle. */
  return { ...record, watermark: puzzleNumber, live: { puzzleNumber, state: null, result: null } };
}

export function resultFor(record: GameRecord, puzzleNumber: PuzzleNumber): StoredResult | null {
  const live = record.live;
  if (live !== null && live.puzzleNumber === puzzleNumber && live.result !== null) return live.result;
  const entry = record.history.find((item) => item.puzzleNumber === puzzleNumber);
  return entry?.result ?? null;
}

export function archiveResultFor(
  record: GameRecord,
  puzzleNumber: PuzzleNumber,
): StoredResult | null {
  return record.archive.find((item) => item.puzzleNumber === puzzleNumber)?.result ?? null;
}

// ---------------------------------------------------------------------------
// Panel data
// ---------------------------------------------------------------------------

export interface StatsSummary {
  readonly played: number;
  readonly currentStreak: number;
  readonly maxStreak: number;
  /** Null when the module sets hasWinLoss false, which suppresses the row
   *  entirely rather than rendering a meaningless zero. Resolution 1. */
  readonly winPercent: number | null;
  readonly distribution: readonly number[];
  readonly distributionMax: number;
}

export function summarize(record: GameRecord, hasWinLoss: boolean): StatsSummary {
  const winPercent =
    !hasWinLoss || record.played === 0
      ? hasWinLoss
        ? 0
        : null
      : Math.round((record.won / record.played) * 100);

  return {
    played: record.played,
    currentStreak: record.currentStreak,
    maxStreak: record.maxStreak,
    winPercent,
    distribution: record.distribution,
    distributionMax: record.distribution.reduce((max, n) => (n > max ? n : max), 0),
  };
}

// ---------------------------------------------------------------------------
// Suite level
// ---------------------------------------------------------------------------

/**
 * Requirement 7.3.4. Defined over absolute day numbers, so a game launching in
 * year two inherits no fake suite history. Resolution 4.
 *
 * Completing a second game on a day already credited advances nothing, which is
 * the forgiveness the requirement asks for: one game is enough, and five is not
 * worth more.
 */
export function completeSuiteDay(
  suite: SuiteRecord,
  dayNumber: number,
  gameId: string,
): SuiteRecord {
  const lastPlayed = { ...suite.lastPlayed, [gameId]: dayNumber };
  if (dayNumber === suite.lastCompletedDay) return { ...suite, lastPlayed };

  const streak = dayNumber === suite.lastCompletedDay + 1 ? suite.currentStreak + 1 : 1;
  return {
    ...suite,
    lastCompletedDay: Math.max(suite.lastCompletedDay, dayNumber),
    currentStreak: streak,
    maxStreak: Math.max(suite.maxStreak, streak),
    lastPlayed,
  };
}

/**
 * Requirement 7.3.7. The least recently played game other than the one just
 * finished. A game never played sorts before any game that has been, because
 * offering something new beats offering something stale.
 */
export function crossPromotionTarget(
  suite: SuiteRecord,
  allGameIds: readonly string[],
  justFinished: string,
): string | null {
  const candidates = allGameIds.filter((id) => id !== justFinished);
  if (candidates.length === 0) return null;

  let best = candidates[0] as string;
  let bestDay = suite.lastPlayed[best] ?? -1;
  for (const id of candidates.slice(1)) {
    const day = suite.lastPlayed[id] ?? -1;
    if (day < bestDay) {
      best = id;
      bestDay = day;
    }
  }
  return best;
}
