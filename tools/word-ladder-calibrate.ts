/**
 * Calibrates WORD LADDER difficulty bands. Runs in the container never in the
 * browser. WORD-LADDER.md 14 and 15.
 *
 *   npx tsx tools/word-ladder-calibrate.ts --seeds 400 --out data/word-ladder
 *
 * It draws screened boards, every screen but the band, across the whole par
 * window and every weekday's levers, pools their search ball, and takes the six
 * septiles as BAND_EDGES. It also records the par distribution and the rejection
 * accounting. The band edges it prints are what generator.ts BAND_EDGES must hold;
 * a change is a manifest regeneration, so the tool prints the diff loudly.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { argv, stdout } from "node:process";

import { intBelow } from "../src/core/rng.js";
import { rngFromSeed, seedFor } from "../src/core/seed.js";
import {
  BAND_EDGES,
  attemptFrom,
  emptyTally,
  type Draw,
  type Tally,
} from "../src/games/word-ladder/generator.js";
import { buildContext, loadList, ACCEPTED_PATH } from "./word-ladder-generate.js";

const GAME_ID = "word-ladder";

function flag(name: string, fallback: string): string {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && at + 1 < argv.length ? (argv[at + 1] as string) : fallback;
}

function septiles(values: readonly number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const edges: number[] = [];
  for (let k = 1; k <= 6; k += 1) {
    const at = Math.floor((sorted.length * k) / 7);
    edges.push(sorted[Math.min(at, sorted.length - 1)] as number);
  }
  return edges;
}

function bandOfWith(edges: readonly number[], difficulty: number): number {
  let band = 0;
  while (band < edges.length && difficulty > (edges[band] as number)) band += 1;
  return band;
}

/** Draws a screened board across the full par window, ignoring the weekday lever
 *  so the pooled sample spans every difficulty a real day could draw. Uses a
 *  puzzle number whose weekday floor is the most permissive (Wednesday, par 4 to
 *  7, no detour floor) so nothing is excluded from the calibration pool. */
const PERMISSIVE_PUZZLE = 3; // Wednesday: par 4..7, detour floor 0.

function main(): void {
  const seeds = Number(flag("seeds", "400"));
  const outDir = flag("out", "data/word-ladder");
  const context = buildContext();
  const pool = loadList(ACCEPTED_PATH);

  const balls: number[] = [];
  const parCounts: Record<number, number> = {};
  const tally: Tally = emptyTally();
  const started = Date.now();

  for (let seed = 0; seed < seeds; seed += 1) {
    const rng = rngFromSeed(seedFor(GAME_ID, seed + 1, "calibrate"));
    const draw: Draw = { intBelow: (bound: number): number => intBelow(rng, bound) };
    /* Draw a start uniformly from the accepted pool and run one attempt through
       every screen but the band, across the full permissive window. */
    const start = pool[intBelow(rng, pool.length)] as string;
    const puzzle = attemptFrom(context, PERMISSIVE_PUZZLE, start, draw, tally);
    if (puzzle === null) continue;
    tally.accepted += 1;
    balls.push(puzzle.difficulty);
    parCounts[puzzle.par] = (parCounts[puzzle.par] ?? 0) + 1;
  }

  const edges = septiles(balls);
  const bandCounts = new Array<number>(edges.length + 1).fill(0);
  for (const ball of balls) {
    const band = bandOfWith(edges, ball);
    bandCounts[band] = (bandCounts[band] as number) + 1;
  }

  mkdirSync(outDir, { recursive: true });
  const study = {
    seeds,
    total: seeds,
    screened: balls.length,
    acceptance: Number(((balls.length / seeds) * 100).toFixed(2)),
    bandEdges: edges,
    bandCounts,
    parCounts,
    rejections: tally,
  };
  writeFileSync(`${outDir}/study.json`, `${JSON.stringify(study, null, 2)}\n`);

  stdout.write(`\n${String(balls.length)} screened boards from ${String(seeds)} seeds in ${String(Date.now() - started)} ms\n`);
  stdout.write(`search-ball septiles (candidate BAND_EDGES): ${edges.join(", ")}\n`);
  stdout.write(`generator.ts BAND_EDGES:                      ${BAND_EDGES.join(", ")}\n`);
  if (JSON.stringify(edges) !== JSON.stringify([...BAND_EDGES])) {
    stdout.write("WARNING: septiles differ from BAND_EDGES; regenerate the manifest after updating BAND_EDGES\n");
  }
  stdout.write(`band counts: ${bandCounts.join(", ")}\n`);
  stdout.write(`par counts: ${JSON.stringify(parCounts)}\n`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/word-ladder-calibrate.ts")) main();
