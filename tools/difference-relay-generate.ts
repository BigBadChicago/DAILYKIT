/**
 * Generates the DIFFERENCE RELAY horizon. Runs in CI never and in the browser
 * never.
 *
 *   npx tsx tools/difference-relay-generate.ts --first 1 --count 365 --out data/difference-relay
 *
 * One stream per puzzle and no salts, as VECTOR and ROTATE LOCK do it: an
 * attempt consumes a variable number of draws, so the stream position already
 * separates attempts. The entry records the attempt index, and
 * tools/difference-relay-verify.ts replays that many attempts from the same seed
 * and demands a byte identical layout. DIFFERENCE-RELAY.md 7 and 10.2.
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
} from "../src/games/difference-relay/generator.js";
import { encodeLayout } from "../src/games/difference-relay/relay-codec.js";
import type { DifferenceRelayPuzzle } from "../src/games/difference-relay/rules.js";

export const GAME_ID = "difference-relay";

export interface DifferenceRelayEntry {
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

/** What a player could compare across two days: the numbers, the marks, and the
 *  start order they open on. */
export function layoutIdentity(
  puzzle: Pick<DifferenceRelayPuzzle, "target" | "marks" | "startOrder">,
): string {
  return [puzzle.target.join(""), puzzle.marks.map((mark) => mark ?? "x").join("."), puzzle.startOrder.join("")].join("|");
}

export function entryFor(puzzleNumber: number, puzzle: DifferenceRelayPuzzle, attempt: number): DifferenceRelayEntry {
  return {
    layout: encodeLayout(puzzleNumber, puzzle.target, puzzle.marks, puzzle.startOrder),
    best: { difficulty: puzzle.difficulty, par: puzzle.par },
    levers: puzzle.levers,
    attempt,
  };
}

function main(): void {
  const first = Number(flag("first", "1"));
  const count = Number(flag("count", "365"));
  const outDir = flag("out", "data/difference-relay");
  if (first !== 1 || !Number.isInteger(count) || count < 1) {
    stdout.write("usage: difference-relay-generate --first 1 --count <n> --out <dir>\n");
    exit(1);
  }

  const entries: Record<string, DifferenceRelayEntry> = {};
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

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/difference-relay-generate.ts")) main();
