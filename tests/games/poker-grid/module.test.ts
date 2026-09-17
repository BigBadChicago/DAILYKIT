import { describe, expect, it } from "vitest";
import module, { internals, pokerGridV3 } from "../../../src/games/poker-grid/module.js";
import type { GameModule } from "../../../src/contract/game-module.js";
import { generatePuzzle } from "../../../src/games/poker-grid/generator.js";
import { BOARD_CELLS, EMPTY_EFFORT, MAX_HANDS, type PokerAction, type PokerState } from "../../../src/games/poker-grid/rules.js";
import type { PokerPuzzle } from "../../../src/games/poker-grid/generator.js";
import { encodeBoard } from "../../../src/games/poker-grid/manifest-codec.js";
import { UNRATED_DIFFICULTY, resetDifficultyMemo } from "../../../src/games/poker-grid/difficulty.js";

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
      attempt: 3,
    };
    const parsed = game.parsePuzzle(1, entry);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.cells).toEqual(cells);
    expect(parsed.value.best).toEqual(entry.best);
    expect(parsed.value.levers).toEqual(["sparse-pairs"]);
    /* Phase 4. The greedy salt is keyed by the attempt, so a board only the
       manifest knows still reproduces the nine runs its difficulty measures. */
    expect(parsed.value.attempt).toBe(3);
  });

  it("reads a missing attempt as the board a past horizon client regenerates", () => {
    const cells = puzzle().cells;
    const entry = { number: 1, board: encodeBoard(1, cells), best: null, levers: [] };
    const parsed = game.parsePuzzle(1, entry);
    expect(parsed.ok).toBe(true);
    if (!parsed.ok) return;
    expect(parsed.value.attempt).toBe(0);
    expect(game.parsePuzzle(1, { ...entry, attempt: -1 }).ok).toBe(false);
    expect(game.parsePuzzle(1, { ...entry, attempt: 1.5 }).ok).toBe(false);
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

  /* Phase 4. The effort record is new state and there is no honest migration
     into it, so a v1 save is refused rather than filled with zeros. Engine
     decision 10 prices that at one unfinished board and never a streak. */
  it("carries state version 2 and refuses every path into it", () => {
    expect(internals.STATE_VERSION).toBe(2);
    expect(module.stateVersion).toBe(2);
    const board = puzzle();
    const v1 = { v: 1, data: { g: ".".repeat(BOARD_CELLS), s: [], h: [], x: false } };
    expect(game.deserialize(board, v1).ok).toBe(false);
    expect(game.migrateState(1, v1).ok).toBe(false);
  });

  it("round trips the effort record and refuses one that could not have happened", () => {
    const board = puzzle();
    const started = game.initialState(board);
    const raw = game.serialize(started);
    expect(game.deserialize(board, raw).ok).toBe(true);

    const data = raw.data as Record<string, unknown>;
    /* A committed hand cost at least the five taps it took. */
    expect(game.deserialize(board, { v: 2, data: { ...data, e: [[2, 0]] } }).ok).toBe(false);
    /* One record per hand, no more and no fewer. */
    expect(game.deserialize(board, { v: 2, data: { ...data, e: [[5, 0]] } }).ok).toBe(false);
    expect(game.deserialize(board, { v: 2, data: { ...data, p: [-1, 0] } }).ok).toBe(false);
    expect(game.deserialize(board, { v: 2, data: { ...data, p: "no" } }).ok).toBe(false);
  });

  /* ARCHITECTURE2 sections 47 and 56. One object, two seams: the default export
     is what the shell still uses and the v3 view is the same implementation. */
  it("exposes the same implementation through the v3 seam", () => {
    resetDifficultyMemo();
    expect(pokerGridV3.identity).toEqual(module.identity);
    expect(pokerGridV3.stateVersion).toBe(module.stateVersion);
    expect(pokerGridV3.shareCapabilities.grammar).toBe("A");
    expect(pokerGridV3.shareCapabilities.maxRows).toBe(MAX_HANDS);
    expect(pokerGridV3.shareCapabilities.patterns.length).toBeGreaterThanOrEqual(2);
  });

  it("measures a difficulty on a graded board and stays unrated without one", () => {
    resetDifficultyMemo();
    const ungraded = puzzle();
    expect(internals.difficulty(ungraded)).toBe(UNRATED_DIFFICULTY);
    const graded: PokerPuzzle = { ...ungraded, best: { score: 5670, hands: 7, method: "beam", width: 400 } };
    expect(internals.difficulty(graded)).not.toBe(UNRATED_DIFFICULTY);
    expect(Number.isInteger(internals.difficulty(graded))).toBe(true);
  });

  /* v3 migration phase 5. The shell reads the bucket from the outcome, so the
     v2 bucketOf that the stats history was written with must agree with it on
     every board, graded or not. */
  it("keeps the v2 bucketOf agreed with the outcome the shell now reads", () => {
    resetDifficultyMemo();
    for (const best of [null, { score: 5670, hands: 7, method: "beam" as const, width: 400 }]) {
      const board: PokerPuzzle = { ...puzzle(), best };
      for (const cleared of [0, 5, 20, 35]) {
        const start = game.initialState(board);
        const state: PokerState = {
          ...start,
          grid: start.grid.map((card, cell) => (cell < cleared ? null : card)),
          terminal: true,
        };
        const outcome = pokerGridV3.inspect(state as never);
        expect(outcome.kind).toBe("finished");
        if (outcome.kind !== "finished") continue;
        expect(internals.bucketOf(outcome, state)).toBe(outcome.bucket);
      }
    }
  });

  /* The v2 block and the v3 artifact are built from the same two functions, so
     a change to one that did not reach the other would fail here. */
  it("keeps the v2 block and the v3 artifact agreed", () => {
    resetDifficultyMemo();
    const board: PokerPuzzle = { ...puzzle(), best: { score: 5670, hands: 7, method: "beam", width: 400 } };
    const state: PokerState = { ...game.initialState(board), terminal: true, effort: [], pending: EMPTY_EFFORT };
    const context = { puzzleNumber: 1, currentStreak: 3, rated: true };
    const block = game.shareBlock(state, context);
    const artifact = internals.shareArtifact(board, state, internals.telemetry(state), context);
    expect(artifact.title).toBe(block.title);
    expect(artifact.rows).toEqual(block.rows);
  });
});
