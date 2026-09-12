/**
 * Verifies the VECTOR horizon. A separate process from generation, so a bug in
 * the generator cannot certify itself.
 *
 *   npx tsx tools/vector-verify.ts --dir data/vector
 *
 * Seven assertions per entry, VECTOR.md section 10. The sixth is the one that
 * earns its keep: a backtracking search written separately from the propagator
 * is asked to find a second solution, so the uniqueness claim is tested by
 * something that is not the propagator. Measured cost on one board: 33 branches,
 * 106,444 nodes, 49 milliseconds.
 */

import { readFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";

import { rngFromSeed } from "../src/core/rng.js";
import { seedFor } from "../src/core/seed.js";
import { decodeSymbols } from "../src/engine/manifest-codec.js";
import {
  BAND_EDGES,
  DEPTH_FLOOR,
  OPENING_MAX_PERCENT,
  bandForPuzzle,
  bandOf,
  carve,
  type Draw,
} from "../src/games/vector/generator.js";
import {
  CELLS,
  buildGeometry,
  candidateList,
  cluesSumToBlanks,
  everyLineHasClue,
  propagate,
  satisfies,
  type ClueLayout,
  type Direction,
  type Geometry,
} from "../src/games/vector/propagate.js";
import { LAYOUT_RADIX } from "./vector-generate.js";

const GAME_ID = "vector";
/** A branch that cannot be settled inside this many nodes fails the board. */
const NODE_CEILING = 2_000_000;
const LEVER_VOCABULARY = new Set([
  "clue-sparse",
  "clue-dense",
  "zero-heavy",
  "edge-weighted",
  "centre-weighted",
  "none",
]);

interface Entry {
  readonly layout: string;
  readonly best: { readonly difficulty: number; readonly depth: number; readonly opening: number };
  readonly levers: readonly string[];
  readonly attempt: number;
}

let nodes = 0;

/**
 * Written against the rules directly rather than against the propagator. Fixes
 * one cell to a direction the solution does not use and asks whether any
 * complete assignment still satisfies every clue. Every solution other than the
 * known one differs somewhere, so branching over every cell and every
 * alternative direction covers them all.
 */
function hasSolutionWith(
  geometry: Geometry,
  layout: ClueLayout,
  fixedCell: number,
  fixedDir: Direction,
): boolean {
  const arrows: (Direction | null)[] = new Array<Direction | null>(CELLS).fill(null);
  const counts: number[] = new Array<number>(CELLS).fill(0);
  const order = geometry.blankCells.filter((cell) => cell !== fixedCell);

  const place = (cell: number, dir: Direction): boolean => {
    const target = geometry.targets[cell * 4 + dir] as number;
    if (counts[target] + 1 > (layout[target] as number)) return false;
    arrows[cell] = dir;
    counts[target] += 1;
    return true;
  };
  const lift = (cell: number): void => {
    const dir = arrows[cell] as Direction;
    counts[geometry.targets[cell * 4 + dir] as number] -= 1;
    arrows[cell] = null;
  };

  if (!place(fixedCell, fixedDir)) return false;

  const walk = (at: number): boolean => {
    nodes += 1;
    if (nodes > NODE_CEILING) throw new Error("node ceiling exceeded");
    if (at === order.length) return satisfies(geometry, arrows);
    const cell = order[at] as number;
    for (const dir of candidateList(geometry, cell)) {
      if (!place(cell, dir)) continue;
      if (walk(at + 1)) return true;
      lift(cell);
    }
    return false;
  };
  return walk(0);
}

function drawFor(puzzleNumber: number): Draw {
  const rng = rngFromSeed(seedFor(GAME_ID, puzzleNumber));
  return { intBelow: (bound: number): number => rng.intBelow(bound) };
}

function flag(name: string, fallback: string): string {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && at + 1 < argv.length ? (argv[at + 1] as string) : fallback;
}

function main(): void {
  const dir = flag("dir", "data/vector");
  const index = JSON.parse(readFileSync(`${dir}/manifest.index.json`, "utf8")) as {
    horizon: { first: number; last: number };
    chunks: { first: number; last: number; url: string }[];
  };

  const entries = new Map<number, Entry>();
  for (const chunk of index.chunks) {
    const body = JSON.parse(readFileSync(`${dir}/${chunk.url}`, "utf8")) as {
      entries: Record<string, Entry>;
    };
    for (const [key, entry] of Object.entries(body.entries)) entries.set(Number(key), entry);
  }

  const seenLayouts = new Map<string, number>();
  let checked = 0;
  const fail = (puzzleNumber: number, why: string): never => {
    stdout.write(`\npuzzle ${String(puzzleNumber)}: ${why}\n`);
    exit(1);
  };

  for (let puzzleNumber = index.horizon.first; puzzleNumber <= index.horizon.last; puzzleNumber += 1) {
    const entry = entries.get(puzzleNumber);
    if (entry === undefined) fail(puzzleNumber, "missing from every chunk");

    // 1. Re-derive. Replay the stream for the recorded number of attempts.
    const draw = drawFor(puzzleNumber);
    let board = null;
    for (let attempt = 0; attempt <= entry.attempt; attempt += 1) board = carve(draw);
    if (board === null) fail(puzzleNumber, "the recorded attempt produced no board");
    const rebuilt = board;

    const symbols = decodeSymbols(puzzleNumber, entry.layout, LAYOUT_RADIX, CELLS);
    if (symbols === null) fail(puzzleNumber, "layout does not decode");
    const stored: (number | null)[] = (symbols as readonly number[]).map((s) => (s === 0 ? null : s - 1));
    for (let cell = 0; cell < CELLS; cell += 1) {
      if (stored[cell] !== rebuilt.clues[cell]) fail(puzzleNumber, `cell ${String(cell)} differs from the re-derived board`);
    }

    // 2. Structural invariants.
    const geometry = buildGeometry(stored);
    if (!everyLineHasClue(stored)) fail(puzzleNumber, "a row or column holds no clue");
    if (!cluesSumToBlanks(geometry)) fail(puzzleNumber, "clue values do not sum to the blank count");
    for (const cell of geometry.blankCells) {
      if (candidateList(geometry, cell).length < 2) fail(puzzleNumber, `cell ${String(cell)} has fewer than two candidates`);
    }
    for (const clue of geometry.clueCells) {
      if ((geometry.suppliers.get(clue) ?? []).length === 0) fail(puzzleNumber, `clue at ${String(clue)} has no supplier`);
    }
    for (const lever of entry.levers) {
      if (!LEVER_VOCABULARY.has(lever)) fail(puzzleNumber, `unknown lever ${lever}`);
    }

    // 3. Resolves, and to the recorded numbers.
    const result = propagate(geometry);
    if (result.kind !== "resolved") fail(puzzleNumber, `propagation ${result.kind}`);
    if (result.kind !== "resolved") return;
    if (result.depth !== entry.best.depth) fail(puzzleNumber, "depth differs from the stored value");
    if (result.opening !== entry.best.opening) fail(puzzleNumber, "opening differs from the stored value");
    let total = 0;
    for (const cell of geometry.blankCells) total += result.rounds[cell] as number;
    const intensity = Math.floor((total * 100) / geometry.blankCells.length);
    if (intensity !== entry.best.difficulty) fail(puzzleNumber, "intensity differs from the stored value");

    // 4 and 5. Band and screens.
    if (bandOf(intensity) !== bandForPuzzle(puzzleNumber)) fail(puzzleNumber, "intensity outside the weekday band");
    if (result.depth < DEPTH_FLOOR) fail(puzzleNumber, "depth below the floor");
    if (result.opening * 100 > OPENING_MAX_PERCENT * geometry.blankCells.length) {
      fail(puzzleNumber, "opening above the cap");
    }

    // 6. Uniqueness, by a search that is not the propagator.
    try {
      for (const cell of geometry.blankCells) {
        for (const dir of candidateList(geometry, cell)) {
          if (dir === result.arrows[cell]) continue;
          if (hasSolutionWith(geometry, stored, cell, dir)) {
            fail(puzzleNumber, `a second solution exists with cell ${String(cell)} pointing ${String(dir)}`);
          }
        }
      }
    } catch {
      fail(puzzleNumber, "uniqueness search exceeded the node ceiling");
    }

    // 7. No duplicate layout inside the horizon.
    const plain = stored.map((clue) => (clue === null ? "." : String(clue))).join(",");
    const twin = seenLayouts.get(plain);
    if (twin !== undefined) fail(puzzleNumber, `same layout as puzzle ${String(twin)}`);
    seenLayouts.set(plain, puzzleNumber);

    checked += 1;
    if (checked % 25 === 0) stdout.write(".");
  }

  const spread = new Array<number>(BAND_EDGES.length + 1).fill(0);
  for (const [puzzleNumber] of entries) spread[bandForPuzzle(puzzleNumber)] += 1;
  stdout.write(`\n${String(checked)} puzzles verified, ${String(nodes)} uniqueness nodes\n`);
  stdout.write(`days per weekday band: ${spread.map(String).join(", ")}\n`);
}

main();
