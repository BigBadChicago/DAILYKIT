// @vitest-environment jsdom
import { describe, expect, it } from "vitest";
import { HARNESS_CASES } from "../../tools/share-harness/cases.js";
import { graphemeWidth, widthReport } from "../../tools/share-harness/main.js";

describe("harness width measurement", () => {
  it("counts astral glyphs as one column", () => {
    // Every share glyph outside the basic plane is a surrogate pair, so a
    // check written against String.length would pass on a misaligned block.
    expect(graphemeWidth("\uD83D\uDFE9\uD83D\uDFE9")).toBe(2);
    expect("\uD83D\uDFE9\uD83D\uDFE9".length).toBe(4);
    expect(graphemeWidth("\u2B50")).toBe(1);
  });

  it("excludes the title and URL lines from the width check", () => {
    const report = widthReport("A long title\n\u2B50\n\u2B50\nhost");
    expect(report.widths).toEqual([1, 1]);
    expect(report.uniform).toBe(true);
  });

  it("reports a ragged block", () => {
    expect(widthReport("t\n\u2B50\u2B50\n\u2B50\nhost").uniform).toBe(false);
  });
});

describe("harness cases", () => {
  it("have unique ids", () => {
    const ids = HARNESS_CASES.map((c) => c.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("cover the outcome space the snapshot tests will need", () => {
    const ids = new Set(HARNESS_CASES.map((c) => c.id));
    for (const required of ["zero-hands", "one-hand", "perfect-clear", "unrated", "over-max-rows"]) {
      expect(ids.has(required)).toBe(true);
    }
  });
});
