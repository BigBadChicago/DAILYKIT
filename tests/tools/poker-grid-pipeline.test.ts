import { describe, expect, it } from "vitest";
import {
  DIFFICULTY_BANDS,
  chunkOf as chunkFrom,
  evaluateCandidate,
  generateEntry,
  MIN_BEST_HANDS,
  MIN_OPENING_MOVES,
  saltFor,
} from "../../tools/generate.js";
import { verifyChunk, verifyEntry, type GeneratedEntry, type ManifestChunk } from "../../tools/verify.js";
import { calibrate } from "../../tools/calibrate.js";
import { MANIFEST_CODEC } from "../../src/games/poker-grid/manifest-codec.js";
import { weekdayFor } from "../../src/games/poker-grid/generator.js";
import { HAND_POINTS, HAND_POINTS_FLOOR } from "../../src/games/poker-grid/scoring.js";

/* Phase 11 correction, defect 7. A chunk keys its entries by puzzle number, so
   the test builds one the same way the tool does. */
const chunkOf = (boards: readonly GeneratedEntry[]): ManifestChunk => chunkFrom("2026-01", boards);

describe("Poker Grid generation pipeline", () => {
  it("generates a deterministic entry that its own verifier accepts", () => {
    const first = generateEntry(1).entry;
    const second = generateEntry(1).entry;
    expect(first).toEqual(second);
    expect(verifyChunk(chunkOf([first]))).toBe(1);
  });

  it("puts every board inside its weekday band and above the rejection floors", () => {
    for (const number of [1, 4]) {
      const { entry } = generateEntry(number);
      const band = DIFFICULTY_BANDS[weekdayFor(number)] as { min: number; max: number };
      expect(entry.difficulty).toBeGreaterThanOrEqual(band.min);
      expect(entry.difficulty).toBeLessThanOrEqual(band.max);
      expect(entry.openings).toBeGreaterThanOrEqual(MIN_OPENING_MOVES);
      expect(entry.best.hands).toBeGreaterThanOrEqual(MIN_BEST_HANDS);
      expect(entry.weekday).toBe(weekdayFor(number));
    }
  });

  it("records the attempt that produced the board, and attempt zero is the offline board", () => {
    expect(saltFor(0)).toBeUndefined();
    expect(saltFor(3)).toBe("retry-3");
    expect(generateEntry(4).entry.attempt).toBeGreaterThanOrEqual(0);
  });

  it("names the reason a candidate was thrown away", () => {
    const reasons = new Set<string>();
    for (let attempt = 0; attempt < 5; attempt += 1) {
      const candidate = evaluateCandidate(5, attempt);
      if (candidate.reason !== null) reasons.add(candidate.reason);
    }
    for (const reason of reasons) {
      expect(["no-opening-move", "too-few-openings", "strands-cards", "below-band", "above-band"]).toContain(reason);
    }
  });

  /* Every claim in an entry is independently checkable, so corrupting any one
     of them must fail verification rather than pass unnoticed. */
  it("rejects a tampered entry on every field it stores", () => {
    const { entry } = generateEntry(1);
    expect(() => verifyEntry(entry)).not.toThrow();
    expect(() => verifyEntry({ ...entry, board: entry.board.slice(1) })).toThrow();
    expect(() => verifyEntry({ ...entry, difficulty: 0.99 })).toThrow();
    expect(() => verifyEntry({ ...entry, greedyMedian: entry.greedyMedian + 5 })).toThrow();
    expect(() => verifyEntry({ ...entry, greedyTotal: entry.greedyTotal + 5 })).toThrow();
    expect(() => verifyEntry({ ...entry, openings: entry.openings + 1 })).toThrow();
    expect(() => verifyEntry({ ...entry, weekday: (entry.weekday + 1) % 7 })).toThrow();
    expect(() => verifyEntry({ ...entry, levers: ["none"] })).toThrow();
    expect(() => verifyEntry({ ...entry, attempt: entry.attempt + 1 })).toThrow();
    expect(() => verifyEntry({ ...entry, best: { ...entry.best, hands: 3 } })).toThrow();
    expect(() => verifyEntry({ ...entry, best: { ...entry.best, score: 999_999 } })).toThrow();
    expect(() => verifyEntry({ ...entry, best: { score: entry.best.score, hands: entry.best.hands, method: "beam" } })).toThrow();
  });

  it("rejects a chunk whose numbering does not run straight through", () => {
    const { entry } = generateEntry(1);
    expect(() => verifyChunk({ ...chunkOf([entry]), to: 31 })).toThrow();
    expect(() => verifyChunk({ ...chunkOf([entry]), codec: "made-up" })).toThrow();
  });

  it("measures availability over whole boards and derives the shipped table", () => {
    const report = calibrate(20);
    expect(report.samples).toBe(20);
    expect(report.selections).toBe(20 * 961);
    expect(report.boardsWithOpeningMove).toBe(20);
    expect(report.currentPoints).toEqual(HAND_POINTS);
    expect(report.derivedPoints["one-pair"]).toBe(HAND_POINTS_FLOOR);
    const shares = Object.values(report.shareOfLegal).reduce((sum, share) => sum + share, 0);
    expect(shares).toBeCloseTo(1, 6);
  });
});
