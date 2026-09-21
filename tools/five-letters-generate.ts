/**
 * Generates the FIVE LETTERS horizon. Runs in the container, never in the browser.
 *
 *   npx tsx tools/five-letters-generate.ts --first 1 --count 365 --out data/five-letters
 *
 * One stream per puzzle and no salts, as the other v3 games do it. The entry
 * records the attempt index; tests/games/five-letters/generator.test.ts replays
 * the head of the horizon from the seed and demands byte identical entries, and
 * tools/five-letters-verify.ts proves every day without importing this file, the
 * generator, the solver or the rules. Chunks hold CHUNK_DAYS days each, the
 * monthly size PANGRAM and POKER GRID use. FIVE-LETTERS.md 6, 7, 9 and 12.
 */

import { mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";

import { intBelow } from "../src/core/rng.js";
import { rngFromSeed, seedFor } from "../src/core/seed.js";
import { MANIFEST_CODEC } from "../src/engine/manifest-codec.js";
import { BAND_EDGES, bandForPuzzle } from "../src/games/five-letters/bands.js";
import { encodeAnswer } from "../src/games/five-letters/five-letters-codec.js";
import {
  contextFromLists,
  emptyTally,
  generateForPuzzle,
  type Day,
  type Draw,
  type GenContext,
} from "../src/games/five-letters/generator.js";

export const GAME_ID = "five-letters";
export const ACCEPTED_PATH = "data/five-letters/accepted.txt";
export const ANSWERS_PATH = "data/five-letters/answers.txt";
export const CHUNK_DAYS = 31;

export interface FiveLettersEntry {
  readonly answer: string;
  readonly best: { readonly candidates: number; readonly witness: number };
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
  return contextFromLists(loadList(ACCEPTED_PATH), loadList(ANSWERS_PATH));
}

export function drawFor(puzzleNumber: number): Draw {
  const rng = rngFromSeed(seedFor(GAME_ID, puzzleNumber));
  return { intBelow: (bound: number): number => intBelow(rng, bound) };
}

export function entryFor(puzzleNumber: number, day: Day): FiveLettersEntry {
  return {
    answer: encodeAnswer(puzzleNumber, day.answer),
    best: { candidates: day.candidates, witness: day.witness.length },
    levers: day.levers,
    attempt: day.attempt,
  };
}

export function chunkRanges(first: number, last: number): { from: number; to: number }[] {
  const ranges: { from: number; to: number }[] = [];
  for (let from = first; from <= last; from += CHUNK_DAYS) ranges.push({ from, to: Math.min(from + CHUNK_DAYS - 1, last) });
  return ranges;
}

/** The horizon's entries in order, the same code path the tests replay. */
export function generateHorizon(context: GenContext, first: number, count: number): Map<number, FiveLettersEntry> {
  const entries = new Map<number, FiveLettersEntry>();
  const used = new Set<string>();
  const tally = emptyTally();
  for (let n = first; n < first + count; n += 1) {
    const day = generateForPuzzle(context, n, drawFor(n), tally, used);
    if (day === null) throw new Error(`puzzle ${String(n)}: no day inside the band before the attempt ceiling`);
    used.add(day.answer);
    entries.set(n, entryFor(n, day));
  }
  return entries;
}

function main(): void {
  const first = Number(flag("first", "1"));
  const count = Number(flag("count", "365"));
  const outDir = flag("out", "data/five-letters");
  if (first !== 1 || !Number.isInteger(count) || count < 1) {
    stdout.write("usage: five-letters-generate --first 1 --count <n> --out <dir>\n");
    exit(1);
  }
  const started = Date.now();
  const context = buildContext();
  const entries = new Map<number, FiveLettersEntry>();
  const used = new Set<string>();
  const tally = emptyTally();
  const byBand = new Array<number>(BAND_EDGES.length + 1).fill(0);
  for (let n = first; n < first + count; n += 1) {
    const day = generateForPuzzle(context, n, drawFor(n), tally, used);
    if (day === null) {
      stdout.write(`\npuzzle ${String(n)}: no day inside the band before the attempt ceiling\n`);
      exit(1);
    }
    used.add(day.answer);
    entries.set(n, entryFor(n, day));
    const band = bandForPuzzle(n);
    byBand[band] = (byBand[band] as number) + 1;
  }

  const last = first + count - 1;
  mkdirSync(outDir, { recursive: true });
  const chunks: { from: number; to: number; url: string }[] = [];
  let bytes = 0;
  for (const range of chunkRanges(first, last)) {
    const name = `manifest.${String(range.from)}-${String(range.to)}.json`;
    const body: Record<string, FiveLettersEntry> = {};
    for (let n = range.from; n <= range.to; n += 1) body[String(n)] = entries.get(n) as FiveLettersEntry;
    const text = `${JSON.stringify({ codec: MANIFEST_CODEC, entries: body }, null, 0)}\n`;
    bytes += text.length;
    writeFileSync(`${outDir}/${name}`, text);
    chunks.push({ ...range, url: `/${outDir}/${name}` });
  }
  writeFileSync(`${outDir}/manifest.index.json`, `${JSON.stringify({ codec: MANIFEST_CODEC, horizon: last, chunks }, null, 2)}\n`);

  const attempts = tally.band + tally.repeat + tally.witness + tally.accepted;
  stdout.write(`${String(count)} days from ${String(attempts)} draws in ${String(Date.now() - started)} ms, `);
  stdout.write(`${((count / attempts) * 100).toFixed(2)} percent acceptance\n`);
  stdout.write(`rejections: ${JSON.stringify(tally)}\n`);
  stdout.write(`days per weekday band: ${byBand.map(String).join(", ")}\n`);
  stdout.write(`${String(chunks.length)} chunks, ${String(bytes)} bytes in total\n`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/five-letters-generate.ts")) main();
