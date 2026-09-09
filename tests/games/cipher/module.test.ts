import { describe, expect, it } from "vitest";
import { isErr, isOk } from "../../../src/core/result.js";
import { seedFor } from "../../../src/core/seed.js";
import { SHARE_MAX_ROWS, type SerializedState, type ShareContext } from "../../../src/core/types.js";
import { SHARE_GLYPHS } from "../../../src/shared/share-vocabulary.js";
import cipher from "../../../src/games/cipher/module.js";
import { encodeCode } from "../../../src/games/cipher/manifest-codec.js";
import {
  CODE_LENGTH,
  MAX_GUESSES,
  applyCipherAction,
  type CipherState,
  type Code,
} from "../../../src/games/cipher/rules.js";
import type { CipherPuzzle } from "../../../src/games/cipher/generator.js";

const CODE: Code = [1, 1, 4, 5];

function puzzleOf(number: number, code: Code = CODE): CipherPuzzle {
  return { number, code, levers: ["one-pair"], best: { remaining: 105, line: 5 } };
}

function entryOf(number: number, code: Code = CODE): unknown {
  return { number, code: encodeCode(number, code), levers: ["one-pair"], best: { remaining: 105, line: 5 } };
}

function state(puzzle: CipherPuzzle): CipherState {
  return cipher.initialState(puzzle as never) as unknown as CipherState;
}

function play(start: CipherState, guesses: readonly Code[]): CipherState {
  let current = start;
  for (const guess of guesses) {
    for (let slot = 0; slot < CODE_LENGTH; slot += 1) {
      const set = applyCipherAction(current, { kind: "set", slot, symbol: guess[slot] as number });
      if (!isOk(set)) throw new Error(set.error.code);
      current = set.value;
    }
    const submit = applyCipherAction(current, { kind: "submit" });
    if (!isOk(submit)) throw new Error(submit.error.code);
    current = submit.value;
  }
  return current;
}

const context = (overrides: Partial<ShareContext> = {}): ShareContext => ({
  puzzleNumber: 12,
  currentStreak: 0,
  rated: true,
  ...overrides,
});

describe("cipher module identity", () => {
  it("declares custom input with the keys the renderer handles", () => {
    expect(cipher.input.kind).toBe("custom");
    expect(cipher.input).toMatchObject({ pointer: "tap" });
    expect((cipher.input as { keys: readonly string[] }).keys).toContain("Enter");
    expect((cipher.input as { keys: readonly string[] }).keys).toContain("6");
  });

  it("is the first module in the project with a real win and loss", () => {
    expect(cipher.hasWinLoss).toBe(true);
    expect(cipher.distribution.labels).toHaveLength(7);
    expect(cipher.distribution.distinguishedIndex).toBe(0);
    expect(cipher.archiveEnabled).toBe(true);
  });

  it("resolves every day to the one horizon chunk", () => {
    expect(cipher.manifest.urlForChunk(1)).toBe("/data/cipher/manifest.horizon.json");
    expect(cipher.manifest.urlForChunk(364)).toBe(cipher.manifest.urlForChunk(1));
    expect(cipher.manifest.indexUrl).toBe("/data/cipher/manifest.index.json");
  });

  it("starts on the first Monday of the epoch year", () => {
    expect(cipher.identity.epoch).toEqual({ year: 2026, month: 1, day: 5 });
  });
});

describe("parsePuzzle", () => {
  it("decodes a manifest entry", () => {
    const parsed = cipher.parsePuzzle(7, entryOf(7));
    expect(isOk(parsed)).toBe(true);
    expect((parsed as unknown as { value: CipherPuzzle }).value.code).toEqual(CODE);
  });

  it("refuses an entry encoded for another day, because the keystream is per puzzle", () => {
    const parsed = cipher.parsePuzzle(8, entryOf(7));
    if (isOk(parsed)) {
      expect((parsed.value as unknown as CipherPuzzle).code).not.toEqual(CODE);
    } else {
      expect(parsed.error.code).toBe("malformed");
    }
  });

  it("rejects malformed entries on every field it reads", () => {
    for (const raw of [
      null,
      "entry",
      { code: "AB" },
      { code: encodeCode(7, CODE), best: { remaining: "many", line: 5 } },
      { code: encodeCode(7, CODE), levers: ["nonsense"] },
    ]) {
      expect(isErr(cipher.parsePuzzle(7, raw))).toBe(true);
    }
  });

  it("accepts an entry with no best, which is how an unrated day reads", () => {
    const parsed = cipher.parsePuzzle(7, { code: encodeCode(7, CODE), levers: ["one-pair"] });
    expect(isOk(parsed)).toBe(true);
  });

  it("generates the same puzzle for a seed every time, past the horizon", () => {
    const first = cipher.generatePuzzle(400, seedFor("cipher", 400));
    const second = cipher.generatePuzzle(400, seedFor("cipher", 400));
    expect(isOk(first) && isOk(second)).toBe(true);
    expect(first).toEqual(second);
    expect((first as unknown as { value: CipherPuzzle }).value.best).toBeNull();
  });
});

describe("serialize and deserialize", () => {
  it("round trips an in progress game without storing the code", () => {
    const puzzle = puzzleOf(12);
    const played = play(state(puzzle), [[0, 1, 2, 3], [3, 2, 1, 0]]);
    const partial = applyCipherAction(played, { kind: "set", slot: 0, symbol: 5 });
    const withDraft = isOk(partial) ? partial.value : played;

    const raw = cipher.serialize(withDraft as never);
    expect(JSON.stringify(raw)).not.toContain(CODE.join(""));
    expect(raw.v).toBe(1);

    const restored = cipher.deserialize(puzzle as never, raw);
    expect(isOk(restored)).toBe(true);
    expect(restored).toEqual({ ok: true, value: withDraft });
  });

  it("recomputes feedback rather than trusting it", () => {
    const puzzle = puzzleOf(12);
    const played = play(state(puzzle), [[1, 1, 4, 5]]);
    const raw = cipher.serialize(played as never);
    expect(JSON.stringify(raw)).not.toContain("exact");
    const restored = cipher.deserialize(puzzle as never, raw);
    expect(isOk(restored)).toBe(true);
    expect((restored as unknown as { value: CipherState }).value.solved).toBe(true);
  });

  it("rejects a payload that is malformed, over the guess limit, or repeats a guess", () => {
    const puzzle = puzzleOf(12);
    const bad: readonly SerializedState[] = [
      { v: 2, data: { d: "....", g: [] } },
      { v: 1, data: null },
      { v: 1, data: { d: "...", g: [] } },
      { v: 1, data: { d: "..9.", g: [] } },
      { v: 1, data: { d: "....", g: ["0123", "0123"] } },
      { v: 1, data: { d: "....", g: ["0123", "1234", "2345", "3450", "4501", "5012", "0124"] } },
      { v: 1, data: { d: "....", g: ["012"] } },
    ];
    for (const raw of bad) expect(isErr(cipher.deserialize(puzzle as never, raw))).toBe(true);
  });

  /* Defect 6, written down as a test so the correction has something to break.
     Every four symbol guess is legal against every code, so a save from another
     day deserializes cleanly and shows feedback that never happened. */
  it("cannot detect a save from a different puzzle, which is defect 6", () => {
    const yesterday = play(state(puzzleOf(11, [0, 0, 0, 0])), [[4, 1, 1, 1]]);
    const raw = cipher.serialize(yesterday as never);
    const restored = cipher.deserialize(puzzleOf(12) as never, raw);
    expect(isOk(restored)).toBe(true);
    const feedback = (restored as unknown as { value: CipherState }).value.guesses[0]?.feedback;
    expect(yesterday.guesses[0]?.feedback).toEqual({ exact: 0, misplaced: 0 });
    /* The stored guess now reads as one in place and two misplaced, against a
       code the player never saw. Nothing in the module can tell. */
    expect(feedback).toEqual({ exact: 1, misplaced: 2 });
  });

  it("refuses a migration, because there is no earlier version to come from", () => {
    expect(isErr(cipher.migrateState(0, { v: 0, data: {} }))).toBe(true);
  });
});

describe("inspect and bucketOf", () => {
  it("reports ongoing until the code is broken or the guesses run out", () => {
    const puzzle = puzzleOf(12);
    expect(cipher.inspect(state(puzzle) as never).kind).toBe("ongoing");
    const one = play(state(puzzle), [[0, 1, 2, 3]]);
    expect(cipher.inspect(one as never).kind).toBe("ongoing");
  });

  it("grades a win by guess count", () => {
    const puzzle = puzzleOf(12);
    const solved = play(state(puzzle), [[0, 1, 2, 3], [3, 2, 1, 0], CODE]);
    const outcome = cipher.inspect(solved as never);
    expect(outcome).toMatchObject({ kind: "finished", won: true, score: 3, tier: 1, detail: "Solved in 3" });
    expect(cipher.bucketOf(outcome as never, solved as never)).toBe(2);
  });

  it("grades a loss as Rough and the last bucket", () => {
    const puzzle = puzzleOf(12);
    const lost = play(state(puzzle), [
      [0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 2], [0, 0, 0, 3], [0, 0, 0, 4], [0, 0, 1, 0],
    ]);
    const outcome = cipher.inspect(lost as never);
    expect(outcome).toMatchObject({ kind: "finished", won: false, score: 0, tier: 4, detail: "Not solved" });
    expect(cipher.bucketOf(outcome as never, lost as never)).toBe(6);
    expect(lost.guesses).toHaveLength(MAX_GUESSES);
  });
});

describe("shareBlock", () => {
  const puzzle = puzzleOf(12);

  it("emits one four cell row per guess, sorted so no slot leaks", () => {
    const solved = play(state(puzzle), [[1, 4, 5, 1], CODE]);
    const block = cipher.shareBlock(solved as never, context());
    expect(block.rows).toHaveLength(2);
    for (const row of block.rows) expect(row).toHaveLength(CODE_LENGTH);
    expect(block.rows[0]).toEqual(["best", "partial", "partial", "partial"]);
    expect(block.rows[1]).toEqual(["best", "best", "best", "best"]);
  });

  it("never exceeds the engine's row cap, even on a full six guess game", () => {
    const lost = play(state(puzzle), [
      [0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 2], [0, 0, 0, 3], [0, 0, 0, 4], [0, 0, 1, 0],
    ]);
    const block = cipher.shareBlock(lost as never, context());
    expect(block.rows.length).toBeLessThanOrEqual(SHARE_MAX_ROWS);
    expect(block.rows).toHaveLength(MAX_GUESSES);
  });

  it("carries the tier in the title even when the shell calls the day unrated", () => {
    const solved = play(state(puzzle), [CODE]);
    expect(cipher.shareBlock(solved as never, context()).title).toBe("CIPHER #12 Excellent");
    expect(cipher.shareBlock(solved as never, context({ rated: false })).title).toBe("CIPHER #12 Excellent");
  });

  it("adds a streak only once it is worth reading", () => {
    const solved = play(state(puzzle), [CODE]);
    expect(cipher.shareBlock(solved as never, context({ currentStreak: 1 })).title).not.toContain("streak");
    expect(cipher.shareBlock(solved as never, context({ currentStreak: 9 })).title).toContain("streak 9");
  });

  it("uses only tier vocabulary tokens, never a codepoint", () => {
    const played = play(state(puzzle), [[1, 4, 5, 1], CODE]);
    const block = cipher.shareBlock(played as never, context());
    for (const row of block.rows) {
      for (const token of row) {
        expect(["best", "partial", "miss"]).toContain(token);
        expect(SHARE_GLYPHS[token]).toBeTruthy();
      }
    }
  });
});
