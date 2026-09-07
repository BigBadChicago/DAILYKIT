import { describe, expect, it } from "vitest";
import {
  createRng,
  intBelow,
  intInRange,
  nextFloat,
  pick,
  shuffle,
  shuffled,
  weightedPick,
} from "../../src/core/rng.js";
import { rngFor, rngFromSeed, seedFor } from "../../src/core/seed.js";
import { DECK_VECTOR_PUZZLE_1, RNG_VECTORS } from "./rng.vectors.js";

describe("determinism vectors", () => {
  for (const vector of RNG_VECTORS) {
    const label = `${vector.gameId} #${vector.puzzleNumber}${vector.salt === null ? "" : ` salt ${vector.salt}`}`;

    it(`seed matches for ${label}`, () => {
      expect(seedFor(vector.gameId, vector.puzzleNumber, vector.salt ?? undefined)).toBe(vector.seed);
    });

    it(`stream matches for ${label}`, () => {
      const rng = rngFromSeed(vector.seed);
      const draws = vector.draws.map(() => rng.nextUint32());
      expect(draws).toEqual([...vector.draws]);
    });
  }

  it("shuffle matches the committed deck vector", () => {
    const rng = rngFor("poker-grid", 1);
    const deck = shuffled(rng, Array.from({ length: 52 }, (_unused, i) => i));
    expect(deck.slice(0, 35)).toEqual([...DECK_VECTOR_PUZZLE_1]);
  });
});

describe("reproducibility", () => {
  it("two generators from one seed agree over a long run", () => {
    const a = rngFromSeed(seedFor("poker-grid", 99));
    const b = rngFromSeed(seedFor("poker-grid", 99));
    let mismatches = 0;
    for (let i = 0; i < 5000; i += 1) {
      if (a.nextUint32() !== b.nextUint32()) mismatches += 1;
    }
    expect(mismatches).toBe(0);
  });

  it("draws stay inside the uint32 range", () => {
    const rng = rngFor("poker-grid", 3);
    let bad = 0;
    for (let i = 0; i < 100000; i += 1) {
      const v = rng.nextUint32();
      if (!Number.isInteger(v) || v < 0 || v >= 4294967296) bad += 1;
    }
    expect(bad).toBe(0);
  });

  it("does not immediately cycle", () => {
    const rng = rngFor("poker-grid", 4);
    const seen = new Set<number>();
    for (let i = 0; i < 20000; i += 1) seen.add(rng.nextUint32());
    /* A 20000 draw sample from 2^32 values expects a handful of birthday
       collisions at most. Anything near a short cycle collapses this count. */
    expect(seen.size).toBeGreaterThan(19990);
  });
});

describe("nextFloat", () => {
  it("stays in [0, 1)", () => {
    const rng = rngFor("poker-grid", 5);
    let bad = 0;
    for (let i = 0; i < 50000; i += 1) {
      const v = nextFloat(rng);
      if (v < 0 || v >= 1) bad += 1;
    }
    expect(bad).toBe(0);
  });
});

describe("intBelow", () => {
  it("stays in range", () => {
    const rng = rngFor("poker-grid", 7);
    let bad = 0;
    for (let i = 0; i < 200000; i += 1) {
      const v = intBelow(rng, 52);
      if (v < 0 || v >= 52) bad += 1;
    }
    expect(bad).toBe(0);
  });

  it("returns zero for a bound of one without consuming an unbounded loop", () => {
    const rng = rngFor("poker-grid", 8);
    let bad = 0;
    for (let i = 0; i < 100; i += 1) if (intBelow(rng, 1) !== 0) bad += 1;
    expect(bad).toBe(0);
  });

  it("is close to uniform over 52 buckets", () => {
    const rng = rngFor("poker-grid", 9);
    const draws = 52 * 20000;
    const counts = new Array<number>(52).fill(0);
    for (let i = 0; i < draws; i += 1) {
      const bucket = intBelow(rng, 52);
      counts[bucket] = (counts[bucket] as number) + 1;
    }
    const expected = draws / 52;
    const worst = counts.reduce(
      (max, count) => Math.max(max, Math.abs(count - expected) / expected),
      0,
    );
    expect(worst).toBeLessThan(0.05);
  });

  it("rejects bad bounds", () => {
    const rng = rngFor("poker-grid", 10);
    expect(() => intBelow(rng, 0)).toThrow(RangeError);
    expect(() => intBelow(rng, -3)).toThrow(RangeError);
    expect(() => intBelow(rng, 2.5)).toThrow(RangeError);
    expect(() => intBelow(rng, Number.NaN)).toThrow(RangeError);
    expect(() => intBelow(rng, 4294967297)).toThrow(RangeError);
  });
});

describe("intInRange", () => {
  it("includes both endpoints", () => {
    const rng = rngFor("poker-grid", 11);
    const seen = new Set<number>();
    for (let i = 0; i < 5000; i += 1) seen.add(intInRange(rng, 2, 14));
    expect(seen.has(2)).toBe(true);
    expect(seen.has(14)).toBe(true);
    expect(seen.size).toBe(13);
  });

  it("accepts a single value range and rejects an inverted one", () => {
    const rng = rngFor("poker-grid", 12);
    expect(intInRange(rng, 5, 5)).toBe(5);
    expect(() => intInRange(rng, 5, 4)).toThrow(RangeError);
    expect(() => intInRange(rng, 1.5, 4)).toThrow(RangeError);
  });
});

describe("pick", () => {
  it("only returns members and rejects an empty array", () => {
    const rng = rngFor("poker-grid", 13);
    const items = ["a", "b", "c"] as const;
    let bad = 0;
    for (let i = 0; i < 1000; i += 1) {
      if (!items.includes(pick(rng, items))) bad += 1;
    }
    expect(bad).toBe(0);
    expect(() => pick(rng, [])).toThrow(RangeError);
  });
});

describe("shuffle", () => {
  it("is a permutation", () => {
    const rng = rngFor("poker-grid", 14);
    const source = Array.from({ length: 52 }, (_unused, i) => i);
    let bad = 0;
    for (let trial = 0; trial < 200; trial += 1) {
      const out = shuffled(rng, source);
      const sorted = [...out].sort((a, b) => a - b);
      if (out.length !== 52 || sorted.some((value, index) => value !== index)) bad += 1;
    }
    expect(bad).toBe(0);
  });

  it("handles empty and single element arrays", () => {
    const rng = rngFor("poker-grid", 15);
    expect(shuffled(rng, [])).toEqual([]);
    expect(shuffled(rng, ["only"])).toEqual(["only"]);
  });

  it("shuffles in place and returns the same array", () => {
    const rng = rngFor("poker-grid", 16);
    const items = [1, 2, 3, 4, 5];
    expect(shuffle(rng, items)).toBe(items);
  });

  it("reaches every position for a small array", () => {
    const rng = rngFor("poker-grid", 17);
    const positions = [new Set<number>(), new Set<number>(), new Set<number>()];
    for (let i = 0; i < 500; i += 1) {
      const out = shuffled(rng, [0, 1, 2]);
      out.forEach((value, index) => positions[value]?.add(index));
    }
    for (const seen of positions) expect(seen.size).toBe(3);
  });
});

describe("weightedPick", () => {
  it("never returns a zero weighted item", () => {
    const rng = rngFor("poker-grid", 18);
    let bad = 0;
    for (let i = 0; i < 20000; i += 1) {
      if (weightedPick(rng, ["a", "b", "c"], [3, 0, 1]) === "b") bad += 1;
    }
    expect(bad).toBe(0);
  });

  it("approximates the weight ratio", () => {
    const rng = rngFor("poker-grid", 19);
    const draws = 100000;
    let aCount = 0;
    for (let i = 0; i < draws; i += 1) {
      if (weightedPick(rng, ["a", "b"], [3, 1]) === "a") aCount += 1;
    }
    expect(Math.abs(aCount / draws - 0.75)).toBeLessThan(0.01);
  });

  it("rejects malformed input", () => {
    const rng = rngFor("poker-grid", 20);
    expect(() => weightedPick(rng, ["a"], [1, 2])).toThrow(RangeError);
    expect(() => weightedPick(rng, ["a", "b"], [0, 0])).toThrow(RangeError);
    expect(() => weightedPick(rng, ["a", "b"], [1, -1])).toThrow(RangeError);
    expect(() => weightedPick(rng, ["a", "b"], [1, 0.5])).toThrow(RangeError);
  });
});

describe("createRng", () => {
  it("coerces its state words to int32 so equivalent inputs agree", () => {
    const a = createRng(1, 2, 3, 4);
    const b = createRng(1 + 4294967296, 2, 3, 4);
    let mismatches = 0;
    for (let i = 0; i < 100; i += 1) {
      if (a.nextUint32() !== b.nextUint32()) mismatches += 1;
    }
    expect(mismatches).toBe(0);
  });
});
