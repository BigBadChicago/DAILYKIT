import { describe, expect, it } from "vitest";
import { rngFor, rngFromSeed, seedFor } from "../../src/core/seed.js";

describe("seedFor", () => {
  it("is stable for the same inputs", () => {
    expect(seedFor("poker-grid", 250)).toBe(seedFor("poker-grid", 250));
  });

  it("returns a uint32", () => {
    let bad = 0;
    for (let n = 1; n <= 1000; n += 1) {
      const seed = seedFor("poker-grid", n);
      if (!Number.isInteger(seed) || seed < 0 || seed >= 4294967296) bad += 1;
    }
    expect(bad).toBe(0);
  });

  it("separates consecutive puzzle numbers", () => {
    const seeds = new Set<number>();
    for (let n = 1; n <= 4000; n += 1) seeds.add(seedFor("poker-grid", n));
    expect(seeds.size).toBe(4000);
  });

  it("separates games sharing a puzzle number", () => {
    expect(seedFor("poker-grid", 1)).not.toBe(seedFor("toy-tap", 1));
  });

  it("separates salts", () => {
    const base = seedFor("poker-grid", 250);
    expect(seedFor("poker-grid", 250, "retry-1")).not.toBe(base);
    expect(seedFor("poker-grid", 250, 1)).not.toBe(base);
    expect(seedFor("poker-grid", 250, "retry-1")).not.toBe(seedFor("poker-grid", 250, "retry-2"));
  });

  it("treats an absent salt and an empty salt as the same input", () => {
    expect(seedFor("poker-grid", 250, "")).toBe(seedFor("poker-grid", 250));
  });

  it("rejects a malformed game id", () => {
    for (const bad of [
      "Poker-Grid",
      "poker_grid",
      "-poker",
      "poker-",
      "poker--grid",
      "",
      "poker grid",
      "pok\u00e9r",
    ]) {
      expect(() => seedFor(bad, 1)).toThrow(RangeError);
    }
  });

  it("rejects a malformed puzzle number", () => {
    for (const bad of [
      0,
      -1,
      1.5,
      Number.NaN,
      Number.POSITIVE_INFINITY,
      Number.MAX_SAFE_INTEGER + 2,
    ]) {
      expect(() => seedFor("poker-grid", bad)).toThrow(RangeError);
    }
  });

  it("rejects a non ASCII or fractional salt", () => {
    expect(() => seedFor("poker-grid", 1, "retry-\u00e9")).toThrow(RangeError);
    expect(() => seedFor("poker-grid", 1, 1.5)).toThrow(RangeError);
  });
});

describe("rngFromSeed", () => {
  it("rejects anything that is not a uint32", () => {
    for (const bad of [-1, 1.5, 4294967296, Number.NaN]) {
      expect(() => rngFromSeed(bad)).toThrow(RangeError);
    }
  });

  it("decorrelates the first draw across consecutive puzzle numbers", () => {
    const first = new Set<number>();
    for (let n = 1; n <= 2000; n += 1) first.add(rngFor("poker-grid", n).nextUint32());
    /* The warmup plus splitmix expansion exists precisely so nearby seeds do
       not open with related output. Collisions here should be birthday rare. */
    expect(first.size).toBeGreaterThan(1998);
  });

  it("agrees with rngFor", () => {
    const viaSeed = rngFromSeed(seedFor("poker-grid", 42, "salt"));
    const viaHelper = rngFor("poker-grid", 42, "salt");
    let mismatches = 0;
    for (let i = 0; i < 100; i += 1) {
      if (viaSeed.nextUint32() !== viaHelper.nextUint32()) mismatches += 1;
    }
    expect(mismatches).toBe(0);
  });
});
