/**
 * Generates the PANGRAM horizon. Runs in the container, never in the browser.
 *
 *   npx tsx tools/pangram-generate.ts --first 1 --count 365 --out data/pangram
 *
 * One stream per puzzle and no salts, as the other v3 games do it. The entry
 * records the attempt index; tests/games/pangram/generator.test.ts replays the
 * head of the horizon from the seed and demands byte identical entries, and
 * tools/pangram-verify.ts proves every day against the word lists without
 * importing this file or the generator. Chunks hold CHUNK_DAYS days each, so a
 * player fetches about a month of answers, the size POKER GRID's monthly chunks
 * already are. PANGRAM.md 6, 7, 9 and 12.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";

import { intBelow } from "../src/core/rng.js";
import { rngFromSeed, seedFor } from "../src/core/seed.js";
import { MANIFEST_CODEC } from "../src/engine/manifest-codec.js";
import { BAND_EDGES, bandForPuzzle } from "../src/games/pangram/bands.js";
import {
  contextFromLists,
  emptyTally,
  generateForPuzzle,
  type Draw,
  type GenContext,
} from "../src/games/pangram/generator.js";
import { encodeLayout, encodeWords } from "../src/games/pangram/pangram-codec.js";
import type { PangramPuzzle } from "../src/games/pangram/rules.js";

export const GAME_ID = "pangram";
export const ACCEPTED_PATH = "data/pangram/accepted.txt";
export const FAMILIAR_PATH = "data/pangram/familiar.txt";
export const CHUNK_DAYS = 31;

export interface PangramEntry {
  readonly layout: string;
  readonly words: string;
  readonly best: { readonly total: number; readonly count: number; readonly pangrams: number };
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

export function entryFor(puzzleNumber: number, puzzle: PangramPuzzle, attempt: number): PangramEntry {
  return {
    layout: encodeLayout(puzzleNumber, puzzle.letters, puzzle.centre),
    words: encodeWords(puzzleNumber, puzzle.letters, puzzle.answers),
    best: { total: puzzle.total, count: puzzle.answers.length, pangrams: puzzle.pangrams },
    levers: puzzle.levers,
    attempt,
  };
}

export function chunkRanges(first: number, last: number): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = [];
  for (let from = first; from <= last; from += CHUNK_DAYS) ranges.push({ from, to: Math.min(from + CHUNK_DAYS - 1, last) });
  return ranges;
}

function main(): void {
  const first = Number(flag("first", "1"));
  const count = Number(flag("count", "365"));
  const outDir = flag("out", "data/pangram");
  if (first !== 1 || !Number.isInteger(count) || count < 1) {
    stdout.write("usage: pangram-generate --first 1 --count <n> --out <dir>\n");
    exit(1);
  }

  const context = buildContext();
  const entries = new Map<number, PangramEntry>();
  const usedRoots = new Set<string>();
  const tally = emptyTally();
  const byBand = new Array<number>(BAND_EDGES.length + 1).fill(0);
  const started = Date.now();

  for (let puzzleNumber = first; puzzleNumber < first + count; puzzleNumber += 1) {
    const day = generateForPuzzle(context, puzzleNumber, drawFor(puzzleNumber), tally, usedRoots);
    if (day === null) {
      stdout.write(`\npuzzle ${String(puzzleNumber)}: no day inside the band before the attempt ceiling\n`);
      exit(1);
    }
    usedRoots.add(day.puzzle.letters);
    entries.set(puzzleNumber, entryFor(puzzleNumber, day.puzzle, day.attempt));
    const band = bandForPuzzle(puzzleNumber);
    byBand[band] = (byBand[band] as number) + 1;
    if ((puzzleNumber - first + 1) % 25 === 0) stdout.write(".");
  }

  const last = first + count - 1;
  mkdirSync(outDir, { recursive: true });
  const chunks: { from: number; to: number; url: string }[] = [];
  let bytes = 0;
  for (const range of chunkRanges(first, last)) {
    const name = `manifest.${String(range.from)}-${String(range.to)}.json`;
    const body: Record<string, PangramEntry> = {};
    for (let n = range.from; n <= range.to; n += 1) body[String(n)] = entries.get(n) as PangramEntry;
    const text = `${JSON.stringify({ codec: MANIFEST_CODEC, entries: body }, null, 0)}\n`;
    bytes += text.length;
    writeFileSync(`${outDir}/${name}`, text);
    chunks.push({ ...range, url: `/${outDir}/${name}` });
  }
  writeFileSync(
    `${outDir}/manifest.index.json`,
    `${JSON.stringify({ codec: MANIFEST_CODEC, horizon: last, chunks }, null, 2)}\n`,
  );

  const attempts = Object.values(tally).reduce((sum, value) => sum + value, 0);
  stdout.write(`\n${String(count)} days from ${String(attempts)} attempts in ${String(Date.now() - started)} ms, `);
  stdout.write(`${((count / attempts) * 100).toFixed(2)} percent acceptance\n`);
  stdout.write(`rejections: ${JSON.stringify(tally)}\n`);
  stdout.write(`days per weekday band: ${byBand.map(String).join(", ")}\n`);
  stdout.write(`${String(chunks.length)} chunks, ${String(bytes)} bytes in total\n`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/pangram-generate.ts")) main();
