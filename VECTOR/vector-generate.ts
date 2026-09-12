/**
 * Generates the VECTOR horizon. Runs in CI, never in the browser.
 *
 *   npx tsx tools/vector-generate.ts --first 1 --count 365 --out data/vector
 *
 * One stream per puzzle and no salts. A carve consumes a variable number of
 * draws, so the position in the stream already separates one attempt from the
 * next. What an entry records is the attempt count, and tools/vector-verify.ts
 * replays that many carves from the same seed and demands a byte identical
 * layout. VECTOR.md 9.1.
 */

import { mkdirSync, writeFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";

import { rngFromSeed } from "../src/core/rng.js";
import { seedFor } from "../src/core/seed.js";
import { MANIFEST_CODEC, encodeSymbols } from "../src/engine/manifest-codec.js";
import {
  BAND_EDGES,
  CLUE_CEILING,
  CLUE_FLOOR,
  DEPTH_FLOOR,
  OPENING_MAX_PERCENT,
  bandForPuzzle,
  bandOf,
  generateForPuzzle,
  weekdayOf,
  type Draw,
  type GeneratedBoard,
} from "../src/games/vector/generator.js";
import { CELLS, buildGeometry, cluesSumToBlanks, everyLineHasClue } from "../src/games/vector/propagate.js";

const GAME_ID = "vector";
/** Index 0 is a blank cell, index v + 1 is a clue of value v. */
export const LAYOUT_RADIX = 32;

interface Entry {
  readonly layout: string;
  readonly best: { readonly difficulty: number; readonly depth: number; readonly opening: number };
  readonly levers: readonly string[];
  readonly attempt: number;
}

function flag(name: string, fallback: string): string {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && at + 1 < argv.length ? (argv[at + 1] as string) : fallback;
}

/** The engine's rng exposes more than the carve needs. Narrow it at the seam. */
function drawFor(puzzleNumber: number): Draw {
  const rng = rngFromSeed(seedFor(GAME_ID, puzzleNumber));
  return { intBelow: (bound: number): number => rng.intBelow(bound) };
}

export function encodeLayout(puzzleNumber: number, board: GeneratedBoard): string {
  const symbols: number[] = [];
  for (let cell = 0; cell < CELLS; cell += 1) {
    const clue = board.clues[cell];
    symbols.push(clue === null ? 0 : clue + 1);
  }
  return encodeSymbols(puzzleNumber, symbols, LAYOUT_RADIX);
}

/** Everything a bad entry could be wrong about, checked before it is written. */
function assertSound(puzzleNumber: number, board: GeneratedBoard): void {
  const fail = (why: string): never => {
    stdout.write(`\npuzzle ${String(puzzleNumber)}: ${why}\n`);
    exit(1);
  };
  const geometry = buildGeometry(board.clues);
  if (geometry.clueCells.length < CLUE_FLOOR || geometry.clueCells.length > CLUE_CEILING) {
    fail(`clue count ${String(geometry.clueCells.length)} outside ${String(CLUE_FLOOR)} to ${String(CLUE_CEILING)}`);
  }
  if (!everyLineHasClue(board.clues)) fail("a row or column holds no clue");
  if (!cluesSumToBlanks(geometry)) fail("clue values do not sum to the blank count");
  for (const cell of geometry.blankCells) {
    if (geometry.candidates[cell] === 0) fail(`cell ${String(cell)} has no candidate direction`);
  }
  for (const clue of geometry.clueCells) {
    if ((geometry.suppliers.get(clue) ?? []).length === 0) fail(`clue at ${String(clue)} has no supplier`);
    const value = board.clues[clue] as number;
    if (value < 0 || value + 1 >= LAYOUT_RADIX) fail(`clue value ${String(value)} is not encodable`);
  }
  if (board.depth < DEPTH_FLOOR) fail(`depth ${String(board.depth)} below the floor`);
  if (board.opening * 100 > OPENING_MAX_PERCENT * board.blanks) fail("opening above the cap");
  if (bandOf(board.intensity) !== bandForPuzzle(puzzleNumber)) fail("intensity outside the weekday band");
}

function main(): void {
  const first = Number(flag("first", "1"));
  const count = Number(flag("count", "365"));
  const outDir = flag("out", "data/vector");
  if (!Number.isInteger(first) || first < 1 || !Number.isInteger(count) || count < 1) {
    stdout.write("usage: vector-generate --first <n> --count <n> --out <dir>\n");
    exit(1);
  }

  const entries: Record<string, Entry> = {};
  const seenLayouts = new Map<string, number>();
  const byBand = new Array<number>(BAND_EDGES.length + 1).fill(0);
  let attempts = 0;

  for (let puzzleNumber = first; puzzleNumber < first + count; puzzleNumber += 1) {
    const day = generateForPuzzle(puzzleNumber, drawFor(puzzleNumber));
    if (day === null) {
      stdout.write(`\npuzzle ${String(puzzleNumber)}: no board inside the band before the attempt ceiling\n`);
      exit(1);
    }
    assertSound(puzzleNumber, day.board);

    // A duplicate layout is visible to anyone who opens the archive.
    const plain = day.board.clues.map((clue) => (clue === null ? "." : String(clue))).join(",");
    const twin = seenLayouts.get(plain);
    if (twin !== undefined) {
      stdout.write(`\npuzzle ${String(puzzleNumber)}: same layout as puzzle ${String(twin)}\n`);
      exit(1);
    }
    seenLayouts.set(plain, puzzleNumber);

    entries[String(puzzleNumber)] = {
      layout: encodeLayout(puzzleNumber, day.board),
      best: { difficulty: day.board.intensity, depth: day.board.depth, opening: day.board.opening },
      levers: day.board.levers,
      attempt: day.attempt,
    };
    attempts += day.attempt + 1;
    byBand[bandForPuzzle(puzzleNumber)] += 1;
    if ((puzzleNumber - first + 1) % 25 === 0) stdout.write(".");
  }

  const last = first + count - 1;
  const chunkName = `manifest.${String(first)}-${String(last)}.json`;
  mkdirSync(outDir, { recursive: true });
  writeFileSync(
    `${outDir}/${chunkName}`,
    `${JSON.stringify({ codec: MANIFEST_CODEC, entries }, null, 0)}\n`,
  );
  writeFileSync(
    `${outDir}/manifest.index.json`,
    `${JSON.stringify(
      {
        codec: MANIFEST_CODEC,
        horizon: { first, last },
        chunks: [{ first, last, url: chunkName }],
      },
      null,
      2,
    )}\n`,
  );

  stdout.write(`\n${String(count)} puzzles, ${String(attempts)} carves, `);
  stdout.write(`${(count / attempts * 100).toFixed(1)} percent acceptance\n`);
  stdout.write(`days per weekday band: ${byBand.map(String).join(", ")}\n`);
  stdout.write(`weekday of first puzzle: ${String(weekdayOf(first))}\n`);
}

main();
