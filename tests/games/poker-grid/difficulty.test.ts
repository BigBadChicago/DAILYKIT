import { describe, expect, it } from "vitest";
import {
  DIFFICULTY_SCALE,
  GREEDY_TRIALS,
  UNRATED_DIFFICULTY,
  difficultyFrom,
  difficultyOf,
  greedySaltFor,
  greedyScores,
  greedyTotalFor,
  resetDifficultyMemo,
} from "../../../src/games/poker-grid/difficulty.js";
import { generatePuzzle, type PokerBest, type PokerPuzzle } from "../../../src/games/poker-grid/generator.js";
import { seedFor } from "../../../src/core/seed.js";
import { tutorialPuzzle } from "../../../src/games/poker-grid/tutorial.js";

const BEST: PokerBest = { score: 5670, hands: 7, method: "beam", width: 400 };

function boardFor(number: number, best: PokerBest | null = BEST, attempt = 0): PokerPuzzle {
  const salt = attempt === 0 ? undefined : `retry-${String(attempt)}`;
  const seed = salt === undefined ? seedFor("poker-grid", number) : seedFor("poker-grid", number, salt);
  return { ...generatePuzzle(number, seed, attempt), best };
}

describe("POKER GRID difficulty", () => {
  it("is basis points from integer inputs", () => {
    /* Nine runs totalling exactly nine times the best score is a greedy player
       who matched best play, which is a difficulty of zero. */
    expect(difficultyFrom(1000, GREEDY_TRIALS * 1000)).toBe(0);
    /* A tenth off, which is the gentle end of the shipped curve. */
    expect(difficultyFrom(1000, GREEDY_TRIALS * 900)).toBe(1000);
    expect(difficultyFrom(1000, GREEDY_TRIALS * 750)).toBe(2500);
    expect(DIFFICULTY_SCALE).toBe(10_000);
  });

  it("returns an integer for every input a manifest can hold", () => {
    for (let score = 4000; score <= 6000; score += 137) {
      for (let shortfall = 0; shortfall <= 2000; shortfall += 311) {
        const value = difficultyFrom(score, GREEDY_TRIALS * (score - shortfall));
        expect(Number.isInteger(value)).toBe(true);
      }
    }
  });

  /* The section 9 requirement that matters: enough distinct values for seven
     bands. The shipped curve runs about 1130 to 2490, so a hundred boards
     across that range must not collapse onto a handful of numbers. */
  it("spreads across far more distinct values than seven bands need", () => {
    const seen = new Set<number>();
    for (let i = 0; i < 100; i += 1) {
      seen.add(difficultyFrom(5670, GREEDY_TRIALS * (5670 - 600 - i * 3)));
    }
    expect(seen.size).toBeGreaterThan(50);
  });

  it("refuses to invent a number when there is nothing to divide by", () => {
    expect(difficultyFrom(0, 0)).toBe(UNRATED_DIFFICULTY);
    expect(difficultyFrom(-1, 0)).toBe(UNRATED_DIFFICULTY);
    expect(difficultyFrom(1000.5, 9000)).toBe(UNRATED_DIFFICULTY);
    expect(difficultyFrom(1000, 9000.5)).toBe(UNRATED_DIFFICULTY);
  });

  /* Recorded conflict resolution 3 and the unrated label. Past the horizon
     there is no stored optimum, so a real number there would be a grade the
     player cannot check. */
  it("is unrated past the horizon and on the tutorial board", () => {
    resetDifficultyMemo();
    expect(difficultyOf(boardFor(30, null))).toBe(UNRATED_DIFFICULTY);
    /* The tutorial board is puzzle zero, which seedFor refuses outright, so
       this also proves the null best short circuits before any seeding. */
    expect(() => difficultyOf(tutorialPuzzle())).not.toThrow();
    expect(difficultyOf(tutorialPuzzle())).toBe(UNRATED_DIFFICULTY);
  });

  /* The claim that matters: the module's number is the formula applied to runs
     it replayed itself. Asserted against a recomputation rather than against a
     hardcoded figure, because an unscreened board is not guaranteed to land
     anywhere in particular and a test that pins one is a test about this board. */
  it("measures a real board by replaying its own runs", () => {
    resetDifficultyMemo();
    const puzzle = boardFor(11);
    const total = greedyTotalFor(puzzle.number, puzzle.cells, puzzle.attempt);
    expect(difficultyOf(puzzle)).toBe(difficultyFrom((puzzle.best as PokerBest).score, total));
    expect(Number.isInteger(difficultyOf(puzzle))).toBe(true);
  });

  it("replays nine seeded runs and sums them", () => {
    const puzzle = boardFor(12);
    const scores = greedyScores(puzzle.number, puzzle.cells, puzzle.attempt);
    expect(scores).toHaveLength(GREEDY_TRIALS);
    expect(scores.every((score) => Number.isInteger(score) && score > 0)).toBe(true);
    expect(greedyTotalFor(puzzle.number, puzzle.cells, puzzle.attempt))
      .toBe(scores.reduce((sum, score) => sum + score, 0));
  });

  it("produces the same number twice, in the same process and across a fresh memo", () => {
    const puzzle = boardFor(13);
    resetDifficultyMemo();
    const first = difficultyOf(puzzle);
    const memoized = difficultyOf(puzzle);
    resetDifficultyMemo();
    const recomputed = difficultyOf(puzzle);
    expect(memoized).toBe(first);
    expect(recomputed).toBe(first);
  });

  /* The memo is keyed on the puzzle object, not its number, so two puzzles
     that claim the same day cannot read each other's answer. */
  it("does not let one puzzle read another puzzle's measurement", () => {
    resetDifficultyMemo();
    const real = boardFor(14);
    const impostor: PokerPuzzle = { ...real, cells: boardFor(15).cells };
    const first = difficultyOf(real);
    const second = difficultyOf(impostor);
    expect(difficultyOf(real)).toBe(first);
    expect(second).not.toBe(UNRATED_DIFFICULTY);
  });

  /* The salt is keyed by attempt, which is why phase 4 had to carry the attempt
     onto the puzzle: a board only the manifest knows still reproduces its own
     runs, and a different attempt is a different set of nine. */
  it("keys the greedy runs by the attempt that produced the board", () => {
    expect(greedySaltFor(0, 0)).toBe("greedy-0-0");
    expect(greedySaltFor(3, 8)).toBe("greedy-3-8");
    const cells = boardFor(16).cells;
    /* Four attempts over one board. The runs are seeded, so this is a fixed
       fact rather than a sample: the salts separate the streams or they do not. */
    const totals = [0, 1, 2, 3].map((attempt) => greedyTotalFor(16, cells, attempt));
    expect(new Set(totals).size).toBeGreaterThan(1);
  });

  /* The whole point of measuring rather than reading. A drifted denominator
     moves the answer, which is what makes the verifier's check worth running. */
  it("moves when the stored optimum moves", () => {
    resetDifficultyMemo();
    const honest = boardFor(17);
    const inflated: PokerPuzzle = { ...honest, best: { ...BEST, score: BEST.score + 400 } };
    expect(difficultyOf(inflated)).toBeGreaterThan(difficultyOf(honest));
  });
});
