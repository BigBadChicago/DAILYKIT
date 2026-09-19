import { describe, expect, it } from "vitest";

import { intBelow } from "../../../src/core/rng.js";
import { rngFromSeed, seedFor } from "../../../src/core/seed.js";
import {
  BAND_EDGES,
  bandForPuzzle,
  bandOf,
  firstSessionPuzzle,
  generateForPuzzle,
  generateUnrated,
  passesSymmetry,
  type Draw,
} from "../../../src/games/difference-relay/generator.js";
import { satisfiesVisible } from "../../../src/games/difference-relay/relay.js";
import { solve } from "../../../src/games/difference-relay/solver.js";

function drawFor(puzzleNumber: number): Draw {
  const rng = rngFromSeed(seedFor("difference-relay", puzzleNumber));
  return { intBelow: (bound: number): number => intBelow(rng, bound) };
}

describe("DIFFERENCE RELAY generator", () => {
  it("produces the same puzzle for the same day", () => {
    for (let day = 1; day <= 20; day += 1) {
      expect(generateForPuzzle(day, drawFor(day))).toEqual(generateForPuzzle(day, drawFor(day)));
    }
  });

  it("places every day in its weekday band, unique, fair, and never mirror symmetric", () => {
    for (let day = 1; day <= 60; day += 1) {
      const generated = generateForPuzzle(day, drawFor(day));
      expect(generated).not.toBeNull();
      if (!generated) continue;
      const p = generated.puzzle;
      expect(p.number).toBe(day);
      expect(p.numbers).toHaveLength(6);
      expect(new Set(p.numbers).size).toBe(6);
      expect(bandOf(p.difficulty)).toBe(bandForPuzzle(day));
      expect(p.par).toBeLessThanOrEqual(6);
      const solved = solve(p.target, p.marks);
      expect(solved.solutions).toBe(1);
      expect(solved.visibleCount).toBeGreaterThanOrEqual(2);
      expect(passesSymmetry(p.target, p.marks)).toBe(true);
      /* Every visible mark is the true difference, and at least one gap is hidden. */
      expect(satisfiesVisible(p.target, p.marks)).toBe(true);
      expect(p.marks.some((mark) => mark === null)).toBe(true);
      /* The start order is a real, non winning arrangement. */
      expect([...p.startOrder].sort((a, b) => a - b)).toEqual(p.numbers);
      expect(p.startOrder.join(",")).not.toBe(p.target.join(","));
    }
  });

  it("keeps its band edges strictly ascending so seven distinct bands exist", () => {
    for (let i = 1; i < BAND_EDGES.length; i += 1) {
      expect(BAND_EDGES[i] as number).toBeGreaterThan(BAND_EDGES[i - 1] as number);
    }
  });

  it("fills a board past the horizon with no band, still unique and fair", () => {
    const rng = rngFromSeed(seedFor("difference-relay", 900));
    const puzzle = generateUnrated(900, { intBelow: (bound: number): number => intBelow(rng, bound) });
    expect(puzzle).not.toBeNull();
    if (puzzle) {
      const solved = solve(puzzle.target, puzzle.marks);
      expect(solved.solutions).toBe(1);
      expect(solved.fair).toBe(true);
    }
  });

  it("has a valid tutorial board that sits in the gentle Monday band and is not today's puzzle", () => {
    const tutorial = firstSessionPuzzle();
    expect(tutorial.par).toBeGreaterThanOrEqual(1);
    expect(tutorial.par).toBeLessThanOrEqual(6);
    expect(bandOf(tutorial.difficulty)).toBe(0);
    const dayOne = generateForPuzzle(1, drawFor(1));
    expect(tutorial.target.join(",")).not.toBe(dayOne?.puzzle.target.join(","));
  });
});
