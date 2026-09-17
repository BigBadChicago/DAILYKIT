import { describe, expect, it } from "vitest";
import { isErr, isOk } from "../../../src/core/result.js";
import { classifyHand } from "../../../src/games/poker-grid/evaluator.js";
import {
  BOARD_CELLS,
  EMPTY_EFFORT,
  MAX_HANDS,
  applyPokerAction,
  bucketFor,
  enumerateSelections,
  hasLegalMove,
  neighbours,
  remainingCards,
  visitSelections,
  settle,
  type PokerState,
} from "../../../src/games/poker-grid/rules.js";
import type { PokerPuzzle } from "../../../src/games/poker-grid/generator.js";

const card = (rank: number, suit: number): number => (rank - 2) * 4 + suit;
const fullGrid = (): number[] => Array.from({ length: BOARD_CELLS }, (_, index) => index);
/* Ungraded on purpose. These tests are about the rules, and a null best keeps
   the difficulty measure out of them entirely. */
const puzzleOf = (cells: readonly number[]): PokerPuzzle => ({
  number: 1,
  cells,
  best: null,
  levers: ["none"],
  attempt: 0,
});

const state = (grid: readonly (number | null)[]): PokerState => ({
  grid,
  puzzle: puzzleOf(grid.filter((card): card is number => card !== null)),
  selection: [],
  hands: [],
  score: 0,
  terminal: false,
  effort: [],
  pending: EMPTY_EFFORT,
});

describe("poker grid rules", () => {
  it("settles each column downward and preserves order", () => {
    const grid = Array<number | null>(BOARD_CELLS).fill(null);
    grid[0] = 1;
    grid[2] = 2;
    grid[6] = 3;
    const settled = settle(grid);
    expect(settled[30]).toBe(1);
    expect(settled[32]).toBe(2);
    expect(settled[31]).toBe(3);
  });

  /* The count is the specification. A full five by seven board holds exactly
     961 connected five cell sets, and the walk must produce each one once: a
     duplicate would double count a hand in the calibration study and inflate
     the solver's branching factor. */
  it("enumerates every connected five cell set exactly once", () => {
    const selections = enumerateSelections(fullGrid());
    expect(selections).toHaveLength(961);
    const canonical = selections.map((selection) => [...selection].sort((a, b) => a - b).join(","));
    expect(new Set(canonical).size).toBe(961);
    expect(selections.every((selection) => selection.length === 5)).toBe(true);
  });

  it("only walks occupied cells and yields connected sets", () => {
    const grid = fullGrid().map((card, index) => index % 5 === 0 ? null : card);
    const selections = enumerateSelections(grid);
    expect(selections.length).toBeGreaterThan(0);
    for (const selection of selections) {
      expect(selection.every((cell) => grid[cell] !== null)).toBe(true);
      const remaining = new Set(selection.slice(1));
      const queue = [selection[0] as number];
      while (queue.length > 0) {
        for (const next of neighbours(queue.pop() as number)) {
          if (remaining.delete(next)) queue.push(next);
        }
      }
      expect(remaining.size).toBe(0);
    }
  });

  it("stops the walk as soon as the visitor says so", () => {
    let seen = 0;
    visitSelections(fullGrid(), () => {
      seen += 1;
      return seen === 3;
    });
    expect(seen).toBe(3);
  });

  it("finds no legal move on an empty board and one on a full board", () => {
    expect(hasLegalMove(Array<number | null>(BOARD_CELLS).fill(null))).toBe(false);
    expect(hasLegalMove(fullGrid())).toBe(true);
  });

  it("returns the specified rejection values", () => {
    const grid = fullGrid();
    const outOfRange = applyPokerAction(state(grid), { kind: "add", cell: -1 });
    expect(isErr(outOfRange) && outOfRange.error.code).toBe("out-of-range");
    const tooHigh = applyPokerAction(state(grid), { kind: "add", cell: 35 });
    expect(isErr(tooHigh) && tooHigh.error.code).toBe("out-of-range");
    const empty = grid.map((card, index) => index === 0 ? null : card);
    const emptyResult = applyPokerAction(state(empty), { kind: "add", cell: 0 });
    expect(isErr(emptyResult) && emptyResult.error.code).toBe("empty-cell");
    expect(applyPokerAction(state(grid), { kind: "add", cell: 0 }).ok).toBe(true);
    const selected = { ...state(grid), selection: [0] };
    const notAdjacent = applyPokerAction(selected, { kind: "add", cell: 2 });
    expect(isErr(notAdjacent) && notAdjacent.error.code).toBe("not-adjacent");
    const alreadySelected = applyPokerAction(selected, { kind: "add", cell: 0 });
    expect(isErr(alreadySelected) && alreadySelected.error.code).toBe("already-selected");
    const full = applyPokerAction({ ...selected, selection: [0, 1, 2, 3, 4] }, { kind: "add", cell: 5 });
    expect(isErr(full) && full.error.code).toBe("selection-full");
    const selectedTwo = { ...state(grid), selection: [0, 1] };
    const truncated = applyPokerAction(selectedTwo, { kind: "truncate", index: 1 });
    expect(isOk(truncated) && truncated.value.selection).toEqual([0]);
    const cleared = applyPokerAction(selected, { kind: "truncate", index: 0 });
    expect(isOk(cleared) && cleared.value.selection).toEqual([]);
    const badTruncate = applyPokerAction(selected, { kind: "truncate", index: 2 });
    expect(isErr(badTruncate) && badTruncate.error.code).toBe("bad-index");
  });

  it("commits a legal hand, clears it, and settles the board", () => {
    const grid = fullGrid();
    grid[0] = card(9, 0);
    grid[1] = card(9, 1);
    grid[2] = card(2, 2);
    grid[5] = card(5, 0);
    grid[6] = card(13, 3);
    const selected = { ...state(grid), selection: [0, 1, 2, 5, 6] };
    const result = applyPokerAction(selected, { kind: "commit" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.hands[0]?.category).toBe("one-pair");
    expect(result.value.selection).toEqual([]);
    expect(result.value.score).toBeGreaterThan(0);
    expect(result.value.grid.filter((card) => card !== null)).toHaveLength(30);
  });

  /* The v3 run log, phase 4. Only accepted actions are counted, because a
     refusal returns err and never produces a state to count into, which is what
     keeps applyPokerAction pure and keeps a refused action byte identical. */
  it("counts accepted taps and takebacks into the hand being built", () => {
    const grid = fullGrid();
    let current = state(grid);
    for (const cell of [0, 1, 2]) {
      const next = applyPokerAction(current, { kind: "add", cell });
      expect(next.ok).toBe(true);
      if (!next.ok) return;
      current = next.value;
    }
    expect(current.pending).toEqual({ taps: 3, backs: 0 });

    const back = applyPokerAction(current, { kind: "truncate", index: 1 });
    expect(isOk(back) && back.value.pending).toEqual({ taps: 3, backs: 1 });
  });

  it("leaves the run untouched when an action is refused", () => {
    const grid = fullGrid();
    const current = { ...state(grid), selection: [0], pending: { taps: 1, backs: 0 } };
    const refused = applyPokerAction(current, { kind: "add", cell: 2 });
    expect(isErr(refused)).toBe(true);
    /* The state the caller still holds is the one it had, unchanged. */
    expect(current.pending).toEqual({ taps: 1, backs: 0 });
  });

  it("files the pending effort against the hand it built and starts the next one clean", () => {
    const grid = fullGrid();
    grid[0] = card(9, 0);
    grid[1] = card(9, 1);
    grid[2] = card(2, 2);
    grid[5] = card(5, 0);
    grid[6] = card(13, 3);
    const selected = { ...state(grid), selection: [0, 1, 2, 5, 6], pending: { taps: 8, backs: 2 } };
    const result = applyPokerAction(selected, { kind: "commit" });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.effort).toEqual([{ taps: 8, backs: 2 }]);
    expect(result.value.pending).toEqual(EMPTY_EFFORT);
    expect(result.value.effort).toHaveLength(result.value.hands.length);
  });

  it("states the board facts the outcome is built from", () => {
    expect(remainingCards(fullGrid())).toBe(BOARD_CELLS);
    expect(bucketFor(fullGrid())).toBe(7);
    expect(remainingCards(Array<number | null>(BOARD_CELLS).fill(null))).toBe(0);
    expect(bucketFor(Array<number | null>(BOARD_CELLS).fill(null))).toBe(0);
    expect(MAX_HANDS).toBe(7);
  });

  it("rejects high card commits and detects a terminal board", () => {
    const grid = fullGrid().map((card) => card);
    const selected = { ...state(grid), selection: [0, 5, 10, 15, 24] };
    expect(classifyHand(selected.selection.map((cell) => grid[cell] as number))).toBe("high-card");
    const rejected = applyPokerAction(selected, { kind: "commit" });
    expect(isErr(rejected) && rejected.error.code).toBe("no-hand");
    expect(hasLegalMove(Array(BOARD_CELLS).fill(null))).toBe(false);
  });
});
