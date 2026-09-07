import { shuffled, type Rng } from "../../core/rng.js";
import type { PuzzleNumber, Seed } from "../../core/types.js";
import { rngFromSeed } from "../../core/seed.js";
import { BOARD_CELLS } from "./rules.js";

export interface PokerBest {
  readonly score: number;
  readonly hands: number;
  readonly method: "exact" | "beam";
}

export interface PokerPuzzle {
  readonly number: PuzzleNumber;
  readonly cells: readonly number[];
  readonly best: PokerBest | null;
  readonly levers: readonly string[];
}

const DECK = Array.from({ length: 52 }, (_, card) => card);

export function generateBoard(rng: Rng): readonly number[] {
  return shuffled(rng, DECK).slice(0, BOARD_CELLS);
}

export function generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): PokerPuzzle {
  return {
    number: puzzleNumber,
    cells: generateBoard(rngFromSeed(seed)),
    best: null,
    levers: ["none"],
  };
}

export function isValidBoard(cells: readonly number[]): boolean {
  return cells.length === BOARD_CELLS
    && cells.every((card) => Number.isInteger(card) && card >= 0 && card < 52)
    && new Set(cells).size === BOARD_CELLS;
}
