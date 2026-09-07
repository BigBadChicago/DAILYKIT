import { describe, expect, it } from "vitest";
import { solve } from "../../../src/games/poker-grid/solver.js";
import { BOARD_CELLS, type PokerState } from "../../../src/games/poker-grid/rules.js";

function smallBoard(): PokerState {
  const grid = Array<number | null>(BOARD_CELLS).fill(null);
  grid[0] = 0;
  grid[1] = 1;
  grid[2] = 8;
  grid[5] = 9;
  grid[6] = 10;
  return { grid, best: null, selection: [], hands: [], score: 0, terminal: false, exceededStoredBest: false };
}

describe("POKER GRID solver", () => {
  it("finds the available hand and reports an exact search", () => {
    const result = solve(smallBoard());
    expect(result.method).toBe("exact");
    expect(result.hands).toBe(1);
    expect(result.score).toBeGreaterThan(0);
    expect(result.nodes).toBeGreaterThan(0);
  });
});
