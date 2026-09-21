import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { intBelow } from "../../../src/core/rng.js";
import { rngFromSeed, seedFor } from "../../../src/core/seed.js";
import { BAND_EDGES, bandForPuzzle, bandOf, weekdayOf } from "../../../src/games/pangram/bands.js";
import {
  attempt,
  contextFromLists,
  emptyTally,
  generateForPuzzle,
  type Draw,
} from "../../../src/games/pangram/generator.js";
import { COUNT_MAX, COUNT_MIN } from "../../../src/games/pangram/letters.js";
import { FIRST_SESSION } from "../../../src/games/pangram/tutorial.js";
import { solveDay } from "../../../src/games/pangram/solver.js";
import { ACCEPTED, FAMILIAR, INDEX } from "./fixtures.js";

function drawFor(puzzleNumber: number): Draw {
  const rng = rngFromSeed(seedFor("pangram", puzzleNumber));
  return { intBelow: (bound: number): number => intBelow(rng, bound) };
}

const context = contextFromLists(ACCEPTED, FAMILIAR);
const study = JSON.parse(readFileSync("data/pangram/study.json", "utf8")) as {
  bandEdges: number[];
  bandCounts: number[];
  distinctTotals: number;
  fallbackWordCount: { bandCounts: number[] };
};

describe("PANGRAM band configuration", () => {
  it("BAND_EDGES are strictly increasing and match the committed study", () => {
    for (let i = 1; i < BAND_EDGES.length; i += 1) expect(BAND_EDGES[i]).toBeGreaterThan(BAND_EDGES[i - 1] as number);
    expect(study.bandEdges).toEqual([...BAND_EDGES]);
  });

  it("the study fills all seven bands, and so does the named fallback", () => {
    expect(study.bandCounts).toHaveLength(7);
    for (const count of study.bandCounts) expect(count).toBeGreaterThan(0);
    for (const count of study.fallbackWordCount.bandCounts) expect(count).toBeGreaterThan(0);
    expect(study.distinctTotals).toBeGreaterThan(100);
  });

  it("bandOf maps a total to its band and puzzle 1 is the gentlest Monday", () => {
    expect(bandOf(0)).toBe(0);
    expect(bandOf((BAND_EDGES[0] as number) + 1)).toBe(1);
    expect(bandOf((BAND_EDGES.at(-1) as number) + 1)).toBe(6);
    expect(weekdayOf(1)).toBe(0);
    expect(bandForPuzzle(1)).toBe(0);
  });

  it("reproduces the committed study's septiles from the same seeds", () => {
    const totals: number[] = [];
    const tally = emptyTally();
    const seeds = (JSON.parse(readFileSync("data/pangram/study.json", "utf8")) as { seeds: number }).seeds;
    for (let seed = 0; seed < seeds; seed += 1) {
      const rng = rngFromSeed(seedFor("pangram", seed + 1, "calibrate"));
      const puzzle = attempt(context, seed + 1, { intBelow: (bound) => intBelow(rng, bound) }, tally);
      if (puzzle !== null) totals.push(puzzle.total);
    }
    const sorted = [...totals].sort((a, b) => a - b);
    const edges = [1, 2, 3, 4, 5, 6].map((k) => sorted[Math.min(Math.floor((sorted.length * k) / 7), sorted.length - 1)]);
    expect(edges).toEqual(study.bandEdges);
  });
});

describe("PANGRAM generation is deterministic, screened and in band", () => {
  it("produces the same day twice from the same seed", () => {
    const a = generateForPuzzle(context, 12, drawFor(12));
    const b = generateForPuzzle(context, 12, drawFor(12));
    expect(a).not.toBeNull();
    expect(a?.puzzle.letters).toBe(b?.puzzle.letters);
    expect(a?.puzzle.centre).toBe(b?.puzzle.centre);
    expect(a?.attempt).toBe(b?.attempt);
  });

  it("every accepted day passes the count, fairness and band screens", () => {
    for (const n of [1, 2, 3, 4, 5, 6, 7, 40]) {
      const day = generateForPuzzle(context, n, drawFor(n));
      expect(day).not.toBeNull();
      if (day === null) continue;
      const solved = solveDay(INDEX, day.puzzle.letters, day.puzzle.centre);
      expect(solved.answers).toEqual(day.puzzle.answers);
      expect(day.puzzle.answers.length).toBeGreaterThanOrEqual(COUNT_MIN);
      expect(day.puzzle.answers.length).toBeLessThanOrEqual(COUNT_MAX);
      expect(solved.familiarPangram).toBe(true);
      expect(solved.familiarTotal * 100).toBeGreaterThanOrEqual(65 * solved.total);
      expect(bandOf(day.puzzle.total)).toBe(bandForPuzzle(n));
      expect(day.puzzle.letters.includes("s")).toBe(false);
    }
  });

  it("refuses a set already used, the symmetry and duplicate screen", () => {
    const first = generateForPuzzle(context, 12, drawFor(12));
    if (first === null) throw new Error("no day");
    const tally = emptyTally();
    const again = generateForPuzzle(context, 12, drawFor(12), tally, new Set([first.puzzle.letters]));
    expect(again?.puzzle.letters).not.toBe(first.puzzle.letters);
    expect(tally.reused).toBeGreaterThan(0);
  });

  it("replays the committed manifest head byte for byte", async () => {
    const { entryFor } = await import("../../../tools/pangram-generate.js");
    const chunk = JSON.parse(readFileSync("data/pangram/manifest.1-31.json", "utf8")) as {
      entries: Record<string, unknown>;
    };
    const used = new Set<string>();
    for (let n = 1; n <= 10; n += 1) {
      const day = generateForPuzzle(context, n, drawFor(n), emptyTally(), used);
      if (day === null) throw new Error(`no day ${String(n)}`);
      used.add(day.puzzle.letters);
      expect(entryFor(n, day.puzzle, day.attempt)).toEqual(chunk.entries[String(n)]);
    }
  });

  it("the embedded first session day is exactly the dictionary's", () => {
    const solved = solveDay(INDEX, FIRST_SESSION.letters, FIRST_SESSION.centre);
    expect(solved.answers).toEqual([...FIRST_SESSION.answers]);
    expect(solved.answers.every((w) => INDEX.familiar.has(w))).toBe(true);
  });
});
