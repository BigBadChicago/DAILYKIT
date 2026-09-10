import { describe, expect, it } from "vitest";

import { applyAction, inspect, initialState, isTerminal, type State } from "../../../src/games/scaffold-check/rules.js";

const puzzle = { number: 1, target: 4 };
const start = initialState(puzzle);

describe("SCAFFOLD CHECK rules", () => {
  it("accepts the target and rejects an already tapped cell", () => {
    const solved = applyAction(start, { kind: "tap", cell: 4 });
    expect(solved.ok).toBe(true);
    expect(solved.ok && solved.value.tapped).toEqual([4]);
    const again = applyAction(solved.ok ? solved.value : start, { kind: "tap", cell: 4 });
    expect(again.ok).toBe(false);
  });

  it("returns values for out of range input and a finished puzzle", () => {
    expect(applyAction(start, { kind: "tap", cell: -1 })).toMatchObject({
      ok: false,
      error: { code: "outOfRange" },
    });
    let state = start;
    for (const cell of [0, 1, 2]) {
      const result = applyAction(state, { kind: "tap", cell });
      if (!result.ok) throw new Error(result.error.code);
      state = result.value;
    }
    expect(isTerminal(state)).toBe(true);
    expect(applyAction(state, { kind: "tap", cell: 3 })).toMatchObject({
      ok: false,
      error: { code: "gameOver" },
    });
  });

  it("marks a finished board and records misses", () => {
    const state: State = { puzzleNumber: 1, target: 4, tapped: [4], misses: 2 };
    expect(inspect(state)).toMatchObject({ kind: "finished", won: true, detail: "2 misses" });
    expect(inspect({ puzzleNumber: 1, target: 4, tapped: [0, 1, 2], misses: 3 })).toMatchObject({
      kind: "finished",
      won: false,
      tier: 4,
    });
  });
});
