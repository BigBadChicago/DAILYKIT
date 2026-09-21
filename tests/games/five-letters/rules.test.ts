import { describe, expect, it } from "vitest";

import {
  REFUSALS,
  applyAction,
  bucketFor,
  buildState,
  finishedOutcomeFor,
  initialState,
  inspect,
  isTerminal,
  letterMarks,
  makePuzzle,
  refusalFor,
  solved,
  tierFor,
  type FiveLettersState,
} from "../../../src/games/five-letters/rules.js";
import { ACCEPTED, puzzleFor } from "./fixtures.js";

function play(answer: string, words: readonly string[]): FiveLettersState {
  let state = initialState(puzzleFor(answer));
  for (const word of words) {
    const next = applyAction(state, { kind: "guess", word, refusedBefore: 0 });
    if (!next.ok) throw new Error(`${word}: ${next.error.code}`);
    state = next.value;
  }
  return state;
}

describe("FIVE LETTERS puzzle construction", () => {
  it("refuses a malformed or unaccepted answer and a bad difficulty", () => {
    expect(makePuzzle(1, "hear", ACCEPTED, 3, []).ok).toBe(false);
    expect(makePuzzle(1, "zzzzz", ACCEPTED, 3, []).ok).toBe(false);
    expect(makePuzzle(1, "heart", ACCEPTED, 0, []).ok).toBe(false);
    expect(makePuzzle(1, "heart", ACCEPTED, 11, ["x"]).ok).toBe(true);
  });
});

describe("FIVE LETTERS actions and refusals", () => {
  it("refuses a short word, a non word and a repeat, with their announcements", () => {
    const state = play("heart", ["tares"]);
    expect(refusalFor(state, "tar")).toBe("too-short");
    expect(refusalFor(state, "tar1s")).toBe("too-short");
    expect(refusalFor(state, "qxzvb")).toBe("not-a-word");
    expect(refusalFor(state, "TARES")).toBe("already-guessed");
    expect(refusalFor(state, "Crane")).toBeNull();
    const refused = applyAction(state, { kind: "guess", word: "qxzvb", refusedBefore: 0 });
    expect(refused.ok).toBe(false);
    if (!refused.ok) expect(refused.error).toEqual(REFUSALS["not-a-word"]);
  });

  it("accepts case insensitively and stores friction, clamping nonsense to zero", () => {
    const one = applyAction(initialState(puzzleFor("heart")), { kind: "guess", word: "CRANE", refusedBefore: 3 });
    expect(one.ok && one.value.guesses[0]).toMatchObject({ word: "crane", refusedBefore: 3 });
    const two = applyAction(initialState(puzzleFor("heart")), { kind: "guess", word: "crane", refusedBefore: -2 });
    expect(two.ok && two.value.guesses[0]?.refusedBefore).toBe(0);
  });

  it("ends on the answer and refuses anything after", () => {
    const state = play("heart", ["crane", "heart"]);
    expect(solved(state)).toBe(true);
    expect(isTerminal(state)).toBe(true);
    expect(refusalFor(state, "tares")).toBe("game-over");
  });

  it("ends unsolved after six guesses", () => {
    const state = play("heart", ["crane", "tares", "adieu", "pluck", "ghost", "fjord"]);
    expect(solved(state)).toBe(false);
    expect(isTerminal(state)).toBe(true);
    expect(refusalFor(state, "heart")).toBe("game-over");
    const outcome = finishedOutcomeFor(state);
    expect(outcome).toMatchObject({ won: false, tier: 4, bucket: 6, score: 0 });
    expect(outcome.detail).toContain("HEART");
  });

  it("is ongoing until terminal", () => {
    expect(inspect(play("heart", ["crane"]))).toEqual({ kind: "ongoing" });
    expect(inspect(play("heart", ["heart"])).kind).toBe("finished");
  });
});

describe("FIVE LETTERS tiers and buckets", () => {
  it("maps guess counts to tiers and seven buckets", () => {
    expect([1, 2, 3, 4, 5, 6].map((n) => tierFor(n, true))).toEqual([0, 0, 1, 2, 3, 3]);
    expect(tierFor(6, false)).toBe(4);
    expect([1, 2, 3, 4, 5, 6].map((n) => bucketFor(n, true))).toEqual([0, 1, 2, 3, 4, 5]);
    expect(bucketFor(6, false)).toBe(6);
  });

  it("carries the puzzle difficulty into the outcome", () => {
    const state = play("heart", ["crane", "heart"]);
    expect(finishedOutcomeFor(state)).toMatchObject({ won: true, score: 2, tier: 0, bucket: 1, difficulty: 11 });
  });
});

describe("FIVE LETTERS state rebuild and keyboard marks", () => {
  it("rebuilds exactly and refuses anything no real game reaches", () => {
    const p = puzzleFor("heart");
    expect(buildState(p, ["crane", "heart"], [0, 1])?.guesses).toHaveLength(2);
    expect(buildState(p, ["crane"], [0, 1])).toBeNull();
    expect(buildState(p, ["heart", "crane"], [0, 0])).toBeNull();
    expect(buildState(p, ["qxzvb"], [0])).toBeNull();
    expect(buildState(p, ["crane"], [-1])).toBeNull();
    expect(buildState(p, ["crane", "tares", "adieu", "pluck", "ghost", "fjord", "heart"], [0, 0, 0, 0, 0, 0, 0])).toBeNull();
  });

  it("keeps the best mark each letter has earned", () => {
    const marks = letterMarks(play("heart", ["treat", "tares"]));
    expect(marks.get("t")).toBe(2);
    expect(marks.get("e")).toBe(1);
    expect(marks.get("s")).toBe(0);
    const later = letterMarks(play("heart", ["treat", "heart"]));
    expect(later.get("h")).toBe(2);
    expect(later.get("t")).toBe(2);
  });
});
