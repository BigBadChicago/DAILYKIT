import { err, ok, type Result } from "../../core/result.js";
import type { Rejection } from "../../core/types.js";
import { HAND_ORDINAL, type HandCategory } from "../../shared/poker-hands.js";
import { classifyHand, handOrdinal, HAND_SIZE } from "./evaluator.js";
import { CARD_CLEAR_POINTS, pointsFor } from "./scoring.js";
import type { PokerBest } from "./generator.js";

export const BOARD_COLS = 5;
export const BOARD_ROWS = 7;
export const BOARD_CELLS = BOARD_COLS * BOARD_ROWS;

export type Card = number;
export type Grid = readonly (Card | null)[];
export type HandRecord = {
  readonly category: Exclude<HandCategory, "high-card">;
  readonly points: number;
};

export interface PokerState {
  readonly grid: Grid;
  readonly best: PokerBest | null;
  readonly selection: readonly number[];
  readonly hands: readonly HandRecord[];
  readonly score: number;
  readonly terminal: boolean;
  readonly exceededStoredBest: boolean;
}

export type PokerAction =
  | { readonly kind: "add"; readonly cell: number }
  | { readonly kind: "truncate"; readonly index: number }
  | { readonly kind: "commit" };

export function neighbours(cell: number): readonly number[] {
  const row = Math.floor(cell / BOARD_COLS);
  const col = cell % BOARD_COLS;
  const result: number[] = [];
  if (row > 0) result.push(cell - BOARD_COLS);
  if (col > 0) result.push(cell - 1);
  if (col + 1 < BOARD_COLS) result.push(cell + 1);
  if (row + 1 < BOARD_ROWS) result.push(cell + BOARD_COLS);
  return result;
}

export function settle(grid: Grid): Grid {
  if (grid.length !== BOARD_CELLS) throw new RangeError("grid must contain 35 cells");
  const settled = Array<Card | null>(BOARD_CELLS).fill(null);
  for (let col = 0; col < BOARD_COLS; col += 1) {
    let write = BOARD_ROWS - 1;
    for (let row = BOARD_ROWS - 1; row >= 0; row -= 1) {
      const card = grid[row * BOARD_COLS + col];
      if (card !== null && card !== undefined) {
        settled[write * BOARD_COLS + col] = card;
        write -= 1;
      }
    }
  }
  return settled;
}

function isOccupied(grid: Grid, cell: number): boolean {
  return grid[cell] !== null;
}

function adjacentToSelection(selection: readonly number[], cell: number): boolean {
  return selection.some((selected) => neighbours(selected).includes(cell));
}

export function legalSelection(grid: Grid, selection: readonly number[]): boolean {
  if (selection.length !== HAND_SIZE || new Set(selection).size !== HAND_SIZE) return false;
  return selection.every((cell, index) => isOccupied(grid, cell) && (index === 0 || adjacentToSelection(selection.slice(0, index), cell)));
}

export function hasLegalMove(grid: Grid): boolean {
  for (const selection of enumerateSelections(grid)) {
    if (handOrdinal(selection.map((cell) => grid[cell] as number)) > HAND_ORDINAL["high-card"]) return true;
  }
  return false;
}

export function enumerateSelections(grid: Grid): readonly (readonly number[])[] {
  if (grid.length !== BOARD_CELLS) throw new RangeError("grid must contain 35 cells");
  const occupied = grid.flatMap((card, index) => card === null ? [] : [index]);
  const found: number[][] = [];
  const choose = (start: number, picked: number[]): void => {
    if (picked.length === HAND_SIZE) {
      if (isConnected(picked)) found.push(picked.slice());
      return;
    }
    for (let i = start; i < occupied.length; i += 1) {
      picked.push(occupied[i] as number);
      choose(i + 1, picked);
      picked.pop();
    }
  };
  choose(0, []);
  return found;
}

function isConnected(cells: readonly number[]): boolean {
  const pending = [cells[0] as number];
  const remaining = new Set(cells.slice(1));
  while (pending.length > 0) {
    const current = pending.pop() as number;
    for (const next of neighbours(current)) {
      if (remaining.delete(next)) pending.push(next);
    }
  }
  return remaining.size === 0;
}

export function applyPokerAction(state: PokerState, action: PokerAction): Result<PokerState, Rejection> {
  if (state.terminal) return err({ code: "finished", announce: "Board finished." });

  if (action.kind === "add") {
    if (action.cell < 0 || action.cell >= BOARD_CELLS) return err({ code: "out-of-range", announce: "" });
    if (state.grid[action.cell] === null) return err({ code: "empty-cell", announce: "That space is empty." });
    if (state.selection.includes(action.cell)) return err({ code: "already-selected", announce: "That card is already chosen." });
    if (state.selection.length === HAND_SIZE) return err({ code: "selection-full", announce: "Five cards chosen already. Take one back to change your path." });
    if (state.selection.length > 0 && !adjacentToSelection(state.selection, action.cell)) {
      return err({ code: "not-adjacent", announce: "Cards must touch edge to edge." });
    }
    return ok({ ...state, selection: [...state.selection, action.cell] });
  }

  if (action.kind === "truncate") {
    if (action.index < 0 || action.index >= state.selection.length) return err({ code: "bad-index", announce: "" });
    return ok({ ...state, selection: state.selection.slice(0, action.index) });
  }

  if (state.selection.length !== HAND_SIZE) return err({ code: "incomplete", announce: "Choose five cards." });
  const cards = state.selection.map((cell) => state.grid[cell] as number);
  const category = classifyHand(cards);
  if (category === "high-card") return err({ code: "no-hand", announce: "Those five do not make a pair or better." });
  const nextGrid = settle(state.grid.map((card, cell) => state.selection.includes(cell) ? null : card));
  const hand = { category, points: pointsFor(category) };
  const hands = [...state.hands, hand];
  const next = {
    ...state,
    grid: nextGrid,
    selection: [],
    hands,
    score: state.score + hand.points + CARD_CLEAR_POINTS * HAND_SIZE,
    terminal: !hasLegalMove(nextGrid),
  };
  return ok(next);
}
