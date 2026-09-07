/** Node only. Replays and validates Poker Grid manifest entries. */

import { readFileSync, readdirSync } from "node:fs";
import { hasLegalMove, type PokerState } from "../src/games/poker-grid/rules.js";
import { solve } from "../src/games/poker-grid/solver.js";
import { CARD_CLEAR_POINTS } from "../src/games/poker-grid/scoring.js";
import type { ManifestChunk } from "./generate.js";

export type { ManifestChunk } from "./generate.js";

function stateFor(cells: readonly number[]): PokerState {
  return { grid: cells.slice(), best: null, selection: [], hands: [], score: 0, terminal: !hasLegalMove(cells), exceededStoredBest: false };
}

export function verifyChunk(chunk: ManifestChunk, maxNodes = 250): number {
  let checked = 0;
  for (const board of chunk.boards) {
    const parsed = parsePuzzle(board.number, board);
    if (!parsed.ok) throw new Error(`${chunk.month} puzzle ${board.number}: ${parsed.error.detail}`);
    if (parsed.value.cells.length !== 35) throw new Error(`puzzle ${board.number}: wrong cell count`);
    const state = stateFor(parsed.value.cells);
    if (state.terminal) throw new Error(`puzzle ${board.number}: no opening move`);
    const result = solve(state, { maxNodes });
    if (board.best.hands < 1 || board.best.score < board.best.hands * 5 * CARD_CLEAR_POINTS) {
      throw new Error(`puzzle ${board.number}: invalid stored score`);
    }
    if (board.best.method === "exact" && result.method !== "exact") {
      throw new Error(`puzzle ${board.number}: exact claim exceeds verifier budget`);
    }
    checked += 1;
  }
  return checked;
}

export function parsePuzzle(number: number, raw: unknown): { ok: true; value: { number: number; cells: readonly number[] } } | { ok: false; error: { detail: string } } {
  if (typeof raw !== "object" || raw === null) return { ok: false, error: { detail: "board is not an object" } };
  const value = raw as { number?: unknown; cells?: unknown; best?: unknown; levers?: unknown };
  if (value.number !== number || !Array.isArray(value.cells) || value.cells.length !== 35 || new Set(value.cells).size !== 35) {
    return { ok: false, error: { detail: "board shape is invalid" } };
  }
  if (!value.cells.every((card) => Number.isInteger(card) && card >= 0 && card < 52)) return { ok: false, error: { detail: "card code is invalid" } };
  if (typeof value.best !== "object" || value.best === null) return { ok: false, error: { detail: "best is missing" } };
  return { ok: true, value: { number, cells: value.cells } };
}

export function verifyDirectory(directory = "data/poker-grid"): number {
  let checked = 0;
  for (const file of readdirSync(directory).filter((name) => /^manifest\.\d{4}-\d{2}\.json$/.test(name)).sort()) {
    const chunk = JSON.parse(readFileSync(`${directory}/${file}`, "utf8")) as ManifestChunk;
    checked += verifyChunk(chunk);
  }
  if (checked === 0) throw new Error(`no manifest chunks found in ${directory}`);
  return checked;
}

if (process.argv[1]?.endsWith("verify.ts")) {
  process.stdout.write(`verified ${verifyDirectory()} boards\n`);
}
