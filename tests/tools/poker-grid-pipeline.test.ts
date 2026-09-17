import { readFileSync, readdirSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  OUTPUT_DIR,
  entriesOf,
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
import {
  DIFFICULTY_SCALE,
  UNRATED_DIFFICULTY,
  difficultyFrom,
  greedyTotalFor,
} from "../../src/games/poker-grid/difficulty.js";
import { decodeBoard } from "../../src/games/poker-grid/manifest-codec.js";

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

/**
 * ARCHITECTURE2 section 9 and section 52 risk 2, held against the shipped
 * horizon rather than against a board this test generated.
 *
 * A sample rather than all 365, because the replay is nine greedy runs per
 * board and the whole horizon would roughly double the suite. The full horizon
 * is covered by `npm run poker-grid:verify`, which already replays the greedy
 * runs for every entry and which gained the same assertion in phase 4. The
 * sample is chosen to cover every weekday and every chunk, so a defect that is
 * specific to one band or one month cannot hide from it.
 */
describe("POKER GRID manifest difficulty, sampled", () => {
  const chunkFiles = (): readonly string[] =>
    readdirSync(OUTPUT_DIR).filter((name) => /^manifest\.\d{4}-\d{2}\.json$/.test(name)).sort();

  const readChunk = (file: string): ManifestChunk =>
    JSON.parse(readFileSync(`${OUTPUT_DIR}/${file}`, "utf8")) as ManifestChunk;

  function sample(): readonly GeneratedEntry[] {
    const files = chunkFiles();
    const byNumber = new Map<number, GeneratedEntry>();
    /* The first seven puzzles, which is one of every weekday and therefore one
       of every band. */
    for (const entry of entriesOf(readChunk(files[0] as string)).slice(0, 7)) {
      byNumber.set(entry.number, entry);
    }
    /* Then the first entry of every month, so no chunk goes unread. */
    for (const file of files) {
      const first = entriesOf(readChunk(file))[0] as GeneratedEntry;
      byNumber.set(first.number, first);
    }
    return [...byNumber.values()].sort((a, b) => a.number - b.number);
  }

  it("covers every weekday and every chunk", () => {
    const entries = sample();
    expect(new Set(entries.map((entry) => entry.weekday)).size).toBe(7);
    expect(entries.length).toBeGreaterThanOrEqual(chunkFiles().length);
  });

  it("recomputes the v3 integer from runs it replayed itself", () => {
    for (const entry of sample()) {
      const cells = decodeBoard(entry.number, entry.board);
      expect(cells).not.toBeNull();
      if (cells === null) return;
      /* Replayed, not read. A manifest whose stored total did not come from
         these nine runs fails here rather than shipping a band claim. */
      const replayed = greedyTotalFor(entry.number, cells, entry.attempt);
      expect(replayed).toBe(entry.greedyTotal);

      const measured = difficultyFrom(entry.best.score, replayed);
      expect(measured).not.toBe(UNRATED_DIFFICULTY);
      expect(Number.isInteger(measured)).toBe(true);
      /* The stored fraction was rounded to six places before it was written, so
         scaling it can land one basis point away. A real drift is tens. */
      expect(Math.abs(measured - entry.difficulty * DIFFICULTY_SCALE)).toBeLessThanOrEqual(1);
    }
  });

  /* The same tamper discipline the entry verifier already applies, aimed at the
     two fields the v3 measure reads. */
  it("moves when either input moves", () => {
    const entry = sample()[0] as GeneratedEntry;
    const honest = difficultyFrom(entry.best.score, entry.greedyTotal);
    expect(difficultyFrom(entry.best.score + 500, entry.greedyTotal)).not.toBe(honest);
    expect(difficultyFrom(entry.best.score, entry.greedyTotal + 500)).not.toBe(honest);
    expect(() => verifyEntry({ ...entry, greedyTotal: entry.greedyTotal + 500 })).toThrow();
  });
});
