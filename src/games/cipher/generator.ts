/**
 * Layer 4. Seeded code construction and the weekday schedule.
 *
 * Browser safe on purpose: this file never imports the solver, because the
 * solver's precomputed table is 1.7 megabytes and belongs to Node. That is why
 * a day's difficulty and line length live in the manifest and not here, and why
 * a code generated past the horizon is unrated.
 */

import { intBelow, type Rng } from "../../core/rng.js";
import { rngFromSeed } from "../../core/seed.js";
import type { PuzzleNumber, Seed } from "../../core/types.js";
import { CODE_LENGTH, SYMBOL_COUNT, isCode, type Code } from "./rules.js";

/**
 * The repetition shape of a code, recorded per manifest entry so difficulty can
 * be audited later. It is descriptive rather than prescriptive, which is a
 * change from PHASE-11-PLAN.md and is the measurement's doing: scheduling a
 * shape per weekday on top of a difficulty band leaves several weekdays with
 * fewer than the 52 codes a year needs, and two combinations with none at all.
 * CIPHER.md section 8.2 carries the table.
 */
export const LEVERS = ["all-distinct", "one-pair", "two-pairs", "triple"] as const;
export type CipherLever = (typeof LEVERS)[number];

export interface CipherBest {
  /** Codes still consistent after OPENING_GUESS. The difficulty integer. */
  readonly remaining: number;
  /** Guesses the fixed opening solver needs. At least four by the fairness floor. */
  readonly line: number;
}

export interface CipherPuzzle {
  readonly number: PuzzleNumber;
  readonly code: Code;
  readonly levers: readonly CipherLever[];
  /** Null past the manifest horizon, where nothing has solved this code. */
  readonly best: CipherBest | null;
}

/* CIPHER's epoch is 2026-01-05, the first Monday of the epoch year, so puzzle 1
   sits at index 1 of a week that starts on Sunday and day one lands in the
   gentlest band. Four days later than POKER GRID's 1 January, which is a per
   game epoch the contract has always allowed and which recorded conflict
   resolution 4 already accounts for at the suite level. */
export const WEEKDAY_OFFSET = 1;

export function weekdayFor(puzzleNumber: PuzzleNumber): number {
  return (puzzleNumber - 1 + WEEKDAY_OFFSET) % 7;
}

/**
 * Difficulty bands, as sets of class sizes rather than numeric windows.
 *
 * The fixed opening partitions the space into fourteen classes, so the
 * difficulty integer takes fourteen values and they are bunched: two of them
 * hold 40 percent of the space. A band sized as a share of the distribution
 * cannot be built on that, so a band names the classes it admits. Monday
 * gentle to Saturday hard, Sunday between Thursday and Friday, which is the
 * curve POKER GRID already sets. CIPHER.md section 8.1.
 */
const BANDS_BY_WEEKDAY: readonly (readonly number[])[] = [
  [182],           /* Sunday */
  [5, 20, 40, 44], /* Monday */
  [81],            /* Tuesday */
  [84],            /* Wednesday */
  [105],           /* Thursday */
  [222, 230],      /* Friday */
  [276],           /* Saturday */
];

export function bandFor(puzzleNumber: PuzzleNumber): readonly number[] {
  return BANDS_BY_WEEKDAY[weekdayFor(puzzleNumber)] as readonly number[];
}

export function inBand(puzzleNumber: PuzzleNumber, remaining: number): boolean {
  return bandFor(puzzleNumber).includes(remaining);
}

/** The fairness floor of CIPHER.md section 8, assertion 2. */
export const MIN_LINE = 4;

function symbolCounts(code: Code): readonly number[] {
  const counts = new Array<number>(SYMBOL_COUNT).fill(0);
  for (const symbol of code) counts[symbol as number] = (counts[symbol as number] as number) + 1;
  return counts.filter((count) => count > 0).sort((a, b) => b - a);
}

/** Every four symbol code has exactly one of the four shapes, so this is total
 *  and a day always records exactly one lever. */
export function leverOf(code: Code): CipherLever {
  const shape = symbolCounts(code).join("");
  if (shape === "1111") return "all-distinct";
  if (shape === "211") return "one-pair";
  if (shape === "22") return "two-pairs";
  if (shape === "31") return "triple";
  return "triple"; /* shape 4 is one symbol four times, the extreme of triple */
}

export function satisfiesLever(code: Code, lever: CipherLever): boolean {
  return leverOf(code) === lever;
}

function drawCode(rng: Rng): Code {
  const code: number[] = [];
  for (let slot = 0; slot < CODE_LENGTH; slot += 1) code.push(intBelow(rng, SYMBOL_COUNT));
  return code;
}

/** Deterministic from the seed alone, which is what makes attempt 0 the code an
 *  offline client reproduces past the horizon. */
export function generateCode(seed: Seed): Code {
  return drawCode(rngFromSeed(seed));
}

export function generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): CipherPuzzle {
  const code = generateCode(seed);
  return { number: puzzleNumber, code, levers: [leverOf(code)], best: null };
}

export function isValidPuzzleShape(puzzle: CipherPuzzle): boolean {
  return isCode(puzzle.code)
    && Number.isInteger(puzzle.number)
    && puzzle.number >= 1
    && puzzle.levers.length === 1
    && puzzle.levers.every((lever) => (LEVERS as readonly string[]).includes(lever));
}
