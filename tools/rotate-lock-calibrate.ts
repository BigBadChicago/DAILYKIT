/**
 * Measures ROTATE LOCK's difficulty distribution and writes the study behind
 * BAND_EDGES, PAR_FLOOR and PAR_CEILING. ROTATE-LOCK.md sections 8, 9 and 15.
 * Runs in CI never; its output is committed and a generator test recomputes the
 * head of the sample, so the study cannot silently disagree with the code.
 *
 *   npx tsx tools/rotate-lock-calibrate.ts --seeds 400 --out data/rotate-lock/study.json
 *
 * Every seed is one stream of ATTEMPTS_PER_SEED attempts through every screen but
 * the band. Changing an edge invalidates every stored band: paste the printed
 * edges into generator.ts, then regenerate and verify the horizon.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { argv, stdout } from "node:process";

import { intBelow } from "../src/core/rng.js";
import { rngFromSeed, seedFor } from "../src/core/seed.js";
import {
  BAND_EDGES,
  HIDDEN_TURNS,
  PAR_CEILING,
  PAR_FLOOR,
  attempt,
  bandOf,
  emptyTally,
  type Draw,
  type Tally,
} from "../src/games/rotate-lock/generator.js";
import type { RotateLockPuzzle } from "../src/games/rotate-lock/rules.js";

const GAME_ID = "rotate-lock";
export const CALIBRATION_SALT = "calibrate";
export const ATTEMPTS_PER_SEED = 300;
/** How many leading sample values the study keeps for the recompute test. */
export const SAMPLE_HEAD = 40;

function flag(name: string, fallback: string): string {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && at + 1 < argv.length ? (argv[at + 1] as string) : fallback;
}

export function calibrationDraw(seed: number): Draw {
  const rng = rngFromSeed(seedFor(GAME_ID, seed, CALIBRATION_SALT));
  return { intBelow: (bound: number): number => intBelow(rng, bound) };
}

/** The screened puzzles of one seed, in stream order. */
export function sampleSeed(seed: number, tally: Tally = emptyTally()): RotateLockPuzzle[] {
  const draw = calibrationDraw(seed);
  const out: RotateLockPuzzle[] = [];
  for (let index = 0; index < ATTEMPTS_PER_SEED; index += 1) {
    const puzzle = attempt(draw, 1, tally);
    if (puzzle !== null) out.push(puzzle);
  }
  return out;
}

/** Six strictly increasing edges cutting seven equal groups. bandOf climbs while
 *  the value exceeds an edge, so edge i is the value at quantile (i + 1) / 7. */
export function septileEdges(sorted: readonly number[]): number[] {
  const edges: number[] = [];
  for (let i = 1; i <= 6; i += 1) {
    const q = sorted[Math.floor((i / 7) * sorted.length)] as number;
    const last = edges[edges.length - 1];
    edges.push(last !== undefined && q <= last ? last + 1 : q);
  }
  return edges;
}

function histogram(values: readonly number[]): Record<string, number> {
  const out: Record<string, number> = {};
  for (const value of values) out[String(value)] = (out[String(value)] ?? 0) + 1;
  return out;
}

function main(): void {
  const seeds = Number(flag("seeds", "400"));
  const outPath = flag("out", "data/rotate-lock/study.json");
  const tally = emptyTally();
  const puzzles: RotateLockPuzzle[] = [];
  const started = Date.now();
  for (let seed = 1; seed <= seeds; seed += 1) puzzles.push(...sampleSeed(seed, tally));
  const elapsed = Date.now() - started;

  const values = puzzles.map((puzzle) => puzzle.difficulty);
  const sorted = [...values].sort((a, b) => a - b);
  const edges = septileEdges(sorted);
  const attempts = seeds * ATTEMPTS_PER_SEED;

  const perBand = new Array<number>(7).fill(0);
  const hiddenByBand = Array.from({ length: 7 }, () => new Array<number>(HIDDEN_TURNS.length).fill(0));
  for (const puzzle of puzzles) {
    let band = 0;
    while (band < edges.length && puzzle.difficulty > (edges[band] as number)) band += 1;
    perBand[band] = (perBand[band] as number) + 1;
    const hidden = Number((puzzle.levers[0] ?? "hidden-0").slice("hidden-".length));
    const row = hiddenByBand[band] as number[];
    row[hidden] = (row[hidden] as number) + 1;
  }
  const median = sorted[Math.floor(sorted.length / 2)] as number;
  const p95 = sorted[Math.floor(sorted.length * 0.95)] as number;

  const study = {
    game: GAME_ID,
    purpose:
      "Evidence behind BAND_EDGES, PAR_FLOOR and PAR_CEILING in src/games/rotate-lock/generator.ts. Changing an edge invalidates every stored band in the horizon.",
    sample: {
      seeds,
      attemptsPerSeed: ATTEMPTS_PER_SEED,
      salt: CALIBRATION_SALT,
      attempts,
      screened: puzzles.length,
      acceptancePercent: Number(((puzzles.length / attempts) * 100).toFixed(2)),
      rejections: tally,
    },
    stateSpace: {
      note: "Arrangements per day are 7! orders times 4^7 facings. Solver nodes are distinct partial routes, per screened day.",
      arrangementsPerDay: 5040 * 16384,
    },
    difficulty: {
      measure: "dead turns, ROTATE-LOCK.md 14",
      distinctValues: new Set(values).size,
      min: sorted[0] ?? 0,
      median,
      p95,
      max: sorted[sorted.length - 1] ?? 0,
      bandEdges: edges,
      screenedPerBand: perBand,
      hiddenTurnsPerBand: {
        note: "Rows are bands 0 to 6, columns hidden-0, hidden-1, hidden-2.",
        rows: hiddenByBand,
      },
      expectedDaysPerBand: [52, 52, 52, 53, 52, 52, 52],
    },
    par: {
      floor: PAR_FLOOR,
      ceiling: PAR_CEILING,
      histogram: histogram(puzzles.map((puzzle) => puzzle.par)),
    },
    sampleHead: values.slice(0, SAMPLE_HEAD),
  };

  mkdirSync(dirname(outPath), { recursive: true });
  writeFileSync(outPath, `${JSON.stringify(study, null, 2)}\n`);
  stdout.write(`${String(puzzles.length)} screened of ${String(attempts)} attempts in ${String(elapsed)} ms\n`);
  stdout.write(`BAND_EDGES: [${edges.join(", ")}]\n`);
  stdout.write(`per band: ${perBand.join(", ")}\n`);
  const current = BAND_EDGES.join(", ") === edges.join(", ") ? "matches" : "differs from";
  stdout.write(`the committed BAND_EDGES ${current} this study\n`);
  const bandCheck = puzzles.filter((puzzle) => bandOf(puzzle.difficulty) === 0).length;
  stdout.write(`band 0 under the committed edges: ${String(bandCheck)}\n`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/rotate-lock-calibrate.ts")) main();
