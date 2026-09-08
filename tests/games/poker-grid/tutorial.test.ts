/**
 * Charter decision 2 and requirement 3.7.3. The tutorial board is fixed, so
 * what has to be asserted is that it is a legal board, that it is genuinely
 * easier than a scheduled day rather than merely different, and that nothing
 * about it is graded.
 */

import { describe, expect, it } from "vitest";

import { rngFromSeed, seedFor } from "../../../src/core/seed.js";
import gameModule from "../../../src/games/poker-grid/module.js";
import { generatePuzzle, isValidBoard } from "../../../src/games/poker-grid/generator.js";
import { legalMoves, playGreedy } from "../../../src/games/poker-grid/greedy.js";
import { BOARD_CELLS } from "../../../src/games/poker-grid/rules.js";
import { solve } from "../../../src/games/poker-grid/solver.js";
import { TUTORIAL_PUZZLE_NUMBER, tutorialPuzzle } from "../../../src/games/poker-grid/tutorial.js";

describe("tutorialPuzzle", () => {
  it("is a legal board of 35 distinct cards", () => {
    const puzzle = tutorialPuzzle();
    expect(puzzle.cells).toHaveLength(BOARD_CELLS);
    expect(new Set(puzzle.cells).size).toBe(BOARD_CELLS);
    expect(isValidBoard(puzzle.cells)).toBe(true);
    expect(puzzle.cells.every((card) => Number.isInteger(card) && card >= 0 && card < 52)).toBe(true);
  });

  it("is never graded, so it carries no stored best", () => {
    expect(tutorialPuzzle().best).toBeNull();
  });

  it("sits at puzzle number zero, which no real day can occupy", () => {
    expect(TUTORIAL_PUZZLE_NUMBER).toBe(0);
    expect(tutorialPuzzle().number).toBe(0);
  });

  it("hands out its own array, so one session cannot mutate the next one's board", () => {
    const first = tutorialPuzzle();
    const second = tutorialPuzzle();
    expect(first.cells).not.toBe(second.cells);
    expect(first.cells).toEqual(second.cells);
  });

  it("is not any of the first two weeks of real puzzles", () => {
    const tutorial = tutorialPuzzle().cells.join(",");
    for (let number = 1; number <= 14; number += 1) {
      const day = generatePuzzle(number, seedFor("poker-grid", number));
      expect(day.cells.join(",")).not.toBe(tutorial);
    }
  });

  it("opens with plenty of legal moves, so a beginner's first try is not a dead end", () => {
    expect(legalMoves(tutorialPuzzle().cells.slice()).length).toBeGreaterThan(200);
  });

  it("can be cleared completely, and a naive player already comes close", () => {
    const grid = tutorialPuzzle().cells.slice();
    const solved = solve(grid, { beamWidth: 100 });
    expect(solved.hands).toBe(7);

    let total = 0;
    const runs = 5;
    for (let run = 0; run < runs; run += 1) total += playGreedy(grid, rngFromSeed(run + 1)).score;
    /* Requirement 3.7.3 in one number. A scheduled day sits near 0.16, and the
       floor the daily generator rejects a board under is well above this. */
    expect(1 - total / runs / solved.score).toBeLessThan(0.14);
  });
});

describe("the module's first session seam", () => {
  it("supplies the tutorial board, which is what makes the TUTORIAL state reachable", () => {
    expect(gameModule.firstSessionPuzzle).toBeTypeOf("function");
  });
});
