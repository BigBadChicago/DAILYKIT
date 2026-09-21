import { describe, expect, it } from "vitest";

import { maskOf } from "../../../src/games/pangram/letters.js";
import { familiarShareMeets, indexWords, pangramRoots, solveDay } from "../../../src/games/pangram/solver.js";
import { ACCEPTED, FAMILIAR, INDEX } from "./fixtures.js";

describe("PANGRAM exact enumeration", () => {
  it("finds exactly the accepted words the set admits, by brute force comparison", () => {
    const letters = "abhinot";
    const root = maskOf(letters);
    for (const centre of letters) {
      const brute = ACCEPTED.filter((w) => (maskOf(w) & ~root) === 0 && (maskOf(w) & maskOf(centre)) !== 0).sort();
      expect(solveDay(INDEX, letters, centre).answers).toEqual(brute);
    }
  });

  it("sums totals, pangrams and the familiar share", () => {
    const small = indexWords(["bath", "habitation", "hint", "inhabit"], ["bath", "habitation"]);
    const day = solveDay(small, "abhinot", "h");
    expect(day.total).toBe(1 + 14 + 1 + 4);
    expect(day.pangrams).toBe(1);
    expect(day.familiarTotal).toBe(15);
    expect(day.familiarPangram).toBe(true);
    expect(familiarShareMeets(day, 75)).toBe(true);
    expect(familiarShareMeets(day, 76)).toBe(false);
  });

  it("draws roots only from s free sets with a familiar pangram", () => {
    const roots = pangramRoots(INDEX, "s");
    expect(roots.length).toBeGreaterThan(2000);
    expect(roots).toEqual([...roots].sort());
    for (const root of roots.slice(0, 200)) {
      expect(root).toHaveLength(7);
      expect(root.includes("s")).toBe(false);
      expect(FAMILIAR.some((w) => maskOf(w) === maskOf(root))).toBe(true);
    }
  });
});
