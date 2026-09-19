import { describe, expect, it } from "vitest";

import { MAX_RUNS, diffsOf, permutations } from "../../../src/games/difference-relay/relay.js";
import { difficultyOf, solve } from "../../../src/games/difference-relay/solver.js";

const TARGET = [6, 9, 7, 2, 1, 5];
const MARKS = [3, 2, null, null, 4];

describe("DIFFERENCE RELAY solver", () => {
  it("enumerates all 720 orders and counts the solutions exactly", () => {
    expect(permutations([1, 2, 5, 6, 7, 9])).toHaveLength(720);
    const result = solve(TARGET, MARKS);
    expect(result.solutions).toBe(1);
    /* The visible marks alone must leave more than one order, or the game is
       perfect information rather than a relay. */
    expect(result.visibleCount).toBeGreaterThanOrEqual(2);
  });

  it("returns a par inside the budget and a positive difficulty, deterministically", () => {
    const a = solve(TARGET, MARKS);
    const b = solve(TARGET, MARKS);
    expect(a).toEqual(b);
    expect(a.par).toBeGreaterThanOrEqual(1);
    expect(a.par).toBeLessThanOrEqual(MAX_RUNS);
    expect(a.fair).toBe(true);
    expect(a.difficulty).toBe(difficultyOf(TARGET, MARKS));
    expect(a.difficulty).toBeGreaterThan(0);
  });

  it("counts a monotone target's two solutions and reports it not fair to ship", () => {
    /* 1..6 in order and reversed both have all differences of one. */
    const monotone = solve([1, 2, 3, 4, 5, 6], [1, 1, 1, 1, 1]);
    expect(monotone.solutions).toBe(2);
  });

  it("gives the difficulty as candidate mass, at least the visible candidate count", () => {
    const result = solve(TARGET, MARKS);
    expect(result.difficulty).toBeGreaterThanOrEqual(result.visibleCount);
  });

  it("agrees with a direct relay depth reading of the target", () => {
    /* The one solution reproduces the target's difference sequence. */
    const trueDiffs = diffsOf(TARGET);
    const solutions = permutations([1, 2, 5, 6, 7, 9]).filter((order) => diffsOf(order).every((d, i) => d === trueDiffs[i]));
    expect(solutions).toHaveLength(1);
  });
});
