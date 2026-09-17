/**
 * Generates the ROTATE LOCK horizon. Runs in CI never and in the browser never.
 *
 *   npx tsx tools/rotate-lock-generate.ts --first 1 --count 365 --out data/rotate-lock
 *
 * One stream per puzzle and no salts, as VECTOR does it: an attempt consumes a
 * variable number of draws, so the stream position already separates attempts.
 * The entry records the attempt index, and tools/rotate-lock-verify.ts replays
 * that many attempts from the same seed and demands a byte identical layout.
 * ROTATE-LOCK.md 7 and 10.2.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";

import { intBelow } from "../src/core/rng.js";
import { rngFromSeed, seedFor } from "../src/core/seed.js";
import { MANIFEST_CODEC } from "../src/engine/manifest-codec.js";
import {
  BAND_EDGES,
  bandForPuzzle,
  emptyTally,
  generateForPuzzle,
  weekdayOf,
  type Draw,
} from "../src/games/rotate-lock/generator.js";
import { encodeLayout } from "../src/games/rotate-lock/layout-codec.js";
import type { RotateLockPuzzle } from "../src/games/rotate-lock/rules.js";

export const GAME_ID = "rotate-lock";

export interface RotateLockEntry {
  readonly layout: string;
  readonly best: { readonly difficulty: number; readonly par: number };
  readonly levers: readonly string[];
  readonly attempt: number;
}

function flag(name: string, fallback: string): string {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && at + 1 < argv.length ? (argv[at + 1] as string) : fallback;
}

export function drawFor(puzzleNumber: number): Draw {
  const rng = rngFromSeed(seedFor(GAME_ID, puzzleNumber));
  return { intBelow: (bound: number): number => intBelow(rng, bound) };
}

/** What a player could compare across two days: the board and the tray. */
export function layoutIdentity(
  puzzle: Pick<RotateLockPuzzle, "start" | "lock" | "marks" | "lengths" | "startOrder" | "startFacing">,
): string {
  return [
    puzzle.start,
    puzzle.lock,
    puzzle.marks.join("."),
    puzzle.lengths.join(""),
    puzzle.startOrder.join(""),
    puzzle.startFacing.join(""),
  ].join("|");
}

export function entryFor(puzzleNumber: number, puzzle: RotateLockPuzzle, attempt: number): RotateLockEntry {
  return {
    layout: encodeLayout(puzzleNumber, puzzle, { order: puzzle.startOrder, facing: puzzle.startFacing }),
    best: { difficulty: puzzle.difficulty, par: puzzle.par },
    levers: puzzle.levers,
    attempt,
  };
}

function main(): void {
  const first = Number(flag("first", "1"));
  const count = Number(flag("count", "365"));
  const outDir = flag("out", "data/rotate-lock");
  /* An integer horizon means every day from 1 to it is published. */
  if (first !== 1 || !Number.isInteger(count) || count < 1) {
    stdout.write("usage: rotate-lock-generate --first 1 --count <n> --out <dir>\n");
    exit(1);
  }

  const entries: Record<string, RotateLockEntry> = {};
  const seen = new Map<string, number>();
  const tally = emptyTally();
  const byBand = new Array<number>(BAND_EDGES.length + 1).fill(0);
  const started = Date.now();

  for (let puzzleNumber = first; puzzleNumber < first + count; puzzleNumber += 1) {
    const day = generateForPuzzle(puzzleNumber, drawFor(puzzleNumber), tally);
    if (day === null) {
      stdout.write(`\npuzzle ${String(puzzleNumber)}: no puzzle inside the band before the attempt ceiling\n`);
      exit(1);
    }
    const identity = layoutIdentity(day.puzzle);
    const twin = seen.get(identity);
    if (twin !== undefined) {
      stdout.write(`\npuzzle ${String(puzzleNumber)}: same layout as puzzle ${String(twin)}\n`);
      exit(1);
    }
    seen.set(identity, puzzleNumber);
    entries[String(puzzleNumber)] = entryFor(puzzleNumber, day.puzzle, day.attempt);
    const band = bandForPuzzle(puzzleNumber);
    byBand[band] = (byBand[band] as number) + 1;
    if ((puzzleNumber - first + 1) % 25 === 0) stdout.write(".");
  }

  const last = first + count - 1;
  const chunkName = `manifest.${String(first)}-${String(last)}.json`;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(`${outDir}/${chunkName}`, `${JSON.stringify({ codec: MANIFEST_CODEC, entries }, null, 0)}\n`);
  writeFileSync(
    `${outDir}/manifest.index.json`,
    `${JSON.stringify(
      { codec: MANIFEST_CODEC, horizon: last, chunks: [{ from: first, to: last, url: `/${outDir}/${chunkName}` }] },
      null,
      2,
    )}\n`,
  );

  const attempts = Object.values(tally).reduce((sum, value) => sum + value, 0);
  stdout.write(`\n${String(count)} puzzles from ${String(attempts)} attempts in ${String(Date.now() - started)} ms, `);
  stdout.write(`${((count / attempts) * 100).toFixed(2)} percent acceptance\n`);
  stdout.write(`rejections: ${JSON.stringify(tally)}\n`);
  stdout.write(`days per weekday band: ${byBand.map(String).join(", ")}\n`);
  stdout.write(`weekday of first puzzle: ${String(weekdayOf(first))}\n`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/rotate-lock-generate.ts")) main();
