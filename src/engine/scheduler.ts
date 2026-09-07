/**
 * Layer 1. Requirement 3.1, 3.6, and 4.1.5.
 *
 * Every clock reading in the engine enters through this file. `date.ts` is pure
 * arithmetic over a supplied `now`, which is what lets the debug override of
 * requirement 3.1.4 live here and be dead code eliminated by the `enabled` flag
 * the shell passes from `import.meta.env.DEV`.
 */

import {
  civilFromDays,
  dateForPuzzleNumber,
  daysFromCivil,
  localCivilDate,
  msUntilNextLocalMidnight,
  relateToWatermark,
  type CivilDate,
  type DayRelation,
} from "../core/date.js";
import type { PuzzleNumber } from "../core/types.js";

export interface BeforeEpoch {
  readonly kind: "before-epoch";
  readonly epoch: CivilDate;
}

export interface Resolved {
  readonly kind: "resolved";
  readonly puzzleNumber: PuzzleNumber;
  readonly relation: DayRelation;
  /** `past` is the only archive case. `same` is the ordinary resumed session
   *  and plays live, per the ratified boundary. */
  readonly mode: "live" | "archive";
  readonly date: CivilDate;
  /** Absolute day number, for the suite streak of requirement 7.3.4. */
  readonly dayNumber: number;
}

export type Resolution = BeforeEpoch | Resolved;

/**
 * A puzzle number below 1 means the player reached the site before the game's
 * epoch, which happens only on a skewed clock or a preview deploy. Clamping to
 * 1 would silently serve puzzle one to a player whose clock is wrong, so the
 * caller is told instead and shows a not yet available message.
 */
export function resolve(epoch: CivilDate, watermark: PuzzleNumber, now: Date): Resolution {
  const today = localCivilDate(now);
  const dayNumber = daysFromCivil(today);
  const puzzleNumber = dayNumber - daysFromCivil(epoch) + 1;
  if (puzzleNumber < 1) return { kind: "before-epoch", epoch };

  const relation = relateToWatermark(puzzleNumber, watermark);
  return {
    kind: "resolved",
    puzzleNumber,
    relation,
    mode: relation === "past" ? "archive" : "live",
    date: today,
    dayNumber,
  };
}

export interface ArchiveItem {
  readonly puzzleNumber: PuzzleNumber;
  readonly date: CivilDate;
}

/**
 * Requirement 3.6.1. Newest first, strictly below `todayNumber`, because
 * today's puzzle is not an archive entry even after it is finished.
 *
 * `limit` and `offset` exist so the hub can page rather than build a list of
 * several hundred DOM nodes on a mid tier phone.
 */
export function archiveList(
  epoch: CivilDate,
  todayNumber: PuzzleNumber,
  options: { readonly limit?: number; readonly offset?: number } = {},
): readonly ArchiveItem[] {
  const newest = todayNumber - 1;
  if (newest < 1) return [];

  const offset = Math.max(0, options.offset ?? 0);
  const limit = Math.max(0, options.limit ?? newest);
  const out: ArchiveItem[] = [];
  for (let i = 0; i < limit; i += 1) {
    const puzzleNumber = newest - offset - i;
    if (puzzleNumber < 1) break;
    out.push({ puzzleNumber, date: dateForPuzzleNumber(epoch, puzzleNumber) });
  }
  return out;
}

export function archiveLength(todayNumber: PuzzleNumber): number {
  return Math.max(0, todayNumber - 1);
}

// ---------------------------------------------------------------------------
// Debug date override
// ---------------------------------------------------------------------------

const DEBUG_PARAM = "d";

/**
 * Requirement 3.1.4. Returns local noon on the requested date, not midnight, so
 * a one hour DST shift cannot push the override onto the neighbouring day.
 *
 * `enabled` is false in production and the call collapses to a null return, so
 * a bundler drops the parser.
 */
export function debugDateOverride(search: string, enabled: boolean): Date | null {
  if (!enabled) return null;
  const raw = new URLSearchParams(search).get(DEBUG_PARAM);
  if (raw === null) return null;

  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(raw);
  if (match === null) return null;
  const year = Number(match[1]);
  const month = Number(match[2]);
  const day = Number(match[3]);
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;

  const candidate = new Date(year, month - 1, day, 12, 0, 0, 0);
  /* Rejects 2026-02-31, which the Date constructor would silently roll into
     March. */
  if (
    candidate.getFullYear() !== year ||
    candidate.getMonth() !== month - 1 ||
    candidate.getDate() !== day
  ) {
    return null;
  }
  return candidate;
}

/** The single clock the engine reads. */
export function createClock(override: Date | null): () => Date {
  if (override === null) return () => new Date();
  return () => new Date(override.getTime());
}

// ---------------------------------------------------------------------------
// Countdown
// ---------------------------------------------------------------------------

export interface CountdownDeps {
  now(): Date;
  setTimer(fn: () => void, ms: number): number;
  clearTimer(handle: number): void;
}

export interface CountdownHandlers {
  onTick(remainingMs: number): void;
  onRollover(): void;
}

export const browserCountdownDeps: CountdownDeps = {
  now: () => new Date(),
  setTimer: (fn, ms) => setTimeout(fn, ms) as unknown as number,
  clearTimer: (handle) => {
    clearTimeout(handle);
  },
};

/**
 * Recomputes the remaining time from the clock on every tick rather than
 * decrementing a stored number.
 *
 * A backgrounded mobile tab has its timers throttled to once a minute or
 * suspended outright, so a decrementing counter reads wrong by however long the
 * player was in another app, which on mobile is the normal case and not an edge
 * case. Recomputing also makes the rollover check free, which is how a tab left
 * open past local midnight notices.
 */
export class Countdown {
  private handle: number | null = null;

  private stopped = true;

  /** Local day number the countdown was anchored to. Rollover is a change in
   *  this value, not a remaining time of zero. */
  private anchorDay = 0;

  constructor(
    private readonly deps: CountdownDeps,
    private readonly handlers: CountdownHandlers,
  ) {}

  get running(): boolean {
    return !this.stopped;
  }

  /** Idempotent, so a `visibilitychange` storm cannot stack timers. */
  start(): void {
    if (!this.stopped) return;
    this.stopped = false;
    this.anchorDay = daysFromCivil(localCivilDate(this.deps.now()));
    this.tick();
  }

  stop(): void {
    this.stopped = true;
    if (this.handle !== null) {
      this.deps.clearTimer(this.handle);
      this.handle = null;
    }
  }

  /** Called on `visibilitychange` to show. Recomputes immediately so the
   *  display is never stale for up to a second after the tab returns. */
  resume(): void {
    this.stop();
    this.start();
  }

  private tick(): void {
    if (this.stopped) return;

    const now = this.deps.now();
    /* Rollover is a change of local day, never a remaining time of zero. Once
       the clock is past midnight the remaining time is nearly a full day again,
       so a tab backgrounded across midnight would never see zero and the new
       day would never be announced. Comparing day numbers is also correct for a
       gap of any length and for a clock jumped forward by weeks. */
    if (daysFromCivil(localCivilDate(now)) !== this.anchorDay) {
      this.stop();
      this.handlers.onRollover();
      return;
    }

    const remaining = msUntilNextLocalMidnight(now);
    this.handlers.onTick(remaining);

    /* Wake at the next second boundary, and at rollover itself rather than up
       to a second late. */
    const toBoundary = remaining % 1000 === 0 ? 1000 : remaining % 1000;
    const delay = Math.min(1000, remaining, toBoundary);
    this.handle = this.deps.setTimer(() => {
      this.handle = null;
      this.tick();
    }, Math.max(1, delay));
  }
}

/** Zero padded HH:MM:SS. Hours can exceed 24 only on a DST long day, which the
 *  format accommodates without a special case. */
export function formatCountdown(remainingMs: number): string {
  const total = Math.max(0, Math.floor(remainingMs / 1000));
  const hours = Math.floor(total / 3600);
  const minutes = Math.floor((total % 3600) / 60);
  const seconds = total % 60;
  const pad = (n: number): string => String(n).padStart(2, "0");
  return `${pad(hours)}:${pad(minutes)}:${pad(seconds)}`;
}

/** Convenience for the hub, which needs a day number without a puzzle number. */
export function absoluteDayNumber(now: Date): number {
  return daysFromCivil(localCivilDate(now));
}

export function dateFromDayNumber(dayNumber: number): CivilDate {
  return civilFromDays(dayNumber);
}
