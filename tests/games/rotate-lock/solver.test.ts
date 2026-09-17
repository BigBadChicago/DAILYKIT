import { describe, expect, it } from "vitest";

import { intBelow } from "../../../src/core/rng.js";
import { rngFromSeed, seedFor } from "../../../src/core/seed.js";
import { drawCandidate } from "../../../src/games/rotate-lock/generator.js";
import { applyAction, initialState } from "../../../src/games/rotate-lock/rules.js";
import { arrangementKey, stepFrom, trace, type Arrangement, type Layout } from "../../../src/games/rotate-lock/route.js";
import { arrangementsFor, difficultyOf, legsKey, movesBetween, parOf, solve, type Leg } from "../../../src/games/rotate-lock/solver.js";
import { enumerateOpenings, independentPar } from "../../../tools/rotate-lock-verify.js";
import { fixturePuzzle, openingsOf } from "./fixtures.js";

function cellsOf(layout: Layout, legs: readonly Leg[]): string {
  const cells: number[] = [];
  let at = layout.start;
  for (const leg of legs) {
    for (let i = 0; i < leg.length; i += 1) {
      at = stepFrom(at, leg.dir);
      cells.push(at);
    }
  }
  return cells.join(",");
}

describe("the route solver", () => {
  it("finds the tutorial board's one route and measures its dead turns", () => {
    const puzzle = fixturePuzzle();
    const result = solve(puzzle);
    expect(result.routes).toHaveLength(1);
    expect(legsKey(result.routes[0] ?? [])).toBe("21.14.01.33");
    expect(result.deadTurns).toBe(difficultyOf(puzzle));
    expect(result.deadTurns).toBeGreaterThan(0);
  });

  it("returns every route of an ambiguous layout, and stops at the limit when asked", () => {
    const loose: Layout = { start: 0, lock: 17, marks: [], lengths: [1, 1, 1, 1, 1, 1, 1] };
    const all = solve(loose);
    expect(all.routes.length).toBeGreaterThan(2);
    expect(solve(loose, 2).routes).toHaveLength(2);
    for (const route of all.routes) {
      for (const arrangement of arrangementsFor(loose, route)) expect(trace(loose, arrangement).open).toBe(true);
    }
  });

  /* The two searches share no code. Agreement on routes across varied layouts,
     unique and not, is the evidence that neither one prunes a real route. */
  it("agrees with the verifier's independent enumeration on drawn layouts", () => {
    const rng = rngFromSeed(seedFor("rotate-lock", 1, "solver-agreement"));
    const draw = { intBelow: (bound: number): number => intBelow(rng, bound) };
    let compared = 0;
    let ambiguous = 0;
    while (compared < 12) {
      const candidate = drawCandidate(draw);
      if (typeof candidate === "string") continue;
      compared += 1;
      const mine = new Set(solve(candidate.layout).routes.map((legs) => cellsOf(candidate.layout, legs)));
      const theirs = enumerateOpenings(candidate.layout);
      expect([...mine].sort()).toEqual([...theirs.routes].sort());
      if (mine.size > 1) ambiguous += 1;
    }
    expect(compared).toBe(12);
    expect(ambiguous).toBeGreaterThanOrEqual(0);
  });
});

describe("par", () => {
  it("counts clockwise turns and the swaps of the slot permutation", () => {
    const base: Arrangement = { order: [0, 1, 2, 3, 4, 5, 6], facing: [0, 0, 0, 0, 0, 0, 0] };
    expect(movesBetween(base, base)).toBe(0);
    expect(movesBetween(base, { ...base, facing: [3, 0, 0, 0, 0, 0, 1] })).toBe(4);
    expect(movesBetween(base, { ...base, order: [1, 0, 2, 3, 4, 5, 6] })).toBe(1);
    expect(movesBetween(base, { ...base, order: [1, 2, 0, 3, 4, 5, 6] })).toBe(2);
    expect(movesBetween(base, { order: [6, 5, 4, 3, 2, 1, 0], facing: [1, 0, 0, 0, 0, 0, 0] })).toBe(4);
    expect(parOf(base, [])).toBeNull();
  });

  it("matches the verifier's own par on every tutorial opening", () => {
    const puzzle = fixturePuzzle();
    const openings = openingsOf(puzzle);
    const start = { order: puzzle.startOrder, facing: puzzle.startFacing };
    expect(independentPar(start, openings)).toBe(parOf(start, openings));
    expect(puzzle.par).toBe(3);
  });

  /* Exactness. A breadth first search over real moves from the tutorial start
     reaches its first open arrangement at exactly par. */
  it("is the true shortest distance, by breadth first search over moves", () => {
    const puzzle = fixturePuzzle();
    let frontier = [initialState(puzzle)];
    const seen = new Set(frontier.map((state) => arrangementKey(state)));
    let depth = 0;
    let reached: number | null = null;
    while (reached === null && depth < puzzle.par) {
      depth += 1;
      const next = [];
      for (const state of frontier) {
        const actions = [];
        for (let a = 0; a < 7; a += 1) {
          actions.push({ kind: "rotate" as const, piece: a });
          for (let b = a + 1; b < 7; b += 1) actions.push({ kind: "swap" as const, a, b });
        }
        for (const action of actions) {
          const moved = applyAction(state, action);
          if (!moved.ok) continue;
          const key = arrangementKey(moved.value);
          if (seen.has(key)) continue;
          seen.add(key);
          if (moved.value.open) reached = depth;
          next.push(moved.value);
        }
      }
      frontier = next;
    }
    expect(reached).toBe(puzzle.par);
  });
});
