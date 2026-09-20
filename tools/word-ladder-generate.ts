/**
 * Generates the WORD LADDER horizon. Runs in the container never in the browser.
 *
 *   npx tsx tools/word-ladder-generate.ts --first 1 --count 365 --out data/word-ladder
 *
 * One stream per puzzle and no salts, as the other v3 games do it: an attempt
 * consumes a variable number of draws, so the stream position already separates
 * attempts. The entry records the attempt index, and tools/word-ladder-verify.ts
 * replays that many attempts from the same seed and demands a byte identical day.
 * The accepted and familiar lists are read from data/, built once into a context.
 * WORD-LADDER.md 6, 7 and 9.
 */

import { readFileSync, mkdirSync, writeFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";

import { intBelow } from "../src/core/rng.js";
import { rngFromSeed, seedFor } from "../src/core/seed.js";
import { MANIFEST_CODEC } from "../src/engine/manifest-codec.js";
import {
  BAND_EDGES,
  bandForPuzzle,
  contextFromLists,
  emptyTally,
  generateForPuzzle,
  pairKey,
  weekdayOf,
  type Draw,
  type GenContext,
} from "../src/games/word-ladder/generator.js";
import { encodeLayout } from "../src/games/word-ladder/word-ladder-codec.js";
import type { WordLadderPuzzle } from "../src/games/word-ladder/rules.js";

export const GAME_ID = "word-ladder";
export const ACCEPTED_PATH = "data/word-ladder/accepted.txt";
export const FAMILIAR_PATH = "data/word-ladder/familiar.txt";

export interface WordLadderEntry {
  readonly layout: string;
  readonly best: { readonly difficulty: number; readonly par: number };
  readonly levers: readonly string[];
  readonly attempt: number;
}

function flag(name: string, fallback: string): string {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && at + 1 < argv.length ? (argv[at + 1] as string) : fallback;
}

export function loadList(path: string): string[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
}

export function buildContext(): GenContext {
  return contextFromLists(loadList(ACCEPTED_PATH), loadList(FAMILIAR_PATH));
}

export function drawFor(puzzleNumber: number): Draw {
  const rng = rngFromSeed(seedFor(GAME_ID, puzzleNumber));
  return { intBelow: (bound: number): number => intBelow(rng, bound) };
}

export function entryFor(puzzleNumber: number, puzzle: WordLadderPuzzle, attempt: number): WordLadderEntry {
  return {
    layout: encodeLayout(puzzleNumber, puzzle.start, puzzle.goal),
    best: { difficulty: puzzle.difficulty, par: puzzle.par },
    levers: puzzle.levers,
    attempt,
  };
}

function main(): void {
  const first = Number(flag("first", "1"));
  const count = Number(flag("count", "365"));
  const outDir = flag("out", "data/word-ladder");
  if (first !== 1 || !Number.isInteger(count) || count < 1) {
    stdout.write("usage: word-ladder-generate --first 1 --count <n> --out <dir>\n");
    exit(1);
  }

  const context = buildContext();
  const entries: Record<string, WordLadderEntry> = {};
  const usedPairs = new Set<string>();
  const tally = emptyTally();
  const byBand = new Array<number>(BAND_EDGES.length + 1).fill(0);
  const started = Date.now();

  for (let puzzleNumber = first; puzzleNumber < first + count; puzzleNumber += 1) {
    const day = generateForPuzzle(context, puzzleNumber, drawFor(puzzleNumber), tally, usedPairs);
    if (day === null) {
      stdout.write(`\npuzzle ${String(puzzleNumber)}: no puzzle inside the band before the attempt ceiling\n`);
      exit(1);
    }
    usedPairs.add(pairKey(day.puzzle.start, day.puzzle.goal));
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

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/word-ladder-generate.ts")) main();
