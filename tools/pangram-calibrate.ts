/**
 * Calibrates PANGRAM difficulty bands. Runs in the container, never in the
 * browser. PANGRAM.md 14 and 15.
 *
 *   npx tsx tools/pangram-calibrate.ts --seeds 4000 --out data/pangram
 *
 * Draws screened days (every screen but band and reuse), pools their total
 * available score, and takes the six septiles as BAND_EDGES. It also records
 * the word count septiles, the named fallback measure, so a later switch has
 * its evidence already committed. The edges it prints are what bands.ts must
 * hold; a change is a manifest regeneration, so the tool says so loudly.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { argv, stdout } from "node:process";

import { intBelow } from "../src/core/rng.js";
import { rngFromSeed, seedFor } from "../src/core/seed.js";
import { BAND_EDGES, bandOfWith } from "../src/games/pangram/bands.js";
import { attempt, emptyTally, type Draw } from "../src/games/pangram/generator.js";
import { buildContext } from "./pangram-generate.js";

const GAME_ID = "pangram";

function flag(name: string, fallback: string): string {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && at + 1 < argv.length ? (argv[at + 1] as string) : fallback;
}

export function septiles(values: readonly number[]): number[] {
  const sorted = [...values].sort((a, b) => a - b);
  const edges: number[] = [];
  for (let k = 1; k <= 6; k += 1) edges.push(sorted[Math.min(Math.floor((sorted.length * k) / 7), sorted.length - 1)] as number);
  return edges;
}

function bandCounts(edges: readonly number[], values: readonly number[]): number[] {
  const counts = new Array<number>(edges.length + 1).fill(0);
  for (const value of values) {
    const band = bandOfWith(edges, value);
    counts[band] = (counts[band] as number) + 1;
  }
  return counts;
}

function main(): void {
  const seeds = Number(flag("seeds", "4000"));
  const outDir = flag("out", "data/pangram");
  const context = buildContext();
  const totals: number[] = [];
  const counts: number[] = [];
  const tally = emptyTally();
  const started = Date.now();

  for (let seed = 0; seed < seeds; seed += 1) {
    const rng = rngFromSeed(seedFor(GAME_ID, seed + 1, "calibrate"));
    const draw: Draw = { intBelow: (bound: number): number => intBelow(rng, bound) };
    const puzzle = attempt(context, seed + 1, draw, tally);
    if (puzzle === null) continue;
    tally.accepted += 1;
    totals.push(puzzle.total);
    counts.push(puzzle.answers.length);
  }

  const edges = septiles(totals);
  const countEdges = septiles(counts);
  const study = {
    seeds,
    roots: context.roots.length,
    screened: totals.length,
    acceptance: Number(((totals.length / seeds) * 100).toFixed(2)),
    distinctTotals: new Set(totals).size,
    bandEdges: edges,
    bandCounts: bandCounts(edges, totals),
    fallbackWordCount: { distinct: new Set(counts).size, bandEdges: countEdges, bandCounts: bandCounts(countEdges, counts) },
    rejections: tally,
  };
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/study.json`, `${JSON.stringify(study, null, 2)}\n`);

  stdout.write(`${String(totals.length)} screened days from ${String(seeds)} seeds in ${String(Date.now() - started)} ms\n`);
  stdout.write(`total score septiles (candidate BAND_EDGES): ${edges.join(", ")}\n`);
  stdout.write(`bands.ts BAND_EDGES:                        ${BAND_EDGES.join(", ")}\n`);
  if (JSON.stringify(edges) !== JSON.stringify([...BAND_EDGES])) {
    stdout.write("WARNING: septiles differ from BAND_EDGES; regenerate the manifest after updating BAND_EDGES\n");
  }
  stdout.write(`${JSON.stringify(study)}\n`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/pangram-calibrate.ts")) main();
