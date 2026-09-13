import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { CODE_SPACE, type Code } from "../../../src/games/cipher/rules.js";
import {
  OPENING_GUESS,
  codeAt,
  codeIndex,
  difficultyOf,
  remainingAfterOpening,
} from "../../../src/games/cipher/difficulty.js";
import {
  codeAt as solverCodeAt,
  codeIndex as solverCodeIndex,
  remainingAfterOpening as tableRemaining,
} from "../../../src/games/cipher/solver.js";
import { decodeCode } from "../../../src/games/cipher/manifest-codec.js";
import { internals } from "../../../src/games/cipher/module.js";
import type { CipherPuzzle } from "../../../src/games/cipher/generator.js";

interface StoredEntry {
  readonly code: string;
  readonly best: { readonly remaining: number; readonly line: number };
}

const chunk = JSON.parse(readFileSync("data/cipher/manifest.horizon.json", "utf8")) as {
  readonly entries: Readonly<Record<string, StoredEntry>>;
};

const index = JSON.parse(readFileSync("data/cipher/manifest.index.json", "utf8")) as {
  readonly horizon: number;
  readonly opening: readonly number[];
};

describe("the table free difficulty measure", () => {
  /* The whole point of keeping two implementations. The browser cannot carry
     the solver's 1.7 megabyte table and verification does not want to pay 1,296
     feedback evaluations per day, so they are separate code, and separate code
     that claims to compute one number is exactly what drifts unnoticed. */
  it("agrees with the solver's table on all 1,296 codes", () => {
    for (let index_ = 0; index_ < CODE_SPACE; index_ += 1) {
      const code = codeAt(index_);
      expect(remainingAfterOpening(code)).toBe(tableRemaining(index_));
    }
  });

  it("shares one code space enumeration with the solver, rather than a copy", () => {
    expect(solverCodeAt).toBe(codeAt);
    expect(solverCodeIndex).toBe(codeIndex);
    for (let index_ = 0; index_ < CODE_SPACE; index_ += 1) {
      expect(codeIndex(codeAt(index_))).toBe(index_);
    }
  });

  it("opens on the guess the manifest index says it opened on", () => {
    expect([...index.opening]).toEqual([...OPENING_GUESS]);
  });

  /* CIPHER.md section 8.1. Fourteen classes, three of them too small to survive
     the fairness floor, which is why a band is a set of classes rather than a
     numeric window. A measure that started producing a fifteenth value would be
     a different measure, and the stored horizon would no longer mean what it
     says. */
  it("partitions the space into the fourteen classes the design document names", () => {
    const classes = new Set<number>();
    for (let index_ = 0; index_ < CODE_SPACE; index_ += 1) {
      classes.add(remainingAfterOpening(codeAt(index_)));
    }
    expect([...classes].sort((a, b) => a - b)).toEqual([
      1, 2, 4, 5, 20, 40, 44, 81, 84, 105, 182, 222, 230, 276,
    ]);
  });

  it("memoizes without ever answering for the wrong code", () => {
    const first: Code = [1, 1, 4, 5];
    const second: Code = [0, 3, 3, 2];
    const a = remainingAfterOpening(first);
    const b = remainingAfterOpening(second);
    expect(difficultyOf(first)).toBe(a);
    expect(difficultyOf(first)).toBe(a);
    expect(difficultyOf(second)).toBe(b);
    expect(difficultyOf(first)).toBe(a);
  });
});

describe("the module's difficulty against the stored horizon", () => {
  const puzzleOf = (number: number, code: Code): CipherPuzzle => ({
    number,
    code,
    levers: ["one-pair"],
    best: { remaining: -1, line: -1 },
  });

  /* ARCHITECTURE2 section 52 risk 2, made mechanical. A generator that drifted
     from the measure would fail here rather than ship a band claim nobody
     checks. The stored `best.remaining` is deliberately not handed to the
     module: the puzzle passed in carries a nonsense one. */
  it("recomputes every one of the 365 stored difficulties", () => {
    const numbers = Object.keys(chunk.entries);
    expect(numbers).toHaveLength(index.horizon);
    for (const key of numbers) {
      const number = Number(key);
      const entry = chunk.entries[key] as StoredEntry;
      const code = decodeCode(number, entry.code);
      expect(code).not.toBeNull();
      expect(internals.difficulty(puzzleOf(number, code as Code))).toBe(entry.best.remaining);
    }
  });

  it("measures a code past the horizon, where there is no stored value to read", () => {
    const unrated: CipherPuzzle = { number: 900, code: [2, 2, 5, 3], levers: ["one-pair"], best: null };
    expect(internals.difficulty(unrated)).toBe(remainingAfterOpening(unrated.code));
    expect(internals.difficulty(unrated)).toBeGreaterThan(0);
  });
});
