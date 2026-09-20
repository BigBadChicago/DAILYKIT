/**
 * Layer 4. PANGRAM generation. PANGRAM.md sections 6, 7, 11, 14 and 15.
 *
 * Rejection sampling, one RNG stream per puzzle, no salts, the seam every v3
 * game uses. Each attempt draws a seven letter set from the sorted pangram
 * roots and a centre among its letters, solves the day exactly, and screens it.
 * Node only: the module never imports this file, because the browser holds no
 * dictionary and so cannot generate a day (PANGRAM.md 26).
 */

import { COUNT_MAX, COUNT_MIN, EXCLUDED_LETTER, FAMILIAR_SHARE_MIN } from "./letters.js";
import { bandForPuzzle, bandOf } from "./bands.js";
import { makePuzzle, type PangramPuzzle } from "./rules.js";
import { familiarShareMeets, indexWords, pangramRoots, solveDay, type WordIndex } from "./solver.js";

/** The only randomness this file consumes. Matches core/rng's integer helper. */
export interface Draw {
  intBelow(bound: number): number;
}

/** Attempts one manifest day may consume before it is reported unfillable. */
export const ATTEMPT_CEILING = 20000;

export type RejectReason = "count" | "fairness" | "reused" | "band";
export type Tally = Record<RejectReason | "accepted", number>;

export function emptyTally(): Tally {
  return { count: 0, fairness: 0, reused: 0, band: 0, accepted: 0 };
}

export interface GenContext {
  readonly index: WordIndex;
  /** Every drawable set, alphabetical strings, sorted. */
  readonly roots: readonly string[];
}

export function contextFromLists(accepted: readonly string[], familiar: readonly string[]): GenContext {
  const index = indexWords(accepted, familiar);
  return { index, roots: pangramRoots(index, EXCLUDED_LETTER) };
}

const VOWELS = "aeiou";

/** Audit labels only, PANGRAM.md 6a: the draw is uniform and the band screen
 *  alone decides the day. */
export function leversFor(centre: string, pangrams: number): string[] {
  return [`centre-${VOWELS.includes(centre) ? "vowel" : "consonant"}`, `pangrams-${String(pangrams)}`, "no-s"];
}

/**
 * One attempt: a set and a centre, solved and screened for count and fairness.
 * Null with the reason counted, or the finished puzzle. Band and reuse are the
 * caller's screens, so the calibration study can pool every screened day.
 */
export function attempt(context: GenContext, puzzleNumber: number, draw: Draw, tally: Tally): PangramPuzzle | null {
  const letters = context.roots[draw.intBelow(context.roots.length)] as string;
  const centre = letters[draw.intBelow(letters.length)] as string;
  const solution = solveDay(context.index, letters, centre);
  if (solution.answers.length < COUNT_MIN || solution.answers.length > COUNT_MAX) {
    tally.count += 1;
    return null;
  }
  if (!solution.familiarPangram || !familiarShareMeets(solution, FAMILIAR_SHARE_MIN)) {
    tally.fairness += 1;
    return null;
  }
  const made = makePuzzle(puzzleNumber, letters, centre, solution.answers, leversFor(centre, solution.pangrams));
  if (!made.ok) {
    /* Both screens above already hold, so a refusal is a construction fault. */
    tally.count += 1;
    return null;
  }
  return made.value;
}

export interface GeneratedDay {
  readonly puzzle: PangramPuzzle;
  /** Attempts consumed from this puzzle's stream before the accepted one. */
  readonly attempt: number;
}

/**
 * A manifest day. `usedRoots` holds the sets already shipped: the same seven
 * letters with another centre is the same letters on the board and a heavily
 * overlapping answer list, so it counts as a repeat (PANGRAM.md 13a).
 */
export function generateForPuzzle(
  context: GenContext,
  puzzleNumber: number,
  draw: Draw,
  tally: Tally = emptyTally(),
  usedRoots: ReadonlySet<string> = new Set(),
): GeneratedDay | null {
  const wanted = bandForPuzzle(puzzleNumber);
  for (let index = 0; index < ATTEMPT_CEILING; index += 1) {
    const puzzle = attempt(context, puzzleNumber, draw, tally);
    if (puzzle === null) continue;
    if (usedRoots.has(puzzle.letters)) {
      tally.reused += 1;
      continue;
    }
    if (bandOf(puzzle.difficulty) !== wanted) {
      tally.band += 1;
      continue;
    }
    tally.accepted += 1;
    return { puzzle, attempt: index };
  }
  return null;
}
