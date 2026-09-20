import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { intBelow } from "../../../src/core/rng.js";
import { rngFromSeed, seedFor } from "../../../src/core/seed.js";
import {
  BAND_EDGES,
  bandForPuzzle,
  bandOf,
  contextFromLists,
  emptyTally,
  fallbackContext,
  FIRST_SESSION,
  generateForPuzzle,
  generateUnrated,
  pairKey,
  parWindowFor,
  weekdayOf,
  type Draw,
} from "../../../src/games/word-ladder/generator.js";
import { buildGraph, distance } from "../../../src/games/word-ladder/ladder.js";
import { makePuzzle } from "../../../src/games/word-ladder/rules.js";

const ACCEPTED = readFileSync("data/word-ladder/accepted.txt", "utf8").split("\n").map((w) => w.trim()).filter(Boolean);
const FAMILIAR = readFileSync("data/word-ladder/familiar.txt", "utf8").split("\n").map((w) => w.trim()).filter(Boolean);
const acceptedGraph = buildGraph(ACCEPTED);
const familiarGraph = buildGraph(FAMILIAR);

function drawFor(puzzleNumber: number): Draw {
  const rng = rngFromSeed(seedFor("word-ladder", puzzleNumber));
  return { intBelow: (bound: number): number => intBelow(rng, bound) };
}

describe("WORD LADDER band configuration", () => {
  it("BAND_EDGES are strictly increasing and match the committed study", () => {
    for (let i = 1; i < BAND_EDGES.length; i += 1) {
      expect(BAND_EDGES[i]).toBeGreaterThan(BAND_EDGES[i - 1] as number);
    }
    const study = JSON.parse(readFileSync("data/word-ladder/study.json", "utf8")) as { bandEdges: number[] };
    expect(study.bandEdges).toEqual([...BAND_EDGES]);
  });

  it("the study fills all seven bands", () => {
    const study = JSON.parse(readFileSync("data/word-ladder/study.json", "utf8")) as { bandCounts: number[] };
    expect(study.bandCounts).toHaveLength(7);
    for (const count of study.bandCounts) expect(count).toBeGreaterThan(0);
  });

  it("bandOf maps a difficulty to the band its edges imply", () => {
    expect(bandOf(0)).toBe(0);
    expect(bandOf((BAND_EDGES[0] as number) + 1)).toBe(1);
    expect(bandOf((BAND_EDGES.at(-1) as number) + 1)).toBe(6);
  });

  it("the weekday curve rises across the week and puzzle 1 is Monday", () => {
    expect(weekdayOf(1)).toBe(0);
    expect(bandForPuzzle(1)).toBe(0); // Monday, gentlest
    expect(parWindowFor(1)).toEqual({ lo: 4, hi: 5 });
    expect(parWindowFor(6)).toEqual({ lo: 6, hi: 7 }); // Saturday, hardest par
  });
});

describe("WORD LADDER generation is deterministic and in band", () => {
  const context = contextFromLists(ACCEPTED, FAMILIAR);

  it("produces the same day twice from the same seed", () => {
    const a = generateForPuzzle(context, 12, drawFor(12));
    const b = generateForPuzzle(context, 12, drawFor(12));
    expect(a).not.toBeNull();
    expect(b).not.toBeNull();
    expect({ start: a?.puzzle.start, goal: a?.puzzle.goal, attempt: a?.attempt }).toEqual({
      start: b?.puzzle.start,
      goal: b?.puzzle.goal,
      attempt: b?.attempt,
    });
  });

  it("a generated day is solvable, in the weekday band, and familiar fair", () => {
    for (const n of [1, 3, 6, 20]) {
      const day = generateForPuzzle(context, n, drawFor(n));
      expect(day).not.toBeNull();
      if (!day) continue;
      expect(distance(acceptedGraph, day.puzzle.start, day.puzzle.goal)).toBe(day.puzzle.par);
      expect(bandOf(day.puzzle.difficulty)).toBe(bandForPuzzle(n));
      /* The fairness screen the generator applied is re-proved here independently. */
      expect(distance(familiarGraph, day.puzzle.start, day.puzzle.goal)).toBe(day.puzzle.par);
    }
  });
});

describe("WORD LADDER symmetry, the reverse pair control", () => {
  it("treats a pair and its reverse as the same key", () => {
    expect(pairKey("cold", "warm")).toBe(pairKey("warm", "cold"));
  });

  it("a reverse pair is refused as a repeat", () => {
    const context = contextFromLists(ACCEPTED, FAMILIAR);
    const day = generateForPuzzle(context, 12, drawFor(12));
    expect(day).not.toBeNull();
    if (!day) return;
    /* Seed the used set with the reverse pair; the next generation for the same
       number must not reproduce it. */
    const used = new Set([pairKey(day.puzzle.goal, day.puzzle.start)]);
    const again = generateForPuzzle(context, 12, drawFor(12), emptyTally(), used);
    if (again) expect(pairKey(again.puzzle.start, again.puzzle.goal)).not.toBe(pairKey(day.puzzle.start, day.puzzle.goal));
  });
});

describe("WORD LADDER first session and fallback", () => {
  it("the tutorial board is a valid short ladder", () => {
    const made = makePuzzle(
      1,
      FIRST_SESSION.start,
      FIRST_SESSION.goal,
      acceptedGraph,
      familiarGraph,
      new Set(ACCEPTED),
      ["first-session"],
    );
    expect(made.ok).toBe(true);
    if (made.ok) expect(made.value.par).toBeGreaterThanOrEqual(4);
  });

  it("the browser fallback generates a solvable board without a familiar list", () => {
    const context = fallbackContext(ACCEPTED);
    expect(context.fairnessAvailable).toBe(false);
    const rng = rngFromSeed(seedFor("word-ladder", 500));
    const puzzle = generateUnrated(context, 500, { intBelow: (bound: number): number => intBelow(rng, bound) });
    expect(puzzle).not.toBeNull();
    if (puzzle) expect(distance(acceptedGraph, puzzle.start, puzzle.goal)).toBe(puzzle.par);
  });
});
