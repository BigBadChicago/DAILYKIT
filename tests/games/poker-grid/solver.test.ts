import { describe, expect, it } from "vitest";
import { solve, DEFAULT_BEAM_WIDTH } from "../../../src/games/poker-grid/solver.js";
import { BOARD_CELLS, type Grid } from "../../../src/games/poker-grid/rules.js";
import { generatePuzzle } from "../../../src/games/poker-grid/generator.js";
import { seedFor } from "../../../src/core/seed.js";
import { CLEAR_VALUE_PER_HAND, HAND_POINTS } from "../../../src/games/poker-grid/scoring.js";

function smallBoard(): Grid {
  const grid = Array<number | null>(BOARD_CELLS).fill(null);
  /* Two deuces and three fours: a full house, and the only hand here. */
  grid[0] = 0;
  grid[1] = 1;
  grid[2] = 8;
  grid[5] = 9;
  grid[6] = 10;
  return grid;
}

describe("POKER GRID solver", () => {
  it("searches a small board exhaustively and says so", () => {
    const result = solve(smallBoard());
    expect(result.method).toBe("exact");
    expect(result.width).toBeUndefined();
    expect(result.hands).toBe(1);
    expect(result.score).toBe(CLEAR_VALUE_PER_HAND + HAND_POINTS["full-house"]);
  });

  it("reports zero from a board with no legal hand rather than throwing", () => {
    const grid = Array<number | null>(BOARD_CELLS).fill(null);
    const result = solve(grid);
    expect(result).toMatchObject({ score: 0, hands: 0, method: "exact" });
  });

  it("falls back to beam on a full board and carries the width that produced the score", () => {
    const board = generatePuzzle(1, seedFor("poker-grid", 1)).cells;
    const result = solve(board);
    expect(result.method).toBe("beam");
    expect(result.width).toBe(DEFAULT_BEAM_WIDTH);
    expect(result.hands).toBeGreaterThanOrEqual(6);
  });

  it("is deterministic and never scores below a narrower beam", () => {
    const board = generatePuzzle(2, seedFor("poker-grid", 2)).cells;
    const wide = solve(board, { exactCeiling: 1, beamWidth: 200 });
    expect(solve(board, { exactCeiling: 1, beamWidth: 200 })).toEqual(wide);
    const narrow = solve(board, { exactCeiling: 1, beamWidth: 20 });
    expect(wide.score).toBeGreaterThanOrEqual(narrow.score);
  });

  it("never claims exact after exhausting its ceiling", () => {
    const board = generatePuzzle(3, seedFor("poker-grid", 3)).cells;
    expect(solve(board, { exactCeiling: 1, beamWidth: 40 }).method).toBe("beam");
  });
});
