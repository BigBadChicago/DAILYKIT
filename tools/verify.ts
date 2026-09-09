/** Node only. Replays a manifest and asserts every claim it makes. */

import { readFileSync, readdirSync } from "node:fs";
import { rngFromSeed, seedFor } from "../src/core/seed.js";
import { generatePuzzle, isValidBoard, leversFor, weekdayFor } from "../src/games/poker-grid/generator.js";
import { legalMoves, playGreedy } from "../src/games/poker-grid/greedy.js";
import { decodeBoard, MANIFEST_CODEC } from "../src/games/poker-grid/manifest-codec.js";
import { BOARD_CELLS } from "../src/games/poker-grid/rules.js";
import { CLEAR_VALUE_PER_HAND, HAND_POINTS_CEILING, HAND_POINTS_FLOOR } from "../src/games/poker-grid/scoring.js";
import { solve, DEFAULT_BEAM_WIDTH } from "../src/games/poker-grid/solver.js";
import { DIFFICULTY_BANDS, GREEDY_TRIALS, MIN_BEST_HANDS, MIN_OPENING_MOVES, OUTPUT_DIR, saltFor, type GeneratedEntry, type ManifestChunk } from "./generate.js";

export type { GeneratedEntry, ManifestChunk } from "./generate.js";
import { entriesOf } from "./generate.js";

export interface VerifyOptions {
  /* Replaying the solver on every board doubles the cost of the job, so CI
     runs it and a local spot check can skip it. Everything else is cheap and
     always runs. */
  readonly replaySolver?: boolean;
}

function median(values: readonly number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  if (sorted.length % 2 === 1) return sorted[middle] as number;
  return ((sorted[middle - 1] as number) + (sorted[middle] as number)) / 2;
}

export function verifyEntry(entry: GeneratedEntry, options: VerifyOptions = {}): void {
  const where = `puzzle ${entry.number}`;
  const cells = decodeBoard(entry.number, entry.board);
  if (cells === null) throw new Error(`${where}: board does not decode`);
  if (cells.length !== BOARD_CELLS) throw new Error(`${where}: wrong cell count`);
  if (!isValidBoard(cells)) throw new Error(`${where}: board is not 35 distinct cards`);

  /* The board must be the one the recorded seed produces, which is what makes
     the manifest reproducible rather than merely plausible. */
  const salt = saltFor(entry.attempt);
  const seed = salt === undefined ? seedFor("poker-grid", entry.number) : seedFor("poker-grid", entry.number, salt);
  const regenerated = generatePuzzle(entry.number, seed).cells;
  if (regenerated.join(",") !== cells.join(",")) throw new Error(`${where}: board does not match its recorded seed and attempt`);

  if (entry.weekday !== weekdayFor(entry.number)) throw new Error(`${where}: weekday does not match the epoch`);
  if (leversFor(entry.number).join(",") !== entry.levers.join(",")) throw new Error(`${where}: levers do not match the weekday`);

  const openings = legalMoves(cells).length;
  if (openings !== entry.openings) throw new Error(`${where}: opening count is ${openings}, manifest says ${entry.openings}`);
  if (openings < MIN_OPENING_MOVES) throw new Error(`${where}: only ${openings} opening moves`);

  if (entry.best.hands < MIN_BEST_HANDS) throw new Error(`${where}: best play strands too many cards`);
  const floor = entry.best.hands * (CLEAR_VALUE_PER_HAND + HAND_POINTS_FLOOR);
  const ceiling = entry.best.hands * (CLEAR_VALUE_PER_HAND + HAND_POINTS_CEILING);
  if (entry.best.score < floor || entry.best.score > ceiling) throw new Error(`${where}: stored score ${entry.best.score} is impossible for ${entry.best.hands} hands`);
  if (entry.best.method === "beam" && entry.best.width === undefined) throw new Error(`${where}: a beam score must carry its width`);
  if (entry.best.method === "exact" && entry.best.width !== undefined) throw new Error(`${where}: an exact score must not carry a width`);

  const band = DIFFICULTY_BANDS[entry.weekday] as { min: number; max: number };
  if (entry.difficulty < band.min || entry.difficulty > band.max) {
    throw new Error(`${where}: difficulty ${entry.difficulty} is outside the weekday band ${band.min} to ${band.max}`);
  }
  const claimed = (entry.best.score - entry.greedyTotal / GREEDY_TRIALS) / entry.best.score;
  if (Math.abs(claimed - entry.difficulty) > 1e-6) throw new Error(`${where}: difficulty does not follow from the stored scores`);

  const trials = Array.from({ length: GREEDY_TRIALS }, (_, trial) =>
    playGreedy(cells, rngFromSeed(seedFor("poker-grid", entry.number, `greedy-${entry.attempt}-${trial}`))).score);
  if (trials.reduce((sum, score) => sum + score, 0) !== entry.greedyTotal) throw new Error(`${where}: greedy runs do not reproduce`);
  if (median(trials) !== entry.greedyMedian) throw new Error(`${where}: greedy median does not reproduce`);

  if (options.replaySolver === true) {
    const replay = solve(cells, { exactCeiling: 1, beamWidth: entry.best.width ?? DEFAULT_BEAM_WIDTH });
    if (entry.best.method === "beam" && replay.score !== entry.best.score) {
      throw new Error(`${where}: beam replay scored ${replay.score} against a stored ${entry.best.score}`);
    }
    if (entry.best.method === "exact" && replay.score > entry.best.score) {
      throw new Error(`${where}: an exact score was beaten by a beam replay`);
    }
  }
}

export function verifyChunk(chunk: ManifestChunk, options: VerifyOptions = {}): number {
  if (chunk.codec !== MANIFEST_CODEC) throw new Error(`${chunk.month}: unknown codec ${chunk.codec}`);
  const boards = entriesOf(chunk);
  let previous = chunk.from - 1;
  for (const entry of boards) {
    if (entry.number !== previous + 1) throw new Error(`${chunk.month}: puzzle numbers are not contiguous at ${entry.number}`);
    previous = entry.number;
    verifyEntry(entry, options);
  }
  if (previous !== chunk.to) throw new Error(`${chunk.month}: chunk ends at ${previous} but claims ${chunk.to}`);
  return boards.length;
}

export function verifyDirectory(directory = OUTPUT_DIR, options: VerifyOptions = {}): number {
  const files = readdirSync(directory).filter((name) => /^manifest\.\d{4}-\d{2}\.json$/.test(name)).sort();
  let checked = 0;
  let expected = 1;
  for (const file of files) {
    const chunk = JSON.parse(readFileSync(`${directory}/${file}`, "utf8")) as ManifestChunk;
    if (chunk.from !== expected) throw new Error(`${file}: expected to start at ${expected}, starts at ${chunk.from}`);
    expected = chunk.to + 1;
    checked += verifyChunk(chunk, options);
  }
  if (checked === 0) throw new Error(`no manifest chunks found in ${directory}`);

  const index = JSON.parse(readFileSync(`${directory}/manifest.index.json`, "utf8")) as { horizon: number; codec: string; chunks: { month: string }[] };
  if (index.codec !== MANIFEST_CODEC) throw new Error("index codec does not match the build");
  if (index.horizon !== checked) throw new Error(`index claims a horizon of ${index.horizon} against ${checked} boards on disk`);
  if (index.chunks.length !== files.length) throw new Error("index chunk list does not match the chunks on disk");
  return checked;
}

if (process.argv[1]?.endsWith("verify.ts")) {
  const replaySolver = process.env["POKER_GRID_REPLAY_SOLVER"] === "1";
  process.stdout.write(`verified ${verifyDirectory(OUTPUT_DIR, { replaySolver })} boards${replaySolver ? " with a full solver replay" : ""}\n`);
}
