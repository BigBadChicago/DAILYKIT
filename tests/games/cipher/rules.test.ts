import { describe, expect, it } from "vitest";
import { isErr, isOk } from "../../../src/core/result.js";
import {
  CODE_LENGTH,
  CODE_SPACE,
  MAX_GUESSES,
  SYMBOL_COUNT,
  applyCipherAction,
  bucketFor,
  draftCode,
  initialCipherState,
  isCode,
  isTerminal,
  scoreGuess,
  solvedBy,
  tierFor,
  type CipherState,
  type Code,
} from "../../../src/games/cipher/rules.js";

function play(state: CipherState, guess: Code): CipherState {
  let next = state;
  for (let slot = 0; slot < CODE_LENGTH; slot += 1) {
    const set = applyCipherAction(next, { kind: "set", slot, symbol: guess[slot] as number });
    if (!isOk(set)) throw new Error(`set rejected: ${set.error.code}`);
    next = set.value;
  }
  const submit = applyCipherAction(next, { kind: "submit" });
  if (!isOk(submit)) throw new Error(`submit rejected: ${submit.error.code}`);
  return submit.value;
}

describe("cipher constants", () => {
  it("states the code space it claims", () => {
    expect(SYMBOL_COUNT ** CODE_LENGTH).toBe(CODE_SPACE);
  });
});

describe("scoreGuess", () => {
  it("matches every worked example in CIPHER.md section 4.2", () => {
    expect(scoreGuess([0, 0, 2, 3], [0, 2, 0, 0])).toEqual({ exact: 1, misplaced: 2 });
    expect(scoreGuess([0, 0, 2, 3], [0, 0, 2, 3])).toEqual({ exact: 4, misplaced: 0 });
    expect(scoreGuess([0, 0, 2, 3], [3, 3, 3, 3])).toEqual({ exact: 1, misplaced: 0 });
    expect(scoreGuess([0, 0, 0, 0], [0, 0, 1, 1])).toEqual({ exact: 2, misplaced: 0 });
    expect(scoreGuess([0, 1, 2, 3], [3, 2, 1, 0])).toEqual({ exact: 0, misplaced: 4 });
  });

  it("never counts a symbol twice", () => {
    for (let answer = 0; answer < CODE_SPACE; answer += 7) {
      for (let guess = 0; guess < CODE_SPACE; guess += 11) {
        const feedback = scoreGuess(indexToCode(answer), indexToCode(guess));
        expect(feedback.exact + feedback.misplaced).toBeLessThanOrEqual(CODE_LENGTH);
        expect(feedback.exact).toBeGreaterThanOrEqual(0);
        expect(feedback.misplaced).toBeGreaterThanOrEqual(0);
      }
    }
  });

  it("is symmetric, which is what lets the solver table fill both triangles", () => {
    for (let answer = 0; answer < CODE_SPACE; answer += 13) {
      for (let guess = 0; guess < CODE_SPACE; guess += 17) {
        expect(scoreGuess(indexToCode(answer), indexToCode(guess)))
          .toEqual(scoreGuess(indexToCode(guess), indexToCode(answer)));
      }
    }
  });

  it("reports a solve only on four exact", () => {
    expect(solvedBy({ exact: 4, misplaced: 0 })).toBe(true);
    expect(solvedBy({ exact: 3, misplaced: 1 })).toBe(false);
  });

  it("refuses a malformed code", () => {
    expect(() => scoreGuess([0, 1, 2] as unknown as Code, [0, 1, 2, 3])).toThrow(RangeError);
    expect(() => scoreGuess([0, 1, 2, 6], [0, 1, 2, 3])).toThrow(RangeError);
    expect(isCode([0, 1, 2, 3])).toBe(true);
    expect(isCode([0, 1, 2, -1])).toBe(false);
  });
});

describe("applyCipherAction", () => {
  const code: Code = [1, 1, 4, 5];

  it("sets, overwrites, and clears a slot", () => {
    let state = initialCipherState(code);
    state = expectOk(applyCipherAction(state, { kind: "set", slot: 2, symbol: 3 }));
    expect(state.draft[2]).toBe(3);
    state = expectOk(applyCipherAction(state, { kind: "set", slot: 2, symbol: 4 }));
    expect(state.draft[2]).toBe(4);
    state = expectOk(applyCipherAction(state, { kind: "clear", slot: 2 }));
    expect(state.draft[2]).toBeNull();
    expect(draftCode(state)).toBeNull();
  });

  it("rejects a slot outside the code", () => {
    const state = initialCipherState(code);
    expect(expectErr(applyCipherAction(state, { kind: "set", slot: 4, symbol: 0 })).code).toBe("slot-range");
    expect(expectErr(applyCipherAction(state, { kind: "set", slot: -1, symbol: 0 })).code).toBe("slot-range");
    expect(expectErr(applyCipherAction(state, { kind: "clear", slot: 9 })).code).toBe("slot-range");
  });

  it("rejects a symbol outside the palette", () => {
    const state = initialCipherState(code);
    expect(expectErr(applyCipherAction(state, { kind: "set", slot: 0, symbol: 6 })).code).toBe("symbol-range");
    expect(expectErr(applyCipherAction(state, { kind: "set", slot: 0, symbol: 1.5 })).code).toBe("symbol-range");
  });

  it("rejects an incomplete submit", () => {
    let state = initialCipherState(code);
    state = expectOk(applyCipherAction(state, { kind: "set", slot: 0, symbol: 0 }));
    expect(expectErr(applyCipherAction(state, { kind: "submit" })).code).toBe("incomplete");
  });

  it("rejects a code already guessed", () => {
    const state = play(initialCipherState(code), [0, 1, 2, 3]);
    let next = state;
    for (let slot = 0; slot < CODE_LENGTH; slot += 1) {
      next = expectOk(applyCipherAction(next, { kind: "set", slot, symbol: [0, 1, 2, 3][slot] as number }));
    }
    expect(expectErr(applyCipherAction(next, { kind: "submit" })).code).toBe("repeat-guess");
  });

  it("rejects every action once the puzzle is finished", () => {
    const solved = play(initialCipherState(code), code);
    expect(solved.solved).toBe(true);
    expect(isTerminal(solved)).toBe(true);
    expect(expectErr(applyCipherAction(solved, { kind: "set", slot: 0, symbol: 0 })).code).toBe("game-over");
    expect(expectErr(applyCipherAction(solved, { kind: "clear", slot: 0 })).code).toBe("game-over");
    expect(expectErr(applyCipherAction(solved, { kind: "submit" })).code).toBe("game-over");
  });

  it("ends after six guesses without a solve", () => {
    let state = initialCipherState(code);
    const wrong: Code[] = [
      [0, 0, 0, 0],
      [0, 0, 0, 1],
      [0, 0, 0, 2],
      [0, 0, 0, 3],
      [0, 0, 0, 4],
      [0, 0, 1, 0],
    ];
    for (const guess of wrong) state = play(state, guess);
    expect(state.guesses).toHaveLength(MAX_GUESSES);
    expect(state.solved).toBe(false);
    expect(isTerminal(state)).toBe(true);
    expect(expectErr(applyCipherAction(state, { kind: "submit" })).code).toBe("game-over");
  });

  it("clears the draft on submit and records the feedback", () => {
    const state = play(initialCipherState(code), [1, 4, 1, 0]);
    expect(state.draft).toEqual([null, null, null, null]);
    expect(state.guesses[0]?.feedback).toEqual(scoreGuess(code, [1, 4, 1, 0]));
  });

  it("never produces an invalid state across a random legal sequence", () => {
    let state = initialCipherState(code);
    let value = 12345;
    const next = (): number => {
      value = (Math.imul(value, 1664525) + 1013904223) >>> 0;
      return value;
    };
    for (let step = 0; step < 500 && !isTerminal(state); step += 1) {
      const roll = next() % 3;
      const action = roll === 0
        ? { kind: "set" as const, slot: next() % CODE_LENGTH, symbol: next() % SYMBOL_COUNT }
        : roll === 1
          ? { kind: "clear" as const, slot: next() % CODE_LENGTH }
          : { kind: "submit" as const };
      const result = applyCipherAction(state, action);
      if (isErr(result)) continue;
      state = result.value;
      expect(state.draft).toHaveLength(CODE_LENGTH);
      expect(state.guesses.length).toBeLessThanOrEqual(MAX_GUESSES);
      expect(new Set(state.guesses.map((record) => record.code.join(""))).size)
        .toBe(state.guesses.length);
      expect(state.solved).toBe(
        state.guesses.length > 0 && solvedBy(state.guesses[state.guesses.length - 1]!.feedback),
      );
    }
  });
});

describe("tier and bucket", () => {
  it("maps guess count to the CIPHER.md section 6.1 table", () => {
    expect(tierFor(1, true)).toBe(0);
    expect(tierFor(2, true)).toBe(0);
    expect(tierFor(3, true)).toBe(1);
    expect(tierFor(4, true)).toBe(2);
    expect(tierFor(5, true)).toBe(3);
    expect(tierFor(6, true)).toBe(4);
    expect(tierFor(6, false)).toBe(4);
  });

  it("maps a result to one of seven buckets", () => {
    for (let guesses = 1; guesses <= MAX_GUESSES; guesses += 1) {
      expect(bucketFor(guesses, true)).toBe(guesses - 1);
    }
    expect(bucketFor(MAX_GUESSES, false)).toBe(6);
  });
});

function indexToCode(index: number): Code {
  const code: number[] = [];
  let rest = index;
  for (let i = CODE_LENGTH - 1; i >= 0; i -= 1) {
    code[i] = rest % SYMBOL_COUNT;
    rest = Math.floor(rest / SYMBOL_COUNT);
  }
  return code;
}

function expectOk(result: ReturnType<typeof applyCipherAction>): CipherState {
  if (!isOk(result)) throw new Error(`expected ok, got ${result.error.code}`);
  return result.value;
}

function expectErr(result: ReturnType<typeof applyCipherAction>): { code: string } {
  if (!isErr(result)) throw new Error("expected a rejection");
  return result.error;
}
