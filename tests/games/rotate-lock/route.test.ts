import { describe, expect, it } from "vitest";

import {
  CELLS,
  arrangementKey,
  stepFrom,
  trace,
  turnClockwise,
  type Arrangement,
  type Direction,
  type Layout,
} from "../../../src/games/rotate-lock/route.js";
import { fixturePuzzle, openingsOf } from "./fixtures.js";

const ORDER = [0, 1, 2, 3, 4, 5, 6];
const ones = (facing: Direction[]): Arrangement => ({ order: ORDER, facing });
/** Seven one cell pieces from the top left corner. */
const open: Layout = { start: 0, lock: 17, marks: [5], lengths: [1, 1, 1, 1, 1, 1, 1] };
const RIGHT_THEN_DOWN: Direction[] = [1, 1, 1, 1, 1, 2, 2];

describe("ROTATE LOCK geometry", () => {
  it("steps inside the board and returns -1 off it", () => {
    expect(stepFrom(0, 0)).toBe(-1);
    expect(stepFrom(0, 3)).toBe(-1);
    expect(stepFrom(0, 1)).toBe(1);
    expect(stepFrom(0, 2)).toBe(6);
    expect(stepFrom(CELLS - 1, 1)).toBe(-1);
    expect(stepFrom(CELLS - 1, 2)).toBe(-1);
    expect(stepFrom(5, 1)).toBe(-1);
    expect(stepFrom(6, 3)).toBe(-1);
  });

  it("turns clockwise through all four directions", () => {
    expect([0, 1, 2, 3].map((dir) => turnClockwise(dir as Direction))).toEqual([1, 2, 3, 0]);
  });

  it("keys an arrangement by order and facing", () => {
    expect(arrangementKey(ones(RIGHT_THEN_DOWN))).toBe("0123456:1111122");
  });
});

describe("the trace, every rule of ROTATE-LOCK.md 6.2", () => {
  it("opens when the route turns at every mark and ends on the lock, and may turn elsewhere", () => {
    const result = trace(open, ones(RIGHT_THEN_DOWN));
    expect(result).toMatchObject({ open: true, failure: null, failedSlot: null, turned: [5] });
    expect(result.steps.map((step) => step.cell)).toEqual([1, 2, 3, 4, 5, 11, 17]);
    const freeTurn: Layout = { ...open, lock: 22, marks: [] };
    expect(trace(freeTurn, ones([1, 1, 1, 1, 2, 2, 2])).open).toBe(true);
  });

  it("reports a piece that runs off the board", () => {
    expect(trace(open, ones([0, 1, 1, 1, 1, 2, 2]))).toMatchObject({ failure: "off-board", failedSlot: 0, failedCell: -1 });
  });

  it("reports a piece that crosses the route, the start included", () => {
    expect(trace(open, ones([2, 0, 1, 1, 1, 1, 1]))).toMatchObject({ failure: "crossing", failedSlot: 1, failedCell: 0 });
    expect(trace(open, ones([1, 2, 3, 0, 1, 1, 1]))).toMatchObject({ failure: "crossing", failedSlot: 3, failedCell: 0 });
  });

  it("reports going straight through a mark, at a junction and inside a piece", () => {
    const marked: Layout = { ...open, marks: [2] };
    expect(trace(marked, ones([1, 1, 1, 1, 1, 2, 2]))).toMatchObject({ failure: "through-mark", failedSlot: 2, failedCell: 2 });
    const long: Layout = { start: 0, lock: 35, marks: [2], lengths: [3, 1, 1, 1, 1, 1, 1] };
    expect(trace(long, ones([1, 2, 2, 2, 2, 2, 1]))).toMatchObject({ failure: "through-mark", failedSlot: 0, failedCell: 2 });
  });

  it("reports reaching the lock before the last piece", () => {
    const near: Layout = { ...open, lock: 2 };
    expect(trace(near, ones([1, 1, 1, 1, 1, 2, 2]))).toMatchObject({ failure: "early-lock", failedSlot: 1, failedCell: 2 });
  });

  it("reports a route that ends away from the lock", () => {
    expect(trace({ ...open, lock: 35 }, ones(RIGHT_THEN_DOWN))).toMatchObject({ failure: "short-of-lock", failedSlot: null });
  });

  it("reports a route that ends on the lock but misses a mark", () => {
    const result = trace({ ...open, marks: [5, 8] }, ones(RIGHT_THEN_DOWN));
    expect(result).toMatchObject({ failure: "missed-marks", failedSlot: null, turned: [5] });
  });

  it("opens the tutorial board for every arrangement that draws its route and nothing else in its neighbourhood", () => {
    const puzzle = fixturePuzzle();
    const openings = openingsOf(puzzle);
    expect(openings.length).toBeGreaterThan(1);
    for (const arrangement of openings) expect(trace(puzzle, arrangement).open).toBe(true);
    const start = { order: puzzle.startOrder, facing: puzzle.startFacing };
    expect(trace(puzzle, start).open).toBe(false);
  });
});
