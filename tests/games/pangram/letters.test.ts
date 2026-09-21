import { describe, expect, it } from "vitest";

import {
  bitCount,
  fitsSet,
  isPangram,
  maskOf,
  scoreOf,
  thresholdFor,
} from "../../../src/games/pangram/letters.js";

const ROOT = maskOf("abhinot");
const CENTRE = maskOf("h");

describe("PANGRAM letter primitives", () => {
  it("masks letters and counts them", () => {
    expect(maskOf("a")).toBe(1);
    expect(maskOf("aaa")).toBe(1);
    expect(bitCount(ROOT)).toBe(7);
  });

  it("scores one point per letter past three and seven more for a pangram", () => {
    expect(scoreOf("bath", ROOT)).toBe(1);
    expect(scoreOf("habit", ROOT)).toBe(2);
    expect(scoreOf("habitation", ROOT)).toBe(7 + 7);
    expect(isPangram("habitation", ROOT)).toBe(true);
    expect(isPangram("habit", ROOT)).toBe(false);
  });

  it("fits a word only when long enough, inside the set, and with the centre", () => {
    expect(fitsSet("bath", ROOT, CENTRE)).toBe(true);
    expect(fitsSet("hot", ROOT, CENTRE)).toBe(false);
    expect(fitsSet("tint", ROOT, CENTRE)).toBe(false);
    expect(fitsSet("hose", ROOT, CENTRE)).toBe(false);
    expect(fitsSet("Bath", ROOT, CENTRE)).toBe(false);
  });

  it("rounds a threshold up so it is met exactly at the percentage", () => {
    expect(thresholdFor(60, 100)).toBe(60);
    expect(thresholdFor(60, 63)).toBe(38);
    expect(thresholdFor(10, 1)).toBe(1);
  });
});
