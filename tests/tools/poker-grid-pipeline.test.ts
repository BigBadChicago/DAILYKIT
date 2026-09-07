import { describe, expect, it } from "vitest";
import { generateEntry } from "../../tools/generate.js";
import { verifyChunk, type ManifestChunk } from "../../tools/verify.js";
import { calibrate } from "../../tools/calibrate.js";

describe("Poker Grid generation pipeline", () => {
  it("generates a deterministic verified entry", () => {
    const first = generateEntry(1, 250);
    const second = generateEntry(1, 250);
    expect(first).toEqual(second);
    const chunk: ManifestChunk = { game: "poker-grid", month: "2026-01", from: 1, to: 1, boards: [first] };
    expect(verifyChunk(chunk, 250)).toBe(1);
  });

  it("reports opening availability and category counts", () => {
    const report = calibrate(2);
    expect(report.samples).toBe(2);
    expect(report.openingRate).toBeGreaterThanOrEqual(0);
    expect(report.openingRate).toBeLessThanOrEqual(1);
    expect(report.averageLegalSelections).toBeGreaterThanOrEqual(0);
    expect(Object.values(report.categoryCounts).reduce((sum, count) => sum + count, 0)).toBeGreaterThan(0);
  });
});
