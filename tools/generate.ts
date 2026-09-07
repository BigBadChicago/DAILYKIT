/** Node only. Generates verified Poker Grid manifest chunks. */

import { mkdirSync, writeFileSync } from "node:fs";
import { dirname } from "node:path";
import { seedFor } from "../src/core/seed.js";
import { dateForPuzzleNumber, daysFromCivil, type CivilDate } from "../src/core/date.js";
import { generatePuzzle, isValidBoard, type PokerPuzzle } from "../src/games/poker-grid/generator.js";
import { hasLegalMove, type PokerState } from "../src/games/poker-grid/rules.js";
import { solve } from "../src/games/poker-grid/solver.js";

const EPOCH: CivilDate = { year: 2026, month: 1, day: 1 };
const DEFAULT_HORIZON = 365;
const DEFAULT_NODE_BUDGET = 250;
const OUTPUT_DIR = "data/poker-grid";

export interface GeneratedEntry {
  readonly number: number;
  readonly cells: readonly number[];
  readonly best: { readonly score: number; readonly hands: number; readonly method: "exact" | "beam" };
  readonly levers: readonly string[];
}

export interface ManifestChunk {
  readonly game: "poker-grid";
  readonly month: string;
  readonly from: number;
  readonly to: number;
  readonly boards: readonly GeneratedEntry[];
}

function monthForPuzzle(number: number): string {
  const date = dateForPuzzleNumber(EPOCH, number);
  return `${date.year}-${String(date.month).padStart(2, "0")}`;
}

function initialState(puzzle: PokerPuzzle): PokerState {
  const grid = puzzle.cells.slice();
  return { grid, best: null, selection: [], hands: [], score: 0, terminal: !hasLegalMove(grid), exceededStoredBest: false };
}

export function generateEntry(number: number, nodeBudget: number): GeneratedEntry {
  const puzzle = generatePuzzle(number, seedFor("poker-grid", number));
  if (!isValidBoard(puzzle.cells)) throw new Error(`puzzle ${number} generated an invalid board`);
  const state = initialState(puzzle);
  if (state.terminal) throw new Error(`puzzle ${number} has no legal opening hand`);
  const best = solve(state, { maxNodes: nodeBudget });
  if (best.hands < 1) throw new Error(`puzzle ${number} solver found no hand`);
  return { number, cells: puzzle.cells, best, levers: ["none"] };
}

function writeChunk(month: string, boards: readonly GeneratedEntry[]): string {
  const path = `${OUTPUT_DIR}/manifest.${month}.json`;
  const chunk: ManifestChunk = {
    game: "poker-grid",
    month,
    from: boards[0]?.number ?? 0,
    to: boards[boards.length - 1]?.number ?? 0,
    boards,
  };
  mkdirSync(dirname(path), { recursive: true });
  writeFileSync(path, `${JSON.stringify(chunk, null, 2)}\n`, "utf8");
  return path;
}

export function generateManifest(horizon = DEFAULT_HORIZON, nodeBudget = DEFAULT_NODE_BUDGET): void {
  if (!Number.isInteger(horizon) || horizon < 1) throw new RangeError("horizon must be a positive integer");
  if (!Number.isInteger(nodeBudget) || nodeBudget < 1) throw new RangeError("node budget must be positive");
  const groups = new Map<string, GeneratedEntry[]>();
  for (let number = 1; number <= horizon; number += 1) {
    const entry = generateEntry(number, nodeBudget);
    const month = monthForPuzzle(number);
    const boards = groups.get(month) ?? [];
    boards.push(entry);
    groups.set(month, boards);
  }

  const chunks = [...groups.entries()].map(([month, boards]) => ({ month, boards, path: writeChunk(month, boards) }));
  const index = {
    game: "poker-grid",
    epoch: EPOCH,
    horizon,
    chunks: chunks.map(({ month, boards, path }) => ({ month, from: boards[0]?.number, to: boards[boards.length - 1]?.number, url: `/${path}` })),
  };
  writeFileSync(`${OUTPUT_DIR}/manifest.index.json`, `${JSON.stringify(index, null, 2)}\n`, "utf8");
  process.stdout.write(`generated ${horizon} boards in ${chunks.length} monthly chunks\n`);
}

if (process.argv[1]?.endsWith("generate.ts")) {
  const horizon = Number(process.env["POKER_GRID_HORIZON"] ?? DEFAULT_HORIZON);
  const budget = Number(process.env["POKER_GRID_NODE_BUDGET"] ?? DEFAULT_NODE_BUDGET);
  generateManifest(horizon, budget);
}

export { DEFAULT_HORIZON, DEFAULT_NODE_BUDGET, EPOCH };
