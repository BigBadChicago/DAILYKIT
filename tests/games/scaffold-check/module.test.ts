import { describe, expect, it } from "vitest";
import { isOk } from "../../../src/core/result.js";
import game from "../../../src/games/scaffold-check/module.js";

describe("SCAFFOLD CHECK module", () => {
  it("parses a puzzle and serializes it back", () => {
    const parsed = game.parsePuzzle(12, { target: 5, number: 12 });
    expect(isOk(parsed)).toBe(true);
    const puzzle = (parsed as unknown as { value: { number: number; target: number } }).value;
    const state = game.initialState(puzzle as never);
    const raw = game.serialize(state);
    const restored = game.deserialize(puzzle as never, raw);
    expect(isOk(restored)).toBe(true);
  });

  it("shares a title and a compact row", () => {
    const state = game.initialState({ number: 7, target: 0 } as never);
    const share = game.shareBlock(state, { puzzleNumber: 7, currentStreak: 0, rated: true });
    expect(share.title).toContain("#7");
    expect(share.rows[0]).toHaveLength(3);
  });
});
