import { describe, expect, it } from "vitest";
import {
  generatePuzzle,
  isValidBoard,
  LEVERS,
  leversFor,
  weekdayFor,
  WEEKDAY_OFFSET,
} from "../../../src/games/poker-grid/generator.js";
import { seedFor } from "../../../src/core/seed.js";
import { BOARD_CELLS, BOARD_COLS } from "../../../src/games/poker-grid/rules.js";
import { classifyHand } from "../../../src/games/poker-grid/evaluator.js";

const cellsFor = (n: number): readonly number[] => generatePuzzle(n, seedFor("poker-grid", n)).cells;

describe("POKER GRID generation", () => {
  it("is deterministic for a puzzle number", () => {
    expect(cellsFor(31)).toEqual(cellsFor(31));
    expect(cellsFor(31)).not.toEqual(cellsFor(32));
  });

  it("draws 35 distinct cards from one deck on every day of a year", () => {
    for (let number = 1; number <= 365; number += 1) {
      const cells = cellsFor(number);
      expect(isValidBoard(cells)).toBe(true);
      expect(new Set(cells).size).toBe(BOARD_CELLS);
    }
  });

  it("places the epoch on a Thursday and cycles weekly", () => {
    expect(weekdayFor(1)).toBe(WEEKDAY_OFFSET);
    expect(weekdayFor(8)).toBe(weekdayFor(1));
    expect(new Set(Array.from({ length: 7 }, (_, i) => weekdayFor(i + 1))).size).toBe(7);
  });

  it("assigns levers by weekday and records only known levers", () => {
    for (let number = 1; number <= 21; number += 1) {
      expect(leversFor(number)).toEqual(leversFor(number + 7));
      for (const lever of leversFor(number)) expect(LEVERS).toContain(lever);
    }
  });

  /* Saturday carries the guaranteed-straight-flush lever, so the guarantee it makes
     has to hold on every Saturday, not merely on a sampled one. */
  it("guarantees a straight flush on the day whose lever promises one", () => {
    const saturdays: number[] = [];
    for (let number = 1; number <= 120; number += 1) {
      if (leversFor(number).includes("guaranteed-straight-flush")) saturdays.push(number);
    }
    expect(saturdays.length).toBeGreaterThan(10);
    for (const number of saturdays) {
      const cells = cellsFor(number);
      const found = cells.some((_, cell) => {
        if (cell + 4 * BOARD_COLS >= BOARD_CELLS) return false;
        const run = [0, 1, 2, 3, 4].map((step) => cells[cell + step * BOARD_COLS] as number);
        return classifyHand(run) === "straight-flush";
      });
      expect(found).toBe(true);
    }
  });

  /* 35 cells over 13 ranks cannot hold fewer than three of some rank, so the
     lever is at its floor: no quads anywhere, and exactly nine ranks tripled. */
  it("flattens ranks to the floor on the days that carry the rank spread lever", () => {
    for (const number of [1, 8, 15]) {
      expect(leversFor(number)).toContain("sparse-pairs");
      const perRank = new Map<number, number>();
      for (const card of cellsFor(number)) {
        const rank = Math.floor(card / 4);
        perRank.set(rank, (perRank.get(rank) ?? 0) + 1);
      }
      expect(Math.max(...perRank.values())).toBe(3);
      expect([...perRank.values()].filter((count) => count === 3)).toHaveLength(9);
    }
  });

  it("rejects a board that is not 35 distinct legal cards", () => {
    expect(isValidBoard([])).toBe(false);
    expect(isValidBoard(Array<number>(BOARD_CELLS).fill(3))).toBe(false);
    expect(isValidBoard(Array.from({ length: BOARD_CELLS }, (_, i) => i + 30))).toBe(false);
  });
});
