/**
 * Calibrates DIFFERENCE RELAY difficulty bands. Runs in CI never and in the
 * browser never. DIFFERENCE-RELAY.md 15 and 20.
 *
 *   npx tsx tools/difference-relay-calibrate.ts --seeds 400 --attempts 300 --out data/difference-relay
 *
 * It draws screened candidates, every screen but the band, pools their forced
 * deduction work, and takes the six septiles as BAND_EDGES. It also records the
 * par distribution and the rejection accounting of section 10.2.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { argv, stdout } from "node:process";

import { intBelow } from "../src/core/rng.js";
import { rngFromSeed, seedFor } from "../src/core/seed.js";
import { attempt, emptyTally, type Draw, type Tally } from "../src/games/difference-relay/generator.js";

const GAME_ID = "difference-relay";

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

function main(): void {
  const seeds = Number(flag("seeds", "400"));
  const attempts = Number(flag("attempts", "300"));
  const outDir = flag("out", "data/difference-relay");

  const difficulty: number[] = [];
  const pars: number[] = [];
  const tally: Tally = emptyTally();
  const started = Date.now();

  for (let seed = 1; seed <= seeds; seed += 1) {
    const rng = rngFromSeed(seedFor(`${GAME_ID}-calibrate`, seed));
    const draw: Draw = { intBelow: (bound: number): number => intBelow(rng, bound) };
    for (let a = 0; a < attempts; a += 1) {
      const puzzle = attempt(draw, seed, tally);
      if (puzzle === null) continue;
      tally.accepted += 1;
      difficulty.push(puzzle.difficulty);
      pars.push(puzzle.par);
    }
    if (seed % 50 === 0) stdout.write(".");
  }

  const edges = septiles(difficulty);
  const bandCounts = new Array<number>(7).fill(0);
  for (const value of difficulty) {
    const b = bandOfWith(edges, value);
    bandCounts[b] = (bandCounts[b] as number) + 1;
  }
  const parCounts: Record<number, number> = {};
  for (const par of pars) parCounts[par] = (parCounts[par] ?? 0) + 1;

  const total = Object.values(tally).reduce((sum, value) => sum + value, 0);
  const study = {
    seeds,
    attempts,
    total,
    screened: difficulty.length,
    acceptance: Number(((difficulty.length / total) * 100).toFixed(2)),
    bandEdges: edges,
    bandCounts,
    parCounts,
    rejections: tally,
  };

  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/study.json`, `${JSON.stringify(study, null, 2)}\n`);

  stdout.write(`\n${String(difficulty.length)} screened of ${String(total)} attempts, ${study.acceptance} percent, in ${String(Date.now() - started)} ms\n`);
  stdout.write(`BAND_EDGES = [${edges.join(", ")}]\n`);
  stdout.write(`band counts: ${bandCounts.join(", ")}\n`);
  stdout.write(`par distribution: ${JSON.stringify(parCounts)}\n`);
  stdout.write(`rejections: ${JSON.stringify(tally)}\n`);
}

main();
