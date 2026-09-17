/**
 * Layer 4. POKER GRID's emergent integer difficulty. ARCHITECTURE2 sections 9
 * and 52 risk 2.
 *
 * This is the one game whose difficulty is half measured and half read, and it
 * is stated here rather than left to be discovered.
 *
 * The measure is generation decision 7: how far the naive greedy player falls
 * short of best known play, averaged over nine seeded runs. The greedy half is
 * cheap, a few thousand allocation free classifications per run, so the module
 * replays it rather than trusting the manifest's copy of it. The denominator is
 * `best.score`, a width 400 beam over seven plies, which costs the CI job over
 * an hour for a year and is not work a phone can do. No extraction makes it
 * cheaper, which is the difference from CIPHER, where the expensive thing was a
 * 1.7 megabyte table sitting on a measure that was cheap underneath.
 *
 * So the numerator is measured and the denominator is read. Two things keep
 * risk 2 closed anyway. `PokerPuzzle` carries no difficulty field at all, so
 * `parsePuzzle` cannot read the stored number even by accident; and
 * `tools/verify.ts` re-derives `best.score` with its own solver replay and
 * re-derives `greedyTotal` from the recorded attempt, so a generator that
 * drifted from the measure fails verification rather than shipping a band claim
 * nobody checked.
 *
 * The result is basis points rather than a fraction because section 9 wants an
 * integer, and because integer inputs make Node and the browser agree exactly
 * rather than within a tolerance chosen to hide a drift.
 *
 * This file is also the one home of the greedy salt. It was spelled out twice,
 * in tools/generate.ts and tools/verify.ts, and a third copy in the module
 * would have been the drift phase 2 removed from VECTOR's intensity.
 */

import { rngFromSeed, seedFor } from "../../core/seed.js";
import type { PuzzleNumber } from "../../core/types.js";
import type { PokerBest, PokerPuzzle } from "./generator.js";
import { playGreedy } from "./greedy.js";

export const GAME_ID = "poker-grid";

/**
 * Nine, and the mean rather than the median. Generation decision 7: greedy
 * either strands a hand on a board or it does not, so its median is bimodal and
 * cannot express a weekly curve, while the mean over nine runs reads how often
 * it strands and spreads smoothly.
 */
export const GREEDY_TRIALS = 9;

/** Basis points. 0.10 to 0.25 becomes 1000 to 2500, which is far more distinct
 *  values than seven bands need. */
export const DIFFICULTY_SCALE = 10_000;

/**
 * Past the manifest horizon there is no stored optimum, so there is no
 * denominator and there is no difficulty. This is the numeric sibling of a null
 * tier and of tiers.UNRATED_LABEL: a real number there would be a grade the
 * player cannot check. Asserted never to appear on a manifest entry.
 */
export const UNRATED_DIFFICULTY = -1;

/** The salt the nine greedy runs are drawn under. The board attempt is part of
 *  it, so a board only the manifest knows still reproduces its own runs. */
export function greedySaltFor(attempt: number, trial: number): string {
  return `greedy-${String(attempt)}-${String(trial)}`;
}

/** The nine scores, in trial order. Exported so a test can show the total is a
 *  sum of real runs rather than a number that happens to match. */
export function greedyScores(
  puzzleNumber: PuzzleNumber,
  cells: readonly number[],
  attempt: number,
): readonly number[] {
  const scores: number[] = [];
  for (let trial = 0; trial < GREEDY_TRIALS; trial += 1) {
    const seed = seedFor(GAME_ID, puzzleNumber, greedySaltFor(attempt, trial));
    scores.push(playGreedy(cells, rngFromSeed(seed)).score);
  }
  return scores;
}

export function greedyTotalFor(
  puzzleNumber: PuzzleNumber,
  cells: readonly number[],
  attempt: number,
): number {
  let total = 0;
  for (const score of greedyScores(puzzleNumber, cells, attempt)) total += score;
  return total;
}

/**
 * Integer arithmetic to the last step. The numerator peaks around eighty
 * million against a safe integer ceiling of nine quadrillion, so nothing here
 * can lose a bit, and the single division plus Math.round is defined exactly by
 * ECMAScript on both engines.
 *
 * A negative result means the greedy player beat the stored beam. The weekday
 * band floors make that impossible on a scheduled board, and it is left
 * unclamped so that if it ever appears it is visible rather than flattened to
 * zero.
 */
export function difficultyFrom(bestScore: number, greedyTotal: number): number {
  if (!Number.isInteger(bestScore) || bestScore <= 0) return UNRATED_DIFFICULTY;
  if (!Number.isInteger(greedyTotal) || greedyTotal < 0) return UNRATED_DIFFICULTY;
  const denominator = GREEDY_TRIALS * bestScore;
  return Math.round((DIFFICULTY_SCALE * (denominator - greedyTotal)) / denominator);
}

function measure(puzzle: PokerPuzzle): number {
  const best: PokerBest | null = puzzle.best;
  if (best === null) return UNRATED_DIFFICULTY;
  /* The tutorial board is puzzle number zero, which seedFor refuses, and it
     also has no best. The best check above is what keeps that unreachable, so
     this guard is the belt to its braces rather than a second rule. */
  if (!Number.isSafeInteger(puzzle.number) || puzzle.number < 1) return UNRATED_DIFFICULTY;
  return difficultyFrom(best.score, greedyTotalFor(puzzle.number, puzzle.cells, puzzle.attempt));
}

/* One entry, keyed on the puzzle object rather than its number, so a second
   puzzle with the same number never reads the first one's answer.

   The measure is tens of milliseconds and `inspect` short circuits on a board
   that is not terminal, so the replay only ever runs at the end of a game. It
   still runs once per end screen, share and stats panel open, which is several
   times for one board, and this is the difference between paying for that once
   and paying for it every time. Referentially transparent: the same puzzle
   always produces the same number, memo or no memo. */
let memoPuzzle: PokerPuzzle | null = null;
let memoValue: number = UNRATED_DIFFICULTY;

export function difficultyOf(puzzle: PokerPuzzle): number {
  if (memoPuzzle === puzzle) return memoValue;
  const value = measure(puzzle);
  memoPuzzle = puzzle;
  memoValue = value;
  return value;
}

/** Tests only. Nothing in the shell calls it; it exists so a test can prove the
 *  memo is a cache and not the source of the answer. */
export function resetDifficultyMemo(): void {
  memoPuzzle = null;
  memoValue = UNRATED_DIFFICULTY;
}
