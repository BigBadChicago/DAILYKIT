import { describe, expect, it } from "vitest";
import { CODE_SPACE, MAX_GUESSES, scoreGuess, type Code } from "../../../src/games/cipher/rules.js";
import {
  ALL_CODES,
  OPENING_GUESS,
  chooseGuess,
  codeAt,
  codeIndex,
  feedbackFor,
  feedbackKey,
  filterConsistent,
  isSolvedLine,
  remainingAfterOpening,
  solveLine,
} from "../../../src/games/cipher/solver.js";

/** Deterministic spread across the space, cheap enough to run every commit.
 *  Prime stride so it is not a residue class of the symbol base. */
const SAMPLE = Array.from({ length: 37 }, (_, i) => (i * 35 + 7) % CODE_SPACE);

describe("code indexing", () => {
  it("round trips every code", () => {
    for (let index = 0; index < CODE_SPACE; index += 1) {
      expect(codeIndex(codeAt(index))).toBe(index);
    }
    expect(ALL_CODES).toHaveLength(CODE_SPACE);
  });

  it("refuses an index outside the space", () => {
    expect(() => codeAt(-1)).toThrow(RangeError);
    expect(() => codeAt(CODE_SPACE)).toThrow(RangeError);
  });
});

describe("the precomputed feedback table", () => {
  it("agrees with scoreGuess", () => {
    for (const answer of SAMPLE) {
      for (let guess = 0; guess < CODE_SPACE; guess += 29) {
        expect(feedbackFor(answer, guess))
          .toEqual(scoreGuess(ALL_CODES[answer] as Code, ALL_CODES[guess] as Code));
      }
    }
  });

  it("keys exact and misplaced without collision", () => {
    const seen = new Set<number>();
    for (let exact = 0; exact <= 4; exact += 1) {
      for (let misplaced = 0; misplaced <= 4; misplaced += 1) {
        const key = feedbackKey({ exact, misplaced });
        expect(seen.has(key)).toBe(false);
        seen.add(key);
      }
    }
  });
});

describe("the fixed opening", () => {
  it("carries one repeated symbol, which is the opening the horizon was generated against", () => {
    expect(OPENING_GUESS).toEqual([0, 0, 1, 2]);
    expect(new Set(OPENING_GUESS).size).toBe(3);
  });

  it("partitions the whole space, so difficulty is a partition size and nothing else", () => {
    const sizes = new Map<number, number>();
    const opening = codeIndex(OPENING_GUESS);
    for (let answer = 0; answer < CODE_SPACE; answer += 1) {
      const key = feedbackKey(feedbackFor(answer, opening));
      sizes.set(key, (sizes.get(key) ?? 0) + 1);
    }
    expect([...sizes.values()].reduce((sum, size) => sum + size, 0)).toBe(CODE_SPACE);
    for (const answer of SAMPLE) {
      const key = feedbackKey(feedbackFor(answer, codeIndex(OPENING_GUESS)));
      expect(remainingAfterOpening(answer)).toBe(sizes.get(key));
    }
  });
});

describe("chooseGuess", () => {
  it("returns the only candidate when one remains", () => {
    expect(chooseGuess([417])).toBe(417);
  });

  it("is deterministic across calls", () => {
    const candidates = filterConsistent(
      ALL_CODES.map((_, index) => index),
      codeIndex(OPENING_GUESS),
      feedbackKey(feedbackFor(SAMPLE[3] as number, codeIndex(OPENING_GUESS))),
    );
    expect(chooseGuess(candidates)).toBe(chooseGuess([...candidates]));
  });

  it("refuses an empty candidate set", () => {
    expect(() => chooseGuess([])).toThrow(RangeError);
  });
});

describe("solveLine", () => {
  it("solves every sampled code inside the guess limit", () => {
    for (const answer of SAMPLE) {
      const line = solveLine(answer);
      expect(line.length).toBeLessThanOrEqual(MAX_GUESSES);
      expect(line[line.length - 1]).toBe(answer);
      expect(isSolvedLine(answer, line)).toBe(true);
      expect(new Set(line).size).toBe(line.length);
    }
  });

  it("opens with the fixed guess and stops there when the opening is the answer", () => {
    const opening = codeIndex(OPENING_GUESS);
    expect(solveLine(opening)).toEqual([opening]);
    for (const answer of SAMPLE) expect(solveLine(answer)[0]).toBe(opening);
  });

  it("may probe outside the candidate set, but its final guess is always consistent", () => {
    // Knuth minimax scores every one of the 1,296 codes as a probe, so an
    // intermediate guess need not be a possible answer. Only the last one must
    // be, and the candidate set must strictly shrink or the line would not end.
    for (const answer of SAMPLE.slice(0, 8)) {
      const line = solveLine(answer);
      const last = line[line.length - 1] as number;
      for (let earlier = 0; earlier < line.length - 1; earlier += 1) {
        const previous = line[earlier] as number;
        expect(feedbackFor(last, previous)).toEqual(feedbackFor(answer, previous));
      }

      let candidates = ALL_CODES.map((_, index) => index);
      for (const guess of line.slice(0, -1)) {
        const next = filterConsistent(candidates, guess, feedbackKey(feedbackFor(answer, guess)));
        expect(next.length).toBeLessThan(candidates.length);
        expect(next).toContain(answer);
        candidates = next;
      }
    }
  });

  it("produces a line length that verification can band on", () => {
    const lengths = SAMPLE.map((answer) => solveLine(answer).length);
    expect(Math.min(...lengths)).toBeGreaterThanOrEqual(1);
    expect(Math.max(...lengths)).toBeLessThanOrEqual(MAX_GUESSES);
    expect(lengths.some((length) => length >= 4)).toBe(true);
  });
});
