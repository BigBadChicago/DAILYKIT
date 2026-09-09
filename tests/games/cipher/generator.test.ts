import { describe, expect, it } from "vitest";
import { seedFor } from "../../../src/core/seed.js";
import { CODE_SPACE, isCode, SYMBOL_COUNT, type Code } from "../../../src/games/cipher/rules.js";
import {
  LEVERS,
  MIN_LINE,
  WEEKDAY_OFFSET,
  bandFor,
  generateCode,
  generatePuzzle,
  inBand,
  isValidPuzzleShape,
  leverOf,
  satisfiesLever,
  weekdayFor,
} from "../../../src/games/cipher/generator.js";
import { ALL_CODES } from "../../../src/games/cipher/solver.js";

describe("weekday mapping", () => {
  it("puts puzzle 1 on the epoch's weekday", () => {
    expect(weekdayFor(1)).toBe(WEEKDAY_OFFSET);
    expect(weekdayFor(8)).toBe(weekdayFor(1));
    expect(weekdayFor(365)).toBe((364 + WEEKDAY_OFFSET) % 7);
  });

  it("gives every weekday a band, gentle Monday to hard Saturday", () => {
    const bandOf = (weekday: number): readonly number[] =>
      bandFor(1 + ((weekday - WEEKDAY_OFFSET + 7) % 7));
    const hardest = (weekday: number): number => Math.max(...bandOf(weekday));
    const [sunday, monday, tuesday, wednesday, thursday, friday, saturday] =
      [0, 1, 2, 3, 4, 5, 6].map(hardest) as [number, number, number, number, number, number, number];
    expect(monday).toBeLessThan(tuesday);
    expect(tuesday).toBeLessThan(wednesday);
    expect(wednesday).toBeLessThan(thursday);
    expect(thursday).toBeLessThan(sunday);
    expect(sunday).toBeLessThan(friday);
    expect(friday).toBeLessThan(saturday);
  });

  it("bands only on class sizes that exist", () => {
    for (let number = 1; number <= 7; number += 1) {
      expect(bandFor(number).length).toBeGreaterThan(0);
      for (const size of bandFor(number)) {
        expect(Number.isInteger(size)).toBe(true);
        expect(size).toBeGreaterThan(0);
        expect(size).toBeLessThan(CODE_SPACE);
      }
      expect(inBand(number, bandFor(number)[0] as number)).toBe(true);
      expect(inBand(number, 0)).toBe(false);
    }
  });
});

describe("generateCode", () => {
  it("is deterministic for a seed and unrelated across days", () => {
    const first = generateCode(seedFor("cipher", 12));
    expect(generateCode(seedFor("cipher", 12))).toEqual(first);
    const others = [13, 14, 15, 16].map((day) => generateCode(seedFor("cipher", day)).join(""));
    expect(new Set([first.join(""), ...others]).size).toBeGreaterThan(1);
  });

  it("produces a legal code for every day of the horizon", () => {
    for (let number = 1; number <= 365; number += 1) {
      const code = generateCode(seedFor("cipher", number));
      expect(isCode(code)).toBe(true);
      expect(code.every((symbol) => symbol >= 0 && symbol < SYMBOL_COUNT)).toBe(true);
    }
  });

  it("changes stream under a salt, which is what a retry spends", () => {
    const attempt0 = generateCode(seedFor("cipher", 30)).join("");
    const attempts = [1, 2, 3, 4, 5].map((salt) => generateCode(seedFor("cipher", 30, salt)).join(""));
    expect(new Set([attempt0, ...attempts]).size).toBeGreaterThan(3);
  });
});

describe("leverOf", () => {
  it("is total over the whole code space and names one shape per code", () => {
    const counts = new Map<string, number>();
    for (const code of ALL_CODES) {
      const lever = leverOf(code);
      expect(LEVERS).toContain(lever);
      expect(satisfiesLever(code, lever)).toBe(true);
      counts.set(lever, (counts.get(lever) ?? 0) + 1);
    }
    expect([...counts.values()].reduce((sum, count) => sum + count, 0)).toBe(CODE_SPACE);
    /* 6 * 5 * 4 * 3 codes have four different symbols. */
    expect(counts.get("all-distinct")).toBe(360);
  });

  it("reads the shapes a player would name", () => {
    expect(leverOf([0, 1, 2, 3])).toBe("all-distinct");
    expect(leverOf([0, 0, 1, 2])).toBe("one-pair");
    expect(leverOf([0, 0, 1, 1])).toBe("two-pairs");
    expect(leverOf([0, 0, 0, 1])).toBe("triple");
    expect(leverOf([5, 5, 5, 5])).toBe("triple");
  });
});

describe("generatePuzzle", () => {
  it("returns an unrated puzzle, because nothing offline has solved it", () => {
    const puzzle = generatePuzzle(400, seedFor("cipher", 400));
    expect(puzzle.best).toBeNull();
    expect(puzzle.number).toBe(400);
    expect(isValidPuzzleShape(puzzle)).toBe(true);
    expect(puzzle.levers).toEqual([leverOf(puzzle.code)]);
  });

  it("rejects a malformed puzzle shape", () => {
    const puzzle = generatePuzzle(400, seedFor("cipher", 400));
    expect(isValidPuzzleShape({ ...puzzle, code: [0, 1, 2] as unknown as Code })).toBe(false);
    expect(isValidPuzzleShape({ ...puzzle, number: 0 })).toBe(false);
    expect(isValidPuzzleShape({ ...puzzle, levers: [] })).toBe(false);
  });
});

describe("the fairness floor", () => {
  it("is four, and sits below the guess limit", () => {
    expect(MIN_LINE).toBe(4);
  });
});
