import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { MAX_GUESSES } from "../../src/games/cipher/rules.js";
import { MIN_LINE, bandFor, inBand, leverOf, weekdayFor } from "../../src/games/cipher/generator.js";
import { MANIFEST_CODEC, decodeCode } from "../../src/games/cipher/manifest-codec.js";
import { codeIndex, remainingAfterOpening, solveLine } from "../../src/games/cipher/solver.js";
import {
  GAME_ID,
  chunkOf as chunkFrom,
  entriesOf,
  evaluateCandidate,
  generateEntry,
  saltFor,
  type GeneratedEntry,
  type ManifestChunk,
} from "../../tools/cipher-generate.js";
import { verifyChunk, verifyEntry } from "../../tools/cipher-verify.js";

/* Phase 11 correction, defect 7. Entries are keyed by puzzle number. */
const chunkOf = (boards: readonly GeneratedEntry[]): ManifestChunk => chunkFrom("1-365", boards);

const DAYS = [1, 2, 3, 4, 5, 6, 7];

describe("Cipher generation pipeline", () => {
  it("generates a deterministic entry that its own verifier accepts", () => {
    const first = generateEntry(1).entry;
    const second = generateEntry(1).entry;
    expect(first).toEqual(second);
    expect(verifyChunk(chunkOf([first]))).toBe(1);
  });

  it("puts every weekday inside its band and above the fairness floor", () => {
    for (const number of DAYS) {
      const { entry } = generateEntry(number);
      expect(bandFor(number)).toContain(entry.best.remaining);
      expect(inBand(number, entry.best.remaining)).toBe(true);
      expect(entry.best.line).toBeGreaterThanOrEqual(MIN_LINE);
      expect(entry.best.line).toBeLessThanOrEqual(MAX_GUESSES);
      expect(entry.levers).toEqual([leverOf(decodeCode(number, entry.code)!)]);
    }
  });

  it("counts a rejection reason for every candidate it throws away", () => {
    const { entry, rejected } = generateEntry(1);
    const thrownAway = Object.values(rejected).reduce((sum, hits) => sum + hits, 0);
    expect(thrownAway).toBe(entry.attempt);
    for (const reason of Object.keys(rejected)) {
      expect(["below-floor", "out-of-band", "already-used"]).toContain(reason);
    }
  });

  it("refuses a code already used earlier in the horizon", () => {
    const first = generateEntry(1).entry;
    const index = codeIndex(decodeCode(1, first.code)!);
    const second = generateEntry(1, new Set([index])).entry;
    expect(second.code).not.toBe(first.code);
    expect(second.attempt).toBeGreaterThan(first.attempt);
  });

  it("skips the expensive solve for a candidate the band already refused", () => {
    /* line is zero exactly when the band rejected the draw, which is the only
       reason a candidate can carry a line below the guess limit. */
    let sawSkipped = false;
    for (let attempt = 0; attempt < 40 && !sawSkipped; attempt += 1) {
      const candidate = evaluateCandidate(2, attempt);
      if (!inBand(2, candidate.remaining)) {
        expect(candidate.line).toBe(0);
        sawSkipped = true;
      }
    }
    expect(sawSkipped).toBe(true);
  });

  it("regenerates a stored entry from the seed and attempt it records", () => {
    for (const number of DAYS) {
      const { entry } = generateEntry(number);
      expect(saltFor(entry.attempt)).toBe(entry.attempt === 0 ? undefined : entry.attempt);
      expect(() => verifyEntry(entry)).not.toThrow();
    }
  });

  it("fails on any single tampered field", () => {
    const entry = generateEntry(3).entry;
    const decoded = decodeCode(3, entry.code)!;
    const otherRemaining = entry.best.remaining === 276 ? 105 : 276;

    expect(() => verifyEntry({ ...entry, attempt: entry.attempt + 1 })).toThrow();
    expect(() => verifyEntry({ ...entry, code: "AAAA" })).toThrow();
    expect(() => verifyEntry({ ...entry, levers: ["two-pairs"] })).toThrow();
    expect(() => verifyEntry({ ...entry, best: { ...entry.best, remaining: otherRemaining } })).toThrow();
    expect(() => verifyEntry({ ...entry, best: { ...entry.best, line: entry.best.line + 1 } })).toThrow();
    expect(() => verifyEntry({ ...entry, number: entry.number + 1 })).toThrow();
    /* The untampered entry still passes, so the throws above are the edits and
       not the fixture. */
    expect(remainingAfterOpening(codeIndex(decoded))).toBe(entry.best.remaining);
    expect(solveLine(codeIndex(decoded)).length).toBe(entry.best.line);
  });

  it("refuses a chunk with a gap, a repeat, or the wrong codec", () => {
    const one = generateEntry(1).entry;
    const three = generateEntry(3).entry;
    expect(() => verifyChunk(chunkOf([one, three]))).toThrow();
    expect(() => verifyChunk({ ...chunkOf([one]), codec: "plain" })).toThrow();
    expect(() => verifyChunk({ ...chunkOf([one]), game: "poker-grid" })).toThrow();
    const repeat = { ...one, number: 2 };
    expect(() => verifyChunk(chunkOf([one, repeat]))).toThrow();
  });
});

describe("the committed manifest", () => {
  const chunk = JSON.parse(
    readFileSync("data/cipher/manifest.horizon.json", "utf8"),
  ) as ManifestChunk;
  const index = JSON.parse(readFileSync("data/cipher/manifest.index.json", "utf8")) as {
    horizon: number;
    chunks: readonly { from: number; to: number; url: string }[];
  };

  it("covers the horizon the index claims, in one chunk", () => {
    expect(index.horizon).toBe(365);
    expect(index.chunks).toHaveLength(1);
    expect(entriesOf(chunk)).toHaveLength(index.horizon);
    expect(chunk.from).toBe(1);
    expect(chunk.to).toBe(index.horizon);
  });

  it("never repeats a code across the year", () => {
    const codes = entriesOf(chunk).map((entry) => decodeCode(entry.number, entry.code)!.join(""));
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("holds every day inside its weekday band", () => {
    for (const entry of entriesOf(chunk)) {
      expect(bandFor(entry.number)).toContain(entry.best.remaining);
      expect(entry.best.line).toBeGreaterThanOrEqual(MIN_LINE);
      expect(entry.best.line).toBeLessThanOrEqual(MAX_GUESSES);
    }
  });

  it("carries a difficulty curve that rises across the week", () => {
    const byWeekday = new Map<number, number[]>();
    for (const entry of entriesOf(chunk)) {
      const weekday = weekdayFor(entry.number);
      byWeekday.set(weekday, [...(byWeekday.get(weekday) ?? []), entry.best.remaining]);
    }
    const median = (values: readonly number[]): number =>
      [...values].sort((a, b) => a - b)[Math.floor(values.length / 2)] as number;
    const at = (weekday: number): number => median(byWeekday.get(weekday) as number[]);
    expect(at(1)).toBeLessThan(at(2));
    expect(at(4)).toBeLessThan(at(0));
    expect(at(0)).toBeLessThan(at(5));
    expect(at(5)).toBeLessThan(at(6));
    for (const values of byWeekday.values()) expect(values.length).toBeGreaterThanOrEqual(52);
  });
});
