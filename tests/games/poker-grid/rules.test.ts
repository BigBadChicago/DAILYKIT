import { describe, expect, it } from "vitest";
import { isErr, isOk } from "../../../src/core/result.js";
import { classifyHand } from "../../../src/games/poker-grid/evaluator.js";
import {
  BOARD_CELLS,
  applyPokerAction,
  enumerateSelections,
  hasLegalMove,
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

  it("enumerates connected sets once", () => {
    const selections = enumerateSelections(fullGrid());
    const keys = selections.map((selection) => selection.join(","));
    expect(new Set(keys).size).toBe(selections.length);
    expect(selections.every((selection) => selection.length === 5)).toBe(true);
    expect(selections.length).toBeGreaterThan(0);
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
