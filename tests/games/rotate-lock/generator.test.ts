import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { intBelow } from "../../../src/core/rng.js";
import { rngFromSeed, seedFor } from "../../../src/core/seed.js";
import {
  BAND_EDGES,
  FIRST_SESSION,
  PAR_CEILING,
  PAR_FLOOR,
  bandForPuzzle,
  bandOf,
  dihedral,
  emptyTally,
  firstSessionPuzzle,
  generateForPuzzle,
  generateUnrated,
  passesDecomposition,
  passesSymmetry,
  weekdayOf,
} from "../../../src/games/rotate-lock/generator.js";
import { CELLS, trace } from "../../../src/games/rotate-lock/route.js";
import { solve } from "../../../src/games/rotate-lock/solver.js";
import { SAMPLE_HEAD, sampleSeed } from "../../../tools/rotate-lock-calibrate.js";
import { drawFor, layoutIdentity } from "../../../tools/rotate-lock-generate.js";

interface Study {
  readonly difficulty: { readonly bandEdges: readonly number[]; readonly screenedPerBand: readonly number[] };
  readonly par: { readonly floor: number; readonly ceiling: number };
  readonly sampleHead: readonly number[];
}

const study = JSON.parse(readFileSync("data/rotate-lock/study.json", "utf8")) as Study;

describe("ROTATE LOCK generation", () => {
  it("produces the same day from the same seed", () => {
    for (const day of [1, 2, 7]) {
      const first = generateForPuzzle(day, drawFor(day));
      const second = generateForPuzzle(day, drawFor(day));
      expect(first).not.toBeNull();
      expect(first).toEqual(second);
    }
  });

  it("puts every generated day in its weekday band, with one route, par in range and a closed tray", () => {
    for (let day = 1; day <= 7; day += 1) {
      const tally = emptyTally();
      const generated = generateForPuzzle(day, drawFor(day), tally);
      if (generated === null) throw new Error(`day ${String(day)} did not generate`);
      const { puzzle } = generated;
      expect(bandOf(puzzle.difficulty)).toBe(bandForPuzzle(day));
      expect(solve(puzzle).routes).toHaveLength(1);
      expect(puzzle.par).toBeGreaterThanOrEqual(PAR_FLOOR);
      expect(puzzle.par).toBeLessThanOrEqual(PAR_CEILING);
      expect(trace(puzzle, { order: puzzle.startOrder, facing: puzzle.startFacing }).open).toBe(false);
      expect(tally.accepted).toBe(1);
      const counted = Object.entries(tally).reduce((sum, [, value]) => sum + value, 0);
      expect(counted).toBe(generated.attempt + 1);
    }
  });

  it("maps the weekday curve from a Monday epoch", () => {
    expect([1, 2, 3, 4, 5, 6, 7, 8].map(weekdayOf)).toEqual([0, 1, 2, 3, 4, 5, 6, 0]);
    expect([1, 5, 6, 7].map(bandForPuzzle)).toEqual([0, 5, 6, 4]);
    expect(bandOf(0)).toBe(0);
    expect(bandOf((BAND_EDGES[0] as number) + 1)).toBe(1);
    expect(bandOf(Number.MAX_SAFE_INTEGER)).toBe(6);
  });

  it("falls back past the horizon inside the browser budget", () => {
    for (const day of [366, 400, 1000]) {
      const rng = rngFromSeed(seedFor("rotate-lock", day));
      const started = performance.now();
      const puzzle = generateUnrated(day, { intBelow: (bound: number): number => intBelow(rng, bound) });
      const elapsed = performance.now() - started;
      expect(puzzle).not.toBeNull();
      expect(puzzle?.number).toBe(day);
      expect(elapsed).toBeLessThan(1500);
    }
  });
});

/* Gate step difficulty-calibration. The committed study is the evidence, and
   this recomputes its head so the study cannot drift from the code. */
describe("ROTATE LOCK calibration study", () => {
  it("is the source of the committed band edges and par bounds", () => {
    expect(study.difficulty.bandEdges).toEqual(BAND_EDGES);
    expect(study.par).toEqual({ floor: PAR_FLOOR, ceiling: PAR_CEILING, histogram: expect.any(Object) as unknown });
    for (const supply of study.difficulty.screenedPerBand) expect(supply).toBeGreaterThanOrEqual(52);
  });

  it("recomputes the head of its sample from the calibration streams", () => {
    const values: number[] = [];
    for (let seed = 1; values.length < SAMPLE_HEAD; seed += 1) {
      values.push(...sampleSeed(seed).map((puzzle) => puzzle.difficulty));
    }
    expect(values.slice(0, SAMPLE_HEAD)).toEqual(study.sampleHead);
  });
});

describe("ROTATE LOCK screens", () => {
  /* ROTATE-LOCK.md 11, both directions. */
  it("rejects a route whose legs are each one piece or whose partition is forced", () => {
    const legs = [
      { dir: 1 as const, length: 3 },
      { dir: 2 as const, length: 2 },
      { dir: 1 as const, length: 4 },
    ];
    expect(passesDecomposition([3, 2, 4], legs)).toBe(false);
    expect(passesDecomposition([1, 1, 1, 1, 1, 1, 3], [{ dir: 1, length: 6 }, { dir: 2, length: 3 }])).toBe(true);
    expect(passesDecomposition([3, 3, 3, 3, 3, 3, 3], [{ dir: 1, length: 9 }, { dir: 2, length: 12 }])).toBe(false);
  });

  it("uses eight distinct maps of the square, identity first", () => {
    for (let map = 0; map < 8; map += 1) {
      const image = new Set<number>();
      for (let cell = 0; cell < CELLS; cell += 1) image.add(dihedral(cell, map));
      expect(image.size).toBe(CELLS);
    }
    for (let cell = 0; cell < CELLS; cell += 1) expect(dihedral(cell, 0)).toBe(cell);
    const signatures = new Set<string>();
    for (let map = 0; map < 8; map += 1) signatures.add([1, 8, 13].map((cell) => dihedral(cell, map)).join());
    expect(signatures.size).toBe(8);
  });

  /* ROTATE-LOCK.md 12.3, both directions. */
  it("rejects a layout a board symmetry fixes and keeps one it does not", () => {
    expect(passesSymmetry({ start: 0, lock: 35, marks: [8, 13], lengths: [1, 1, 1, 1, 1, 1, 1] })).toBe(false);
    expect(passesSymmetry({ start: 0, lock: 35, marks: [8, 14], lengths: [1, 1, 1, 1, 1, 1, 1] })).toBe(true);
    expect(passesSymmetry(FIRST_SESSION.layout)).toBe(true);
  });

  it("gives the tutorial board one route, par 3 and a Monday difficulty", () => {
    const puzzle = firstSessionPuzzle();
    expect(puzzle.par).toBe(3);
    expect(bandOf(puzzle.difficulty)).toBe(0);
    expect(solve(puzzle).routes).toHaveLength(1);
  });
});

describe("the committed ROTATE LOCK horizon", () => {
  it("names distinct layouts for the first weeks", () => {
    const seen = new Set<string>();
    for (let day = 1; day <= 14; day += 1) {
      const generated = generateForPuzzle(day, drawFor(day));
      if (generated === null) throw new Error("no day");
      seen.add(layoutIdentity(generated.puzzle));
    }
    expect(seen.size).toBe(14);
  });
});
