/** Node only. Generates, bands, and verifies Poker Grid manifest chunks. */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { seedFor } from "../src/core/seed.js";
import { rngFromSeed } from "../src/core/seed.js";
import { dateForPuzzleNumber, type CivilDate } from "../src/core/date.js";
import { generatePuzzle, isValidBoard, leversFor, weekdayFor, type Lever } from "../src/games/poker-grid/generator.js";
import { legalMoves, playGreedy } from "../src/games/poker-grid/greedy.js";
import { encodeBoard, MANIFEST_CODEC } from "../src/games/poker-grid/manifest-codec.js";
import { solve, DEFAULT_BEAM_WIDTH, DEFAULT_EXACT_CEILING } from "../src/games/poker-grid/solver.js";

const EPOCH: CivilDate = { year: 2026, month: 1, day: 1 };
const DEFAULT_HORIZON = 365;
const OUTPUT_DIR = "data/poker-grid";

/* Requirement 6.3.4. Difficulty is the fraction of best known score that the
   naive greedy player leaves behind, averaged over GREEDY_TRIALS runs.

   The mean and not the median, which is not a detail. Greedy either strands a
   hand on a board or it does not, so its median outcome is bimodal: measured
   over eighty boards the median gap is 0.148 at the twenty fifth percentile
   and 0.160 at the seventy fifth, which cannot express a weekly curve at all.
   The mean over nine runs reads how often greedy strands rather than whether
   it usually does, and spreads smoothly from 0.10 to 0.25 across the same
   boards. The first version of these bands was built on the median and
   produced five consecutive days with a median difficulty of 0.149, which is
   a flat week wearing a curve's clothing.

   Monday is the gentlest day and Saturday the hardest. Sunday sits between
   Thursday and Friday, matching the long Sunday convention rather than the
   ramp. Each band is set to admit roughly a fifth of candidate boards. */
export const GREEDY_TRIALS = 9;
/* Candidates are screened with a narrow beam and only the survivor pays for
   the wide one, because most of a generation run is boards being thrown away
   and a rejected board never has its score stored. */
export const SCREEN_BEAM_WIDTH = 100;
export const DIFFICULTY_BANDS: readonly { readonly min: number; readonly max: number }[] = [
  { min: 0.160, max: 0.210 }, /* Sunday */
  { min: 0.050, max: 0.130 }, /* Monday */
  { min: 0.080, max: 0.145 }, /* Tuesday */
  { min: 0.120, max: 0.170 }, /* Wednesday */
  { min: 0.145, max: 0.195 }, /* Thursday */
  { min: 0.180, max: 0.235 }, /* Friday */
  { min: 0.210, max: 0.340 }, /* Saturday */
];

/* Requirement 6.3.5. */
export const MIN_BEST_HANDS = 6;
export const MIN_OPENING_MOVES = 50;
/* Friday and Saturday reject the easy cluster on purpose, and about one board
   in eight clears their floor, so a day needing twenty attempts is ordinary
   and a day needing sixty is unlucky rather than broken. A rejected candidate
   costs a third of a second, so the ceiling is set where an unlucky day costs
   half a minute instead of failing the run. */
export const MAX_ATTEMPTS = 96;

export interface GeneratedEntry {
  readonly number: number;
  readonly board: string;
  readonly best: { readonly score: number; readonly hands: number; readonly method: "exact" | "beam"; readonly width?: number };
  readonly levers: readonly Lever[];
  /* The salt that produced this board. Attempt 0 is what an offline client
     reproduces past the horizon, so any entry with a higher attempt is a board
     only the manifest knows. */
  readonly attempt: number;
  readonly weekday: number;
  readonly difficulty: number;
  /* Integers, so verification reproduces the difficulty exactly rather than
     within a tolerance chosen to hide a drift. */
  readonly greedyTotal: number;
  readonly greedyMedian: number;
  readonly openings: number;
}

export interface ManifestChunk {
  readonly game: "poker-grid";
  readonly codec: string;
  readonly month: string;
  readonly from: number;
  readonly to: number;
  readonly boards: readonly GeneratedEntry[];
}

export type RejectionReason = "no-opening-move" | "too-few-openings" | "strands-cards" | "below-band" | "above-band";

function monthForPuzzle(number: number): string {
  const date = dateForPuzzleNumber(EPOCH, number);
  return `${date.year}-${String(date.month).padStart(2, "0")}`;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] as number;
  return ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

export function saltFor(attempt: number): string | undefined {
  return attempt === 0 ? undefined : `retry-${attempt}`;
}

export interface Candidate {
  readonly entry: GeneratedEntry | null;
  readonly reason: RejectionReason | null;
}

/* One attempt at one day. Returns the entry or the reason it was thrown away,
   so the run can report why a day was hard to fill instead of silently
   looping. */
export function evaluateCandidate(number: number, attempt: number): Candidate {
  const salt = saltFor(attempt);
  const seed = salt === undefined ? seedFor("poker-grid", number) : seedFor("poker-grid", number, salt);
  const puzzle = generatePuzzle(number, seed);
  if (!isValidBoard(puzzle.cells)) throw new Error(`puzzle ${number} attempt ${attempt} produced an invalid board`);

  const openings = legalMoves(puzzle.cells).length;
  if (openings === 0) return { entry: null, reason: "no-opening-move" };
  if (openings < MIN_OPENING_MOVES) return { entry: null, reason: "too-few-openings" };

  const weekday = weekdayFor(number);
  const band = DIFFICULTY_BANDS[weekday] as { min: number; max: number };
  const trials = Array.from({ length: GREEDY_TRIALS }, (_, trial) =>
    playGreedy(puzzle.cells, rngFromSeed(seedFor("poker-grid", number, `greedy-${attempt}-${trial}`))).score);
  const greedyTotal = trials.reduce((sum, score) => sum + score, 0);
  const greedyMean = greedyTotal / GREEDY_TRIALS;
  const greedyMedian = median(trials);

  const screen = solve(puzzle.cells, { exactCeiling: 1, beamWidth: SCREEN_BEAM_WIDTH });
  if (screen.hands < MIN_BEST_HANDS) return { entry: null, reason: "strands-cards" };
  const screened = (screen.score - greedyMean) / screen.score;
  if (screened < band.min) return { entry: null, reason: "below-band" };
  if (screened > band.max) return { entry: null, reason: "above-band" };

  /* The survivor gets the real search, and the band is checked again against
     it, so a stored difficulty is always the difficulty of the stored score. */
  const best = solve(puzzle.cells, { exactCeiling: DEFAULT_EXACT_CEILING, beamWidth: DEFAULT_BEAM_WIDTH });
  if (best.hands < MIN_BEST_HANDS) return { entry: null, reason: "strands-cards" };
  const difficulty = (best.score - greedyMean) / best.score;
  if (difficulty < band.min) return { entry: null, reason: "below-band" };
  if (difficulty > band.max) return { entry: null, reason: "above-band" };

  const entry: GeneratedEntry = {
    number,
    board: encodeBoard(number, puzzle.cells),
    best,
    levers: leversFor(number),
    attempt,
    weekday,
    difficulty: Number(difficulty.toFixed(6)),
    greedyTotal,
    greedyMedian,
    openings,
  };
  return { entry, reason: null };
}

export function generateEntry(number: number): { readonly entry: GeneratedEntry; readonly rejected: Readonly<Record<string, number>> } {
  const rejected: Record<string, number> = {};
  for (let attempt = 0; attempt < MAX_ATTEMPTS; attempt += 1) {
    const candidate = evaluateCandidate(number, attempt);
    if (candidate.entry !== null) return { entry: candidate.entry, rejected };
    const reason = candidate.reason as RejectionReason;
    rejected[reason] = (rejected[reason] ?? 0) + 1;
  }
  throw new Error(`puzzle ${number} found no board inside its band in ${MAX_ATTEMPTS} attempts: ${JSON.stringify(rejected)}`);
}

function writeChunk(month: string, boards: readonly GeneratedEntry[]): string {
  const path = `${OUTPUT_DIR}/manifest.${month}.json`;
  const chunk: ManifestChunk = {
    game: "poker-grid",
    codec: MANIFEST_CODEC,
    month,
    from: boards[0]?.number ?? 0,
    to: boards[boards.length - 1]?.number ?? 0,
    boards,
  };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(chunk, null, 2)}\n`, "utf8");
  return path;
}

export function generateManifest(from = 1, to = DEFAULT_HORIZON, horizon = DEFAULT_HORIZON): void {
  if (!Number.isInteger(from) || from < 1) throw new RangeError("from must be a positive integer");
  if (!Number.isInteger(to) || to < from) throw new RangeError("to must not precede from");
  const rejections: Record<string, number> = {};
  const written: { month: string; from: number; to: number }[] = [];
  const started = Date.now();

  /* Chunks are written as each month closes rather than at the end, so a run
     that dies on day 170 leaves five usable months behind and resumes with
     POKER_GRID_FROM instead of starting over. A generation run is long enough
     that losing it whole is a real cost. */
  let openMonth = "";
  let openBoards: GeneratedEntry[] = [];
  const closeMonth = (): void => {
    if (openBoards.length === 0) return;
    writeChunk(openMonth, openBoards);
    written.push({ month: openMonth, from: openBoards[0]?.number ?? 0, to: openBoards[openBoards.length - 1]?.number ?? 0 });
    openBoards = [];
  };

  for (let number = from; number <= to; number += 1) {
    const month = monthForPuzzle(number);
    if (month !== openMonth) {
      closeMonth();
      openMonth = month;
    }
    const { entry, rejected } = generateEntry(number);
    for (const [reason, count] of Object.entries(rejected)) rejections[reason] = (rejections[reason] ?? 0) + count;
    openBoards.push(entry);
    process.stdout.write(`${number} wd${entry.weekday} attempt ${entry.attempt} difficulty ${(entry.difficulty * 100).toFixed(1)}% best ${entry.best.score}/${entry.best.hands} ${entry.best.method}\n`);
  }
  closeMonth();

  if (from === 1 && to >= horizon) writeIndex(horizon, written);
  process.stdout.write(`wrote ${to - from + 1} boards in ${written.length} chunks in ${Math.round((Date.now() - started) / 1000)}s, rejections ${JSON.stringify(rejections)}\n`);
}

/* The index is written from whatever chunks exist, so a partial run can be
   completed by a later run without the index claiming days that are missing. */
export function writeIndex(horizon = DEFAULT_HORIZON, months: readonly { readonly month: string; readonly from: number; readonly to: number }[]): void {
  const index = {
    game: "poker-grid",
    codec: MANIFEST_CODEC,
    epoch: EPOCH,
    horizon,
    beamWidth: DEFAULT_BEAM_WIDTH,
    exactCeiling: DEFAULT_EXACT_CEILING,
    chunks: months.map(({ month, from, to }) => ({ month, from, to, url: `/${OUTPUT_DIR}/manifest.${month}.json` })),
  };
  writeFileSync(`${OUTPUT_DIR}/manifest.index.json`, `${JSON.stringify(index, null, 2)}\n`, "utf8");
}

if (process.argv[1]?.endsWith("generate.ts")) {
  const from = Number(process.env["POKER_GRID_FROM"] ?? 1);
  const to = Number(process.env["POKER_GRID_TO"] ?? process.env["POKER_GRID_HORIZON"] ?? DEFAULT_HORIZON);
  generateManifest(from, to, Number(process.env["POKER_GRID_HORIZON"] ?? DEFAULT_HORIZON));
}

export { DEFAULT_HORIZON, EPOCH, OUTPUT_DIR };
