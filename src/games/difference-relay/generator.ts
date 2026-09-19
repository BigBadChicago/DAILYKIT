/**
 * Layer 4. DIFFERENCE RELAY generation. DIFFERENCE-RELAY.md sections 7, 11, 12
 * and 18.
 *
 * Direct construction: draw the numbers, draw the winning order, read its
 * differences, hide some, then draw a start order. Randomness arrives as a Draw
 * so the tools and the module each name the engine's rng once, the seam VECTOR
 * and ROTATE LOCK use.
 */

import { GAPS, VALUE_MAX, VALUE_MIN, diffsOf, sameOrder, satisfiesVisible } from "./relay.js";
import { makePuzzle, type DifferenceRelayPuzzle } from "./rules.js";

/** The only randomness this file consumes. Matches core/rng's integer helper. */
export interface Draw {
  intBelow(bound: number): number;
}

export const HIDDEN_COUNTS: readonly number[] = [1, 2, 3];
export const START_TRIES = 20;
/** Attempts one manifest day may consume before it is reported unfillable. */
export const ATTEMPT_CEILING = 40000;
/** Attempts the browser spends past the horizon. DIFFERENCE-RELAY.md 18. */
export const FALLBACK_ATTEMPTS = 4000;

/**
 * Upper edges of bands 0 to 5 over forced deduction work; band 6 is everything
 * above. Septiles of the screened sample in data/difference-relay/study.json,
 * written by tools/difference-relay-calibrate.ts. Changing an edge invalidates
 * every stored band, so it is a manifest regeneration and not a tweak.
 */
export const BAND_EDGES: readonly number[] = [2, 3, 7, 11, 20, 37];

/** Band per weekday, 0 Monday through 6 Sunday, the suite's weekly curve. */
export const WEEKDAY_BAND: readonly number[] = [0, 1, 2, 3, 5, 6, 4];

export type RejectReason = "range" | "uniqueness" | "decomposition" | "symmetry" | "fairness" | "start" | "band";

/** Section 10.2 accounting. Counted by reason, in screen order. */
export type Tally = Record<RejectReason | "accepted", number>;

export function emptyTally(): Tally {
  return { range: 0, uniqueness: 0, decomposition: 0, symmetry: 0, fairness: 0, start: 0, band: 0, accepted: 0 };
}

/** Epoch 2026-01-05 is a Monday, so puzzle 1 is a Monday. */
export function weekdayOf(puzzleNumber: number): number {
  return (puzzleNumber - 1) % 7;
}

export function bandOf(difficulty: number): number {
  let band = 0;
  while (band < BAND_EDGES.length && difficulty > (BAND_EDGES[band] as number)) band += 1;
  return band;
}

export function bandForPuzzle(puzzleNumber: number): number {
  return WEEKDAY_BAND[weekdayOf(puzzleNumber)] as number;
}

/** Six distinct numbers. `range-tight` is a run of six consecutive values, so
 *  differences collide often; `range-wide` spreads them, so a visible mark pins
 *  more. */
export function drawNumbers(draw: Draw): { numbers: number[]; lever: string } {
  if (draw.intBelow(2) === 0) {
    const span = VALUE_MAX - VALUE_MIN + 1 - 6; // 4 starting points for a run of six.
    const start = VALUE_MIN + draw.intBelow(span + 1);
    return { numbers: [start, start + 1, start + 2, start + 3, start + 4, start + 5], lever: "range-tight" };
  }
  for (let tries = 0; tries < 40; tries += 1) {
    const pool = [1, 2, 3, 4, 5, 6, 7, 8, 9];
    for (let i = pool.length - 1; i > 0; i -= 1) {
      const j = draw.intBelow(i + 1);
      const swap = pool[i] as number;
      pool[i] = pool[j] as number;
      pool[j] = swap;
    }
    const numbers = pool.slice(0, 6).sort((a, b) => a - b);
    if ((numbers[5] as number) - (numbers[0] as number) >= 6) return { numbers, lever: "range-wide" };
  }
  /* A wide set always exists; the retry only avoids an accidental tight draw. */
  return { numbers: [1, 3, 4, 6, 7, 9], lever: "range-wide" };
}

export interface Candidate {
  readonly target: readonly number[];
  readonly marks: readonly (number | null)[];
  readonly startOrder: readonly number[];
  readonly levers: readonly string[];
}

/** Steps 1 to 6 of DIFFERENCE-RELAY.md 7, up to but not through the screens. */
export function drawCandidate(draw: Draw): Candidate | "range" {
  const { numbers, lever } = drawNumbers(draw);

  const target = numbers.slice();
  for (let i = target.length - 1; i > 0; i -= 1) {
    const j = draw.intBelow(i + 1);
    const swap = target[i] as number;
    target[i] = target[j] as number;
    target[j] = swap;
  }

  const trueDiffs = diffsOf(target);
  const hidden = HIDDEN_COUNTS[draw.intBelow(HIDDEN_COUNTS.length)] as number;
  const hiddenGaps = new Set<number>();
  while (hiddenGaps.size < hidden) hiddenGaps.add(draw.intBelow(GAPS));
  const marks: (number | null)[] = trueDiffs.map((d, i) => (hiddenGaps.has(i) ? null : d));

  let startOrder: number[] | null = null;
  for (let tries = 0; tries < START_TRIES; tries += 1) {
    const order = numbers.slice();
    for (let i = order.length - 1; i > 0; i -= 1) {
      const j = draw.intBelow(i + 1);
      const swap = order[i] as number;
      order[i] = order[j] as number;
      order[j] = swap;
    }
    if (!sameOrder(order, target)) {
      startOrder = order;
      break;
    }
  }
  if (startOrder === null) return "range";

  return { target, marks, startOrder, levers: [lever, `hidden-${String(hidden)}`] };
}

/**
 * DIFFERENCE-RELAY.md 12. Reject a board whose reverse target satisfies every
 * visible mark: it is the mirror the game would otherwise fight, and it is
 * broken, if at all, only by a hidden gap. Absolute difference is symmetric, so
 * this is the ordering family's one live symmetry.
 */
export function passesSymmetry(target: readonly number[], marks: readonly (number | null)[]): boolean {
  const reversed = [...target].reverse();
  return !satisfiesVisible(reversed, marks);
}

/** One attempt through every screen but the band. Null with the reason it was
 *  dropped, or the finished puzzle carrying its par and difficulty. */
export function attempt(draw: Draw, puzzleNumber: number, tally: Tally): DifferenceRelayPuzzle | null {
  const candidate = drawCandidate(draw);
  if (typeof candidate === "string") {
    tally[candidate] += 1;
    return null;
  }
  if (!passesSymmetry(candidate.target, candidate.marks)) {
    tally.symmetry += 1;
    return null;
  }
  const made = makePuzzle(puzzleNumber, candidate.target, candidate.marks, candidate.startOrder, candidate.levers);
  if (!made.ok) {
    /* makePuzzle's three refusals map to the three screens it runs. */
    if (made.error.detail.includes("visible marks alone")) tally.decomposition += 1;
    else if (made.error.detail.includes("no guess model")) tally.fairness += 1;
    else tally.uniqueness += 1;
    return null;
  }
  return made.value;
}

export interface GeneratedDay {
  readonly puzzle: DifferenceRelayPuzzle;
  /** Attempts consumed from this puzzle's stream before the accepted one. */
  readonly attempt: number;
}

/** A manifest day: one stream per puzzle, no salts, the attempt count recorded. */
export function generateForPuzzle(puzzleNumber: number, draw: Draw, tally: Tally = emptyTally()): GeneratedDay | null {
  const wanted = bandForPuzzle(puzzleNumber);
  for (let index = 0; index < ATTEMPT_CEILING; index += 1) {
    const puzzle = attempt(draw, puzzleNumber, tally);
    if (puzzle === null) continue;
    if (bandOf(puzzle.difficulty) !== wanted) {
      tally.band += 1;
      continue;
    }
    tally.accepted += 1;
    return { puzzle, attempt: index };
  }
  return null;
}

/** Past the horizon: every screen but the band, so an unlucky stream cannot loop. */
export function generateUnrated(puzzleNumber: number, draw: Draw, ceiling = FALLBACK_ATTEMPTS): DifferenceRelayPuzzle | null {
  const tally = emptyTally();
  for (let index = 0; index < ceiling; index += 1) {
    const puzzle = attempt(draw, puzzleNumber, tally);
    if (puzzle !== null) return puzzle;
  }
  return null;
}

/**
 * The tutorial board, fixed. A `range-wide` set with one hidden gap whose
 * visible marks leave three orders and a par of one; the generator tests assert
 * it sits in the Monday band rather than trust this comment.
 */
export const FIRST_SESSION: { readonly target: readonly number[]; readonly marks: readonly (number | null)[]; readonly startOrder: readonly number[] } = {
  target: [6, 9, 7, 2, 1, 5],
  marks: [3, 2, null, null, 4],
  startOrder: [7, 1, 9, 6, 2, 5],
};

export function firstSessionPuzzle(): DifferenceRelayPuzzle {
  const made = makePuzzle(0, FIRST_SESSION.target, FIRST_SESSION.marks, FIRST_SESSION.startOrder, ["first-session"]);
  if (!made.ok) throw new Error(`the first session board is not a puzzle: ${made.error.detail}`);
  return made.value;
}
