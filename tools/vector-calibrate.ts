/**
 * Measures the intensity distribution of screened VECTOR boards over the engine
 * rng stream and prints septile band edges. VECTOR.md 9.2: the edges are
 * calibrated in the generation step, and changing one invalidates every stored
 * band. Run this, paste BAND_EDGES into generator.ts, then regenerate.
 *
 *   npx tsx tools/vector-calibrate.ts --samples 6000
 */

import { argv, stdout } from "node:process";

import { intBelow } from "../src/core/rng.js";
import { rngFromSeed, seedFor } from "../src/core/seed.js";
import { carve, passesScreens, type Draw } from "../src/games/vector/generator.js";

const GAME_ID = "vector";

function flag(name: string, fallback: string): string {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && at + 1 < argv.length ? (argv[at + 1] as string) : fallback;
}

function drawFor(seed: number): Draw {
  const rng = rngFromSeed(seedFor(GAME_ID, seed));
  return { intBelow: (bound: number): number => intBelow(rng, bound) };
}

function main(): void {
  const samples = Number(flag("samples", "6000"));
  const intensities: number[] = [];
  for (let seed = 1; seed <= samples; seed += 1) {
    const board = carve(drawFor(seed));
    if (board !== null && passesScreens(board)) intensities.push(board.intensity);
  }
  intensities.sort((a, b) => a - b);
  const n = intensities.length;
  if (n < 700) {
    stdout.write(`only ${String(n)} screened boards, widen the sample\n`);
    return;
  }
  // Six edges cut seven equal groups. bandOf increments while intensity > edge,
  // so edge i is the value at quantile (i + 1) / 7, made strictly increasing.
  const edges: number[] = [];
  for (let i = 1; i <= 6; i += 1) {
    const q = intensities[Math.floor((i / 7) * n)] as number;
    edges.push(edges.length > 0 && q <= (edges[edges.length - 1] as number) ? (edges[edges.length - 1] as number) + 1 : q);
  }
  stdout.write(`screened boards: ${String(n)} of ${String(samples)} seeds\n`);
  stdout.write(`intensity min ${String(intensities[0])} max ${String(intensities[n - 1])}\n`);
  stdout.write(`BAND_EDGES: [${edges.join(", ")}]\n`);
  // Occupancy under the proposed edges.
  const bins = new Array<number>(7).fill(0);
  for (const value of intensities) {
    let b = 0;
    while (b < edges.length && value > (edges[b] as number)) b += 1;
    bins[b] = (bins[b] as number) + 1;
  }
  stdout.write(`per band: ${bins.map(String).join(", ")}\n`);
}

main();
