import { describe, expect, it } from "vitest";
import module from "../../../src/games/poker-grid/module.js";
import type { GameModule } from "../../../src/contract/game-module.js";
import { generatePuzzle } from "../../../src/games/poker-grid/generator.js";
import { BOARD_CELLS, type PokerAction, type PokerState } from "../../../src/games/poker-grid/rules.js";
import type { PokerPuzzle } from "../../../src/games/poker-grid/generator.js";
import { encodeBoard } from "../../../src/games/poker-grid/manifest-codec.js";

const game = module as unknown as GameModule<PokerState, PokerAction, PokerPuzzle>;

function puzzle() {
  return generatePuzzle(1, 1234);
}

describe("POKER GRID module", () => {
  it("points the shell at the generated data manifest", () => {
    expect(module.manifest.indexUrl).toBe("/data/poker-grid/manifest.index.json");
    expect(module.manifest.indexUrl).toBe("/data/poker-grid/manifest.index.json");
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

  /* The shell hands parsePuzzle a manifest entry verbatim, so the entry shape
     the generator writes and the shape the module reads are one contract. */
  it("parses a manifest entry, decoding the board the generator encoded", () => {
    const cells = puzzle().cells;
    const entry = {
      number: 1,
      board: encodeBoard(1, cells),
      best: { score: 5670, hands: 7, method: "beam" as const, width: 400 },
      levers: ["sparse-pairs"],
    };
    const parsed = game.parsePuzzle(1, entry);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.cells).toEqual(cells);
    expect(parsed.value.best).toEqual(entry.best);
    expect(parsed.value.levers).toEqual(["sparse-pairs"]);
  });

  it("refuses a manifest entry it cannot trust rather than guessing", () => {
    const cells = puzzle().cells;
    const good = { number: 1, board: encodeBoard(1, cells), best: null, levers: [] };
    expect(game.parsePuzzle(1, good).ok).toBe(true);
    expect(game.parsePuzzle(1, null).ok).toBe(false);
    expect(game.parsePuzzle(1, { ...good, board: "nonsense" }).ok).toBe(false);
    /* The right board under the wrong day number does not decode. */
    expect(game.parsePuzzle(2, good).ok).toBe(false);
    expect(game.parsePuzzle(1, { ...good, best: { score: 1, hands: 1, method: "guess" } }).ok).toBe(false);
    expect(game.parsePuzzle(1, { ...good, levers: [7] }).ok).toBe(false);
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
