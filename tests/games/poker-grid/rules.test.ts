import { describe, expect, it } from "vitest";
import { isErr, isOk } from "../../../src/core/result.js";
import { classifyHand } from "../../../src/games/poker-grid/evaluator.js";
import {
  BOARD_CELLS,
  applyPokerAction,
  enumerateSelections,
  hasLegalMove,
  neighbours,
  visitSelections,
  settle,
  type PokerState,
} from "../../../src/games/poker-grid/rules.js";

const card = (rank: number, suit: number): number => (rank - 2) * 4 + suit;
const fullGrid = (): number[] => Array.from({ length: BOARD_CELLS }, (_, index) => index);
const state = (grid: readonly (number | null)[]): PokerState => ({
  grid,
  best: null,
  selection: [],
  hands: [],
  score: 0,
  terminal: false,
  exceededStoredBest: false,
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

  it("rejects high card commits and detects a terminal board", () => {
    const grid = fullGrid().map((card) => card);
    const selected = { ...state(grid), selection: [0, 5, 10, 15, 24] };
    expect(classifyHand(selected.selection.map((cell) => grid[cell] as number))).toBe("high-card");
    const rejected = applyPokerAction(selected, { kind: "commit" });
    expect(isErr(rejected) && rejected.error.code).toBe("no-hand");
    expect(hasLegalMove(Array(BOARD_CELLS).fill(null))).toBe(false);
  });
});
