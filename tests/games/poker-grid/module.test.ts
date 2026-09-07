import { describe, expect, it } from "vitest";
import module from "../../../src/games/poker-grid/module.js";
import type { GameModule } from "../../../src/contract/game-module.js";
import { generatePuzzle } from "../../../src/games/poker-grid/generator.js";
import { BOARD_CELLS, type PokerAction, type PokerState } from "../../../src/games/poker-grid/rules.js";
import type { PokerPuzzle } from "../../../src/games/poker-grid/generator.js";

const game = module as unknown as GameModule<PokerState, PokerAction, PokerPuzzle>;

function puzzle() {
  return generatePuzzle(1, 1234);
}

describe("POKER GRID module", () => {
  it("points the shell at the generated data manifest", () => {
    expect(module.manifest.indexUrl).toBe("/data/poker-grid/manifest.index.json");
    expect(module.manifest.urlForChunk(1)).toBe("/data/poker-grid/manifest.2026-01.json");
  });

  it("generates deterministic 35 card puzzles", () => {
    const first = puzzle();
    const second = puzzle();
    expect(first.cells).toEqual(second.cells);
    expect(first.cells).toHaveLength(BOARD_CELLS);
    expect(new Set(first.cells).size).toBe(BOARD_CELLS);
  });

  it("round trips a live state through the versioned snapshot", () => {
    const board = puzzle();
    const initial = game.initialState(board);
    const raw = game.serialize(initial);
    const restored = game.deserialize(board, raw);
    expect(restored.ok).toBe(true);
    if (!restored.ok) return;
    expect(restored.value.grid).toEqual(initial.grid);
    expect(restored.value.score).toBe(0);
    expect(restored.value.terminal).toBe(initial.terminal);
  });

  it("rejects a snapshot from a different puzzle", () => {
    const first = puzzle();
    const second = generatePuzzle(2, 5678);
    const raw = game.serialize(game.initialState(first));
    expect(game.deserialize(second, raw).ok).toBe(false);
  });

  it("reports the unrated share form without a streak", () => {
    const state: PokerState = {
      ...game.initialState(puzzle()),
      terminal: true,
      hands: [],
    };
    const share = game.shareBlock(state, { puzzleNumber: 1, currentStreak: 12, rated: false });
    expect(share.title).toBe("POKER GRID #1 unrated");
    expect(share.rows).toEqual([]);
  });
});
