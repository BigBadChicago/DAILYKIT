import { describe, expect, it } from "vitest";

import { thresholdFor } from "../../../src/games/pangram/letters.js";
import {
  REFUSALS,
  applyAction,
  buildState,
  initialState,
  inspect,
  isTerminal,
  makePuzzle,
  scoreOfState,
  tierFor,
  type PangramAction,
  type PangramState,
} from "../../../src/games/pangram/rules.js";
import { tutorialPuzzle } from "./fixtures.js";

function play(words: readonly string[], state: PangramState = initialState(tutorialPuzzle())): PangramState {
  let current = state;
  for (const word of words) {
    const next = applyAction(current, { kind: "word", word, refusedBefore: 0 });
    if (!next.ok) throw new Error(`${word}: ${next.error.code}`);
    current = next.value;
  }
  return current;
}

function refusalOf(state: PangramState, action: PangramAction): string | null {
  const result = applyAction(state, action);
  return result.ok ? null : result.error.code;
}

describe("PANGRAM puzzle construction", () => {
  it("measures total, pangrams and difficulty from the answers", () => {
    const p = tutorialPuzzle();
    expect(p.answers).toHaveLength(21);
    expect(p.total).toBe(63);
    expect(p.pangrams).toBe(1);
    expect(p.difficulty).toBe(p.total);
  });

  it("refuses every malformed day", () => {
    const answers = tutorialPuzzle().answers;
    expect(makePuzzle(1, "abhino", "h", answers, []).ok).toBe(false); // six letters
    expect(makePuzzle(1, "aabhino", "h", answers, []).ok).toBe(false); // repeat
    expect(makePuzzle(1, "bahinot", "h", answers, []).ok).toBe(false); // not alphabetical
    expect(makePuzzle(1, "abhinos", "h", answers, []).ok).toBe(false); // contains s
    expect(makePuzzle(1, "abhinot", "z", answers, []).ok).toBe(false); // centre outside
    expect(makePuzzle(1, "abhinot", "h", answers.slice(0, 5), []).ok).toBe(false); // too few
    expect(makePuzzle(1, "abhinot", "h", [...answers].reverse(), []).ok).toBe(false); // unsorted
    expect(makePuzzle(1, "abhinot", "h", [...answers.slice(0, 20), "zzzz"], []).ok).toBe(false); // outside set
    const noPangram = answers.filter((w) => new Set(w).size < 7);
    expect(noPangram).toHaveLength(20);
    const refused = makePuzzle(1, "abhinot", "h", noPangram, []);
    expect(!refused.ok && refused.error.detail).toMatch(/all seven/); // no pangram
  });
});

describe("PANGRAM actions", () => {
  it("accepts an answer and scores it", () => {
    const s = play(["bath", "habitation"]);
    expect(scoreOfState(s)).toBe(1 + 14);
    expect(s.found[1]?.pangram).toBe(true);
  });

  it("accepts upper case input as the same word", () => {
    const s = play(["BATH"]);
    expect(s.found[0]?.word).toBe("bath");
  });

  it("reaches every declared refusal and leaves the state unchanged", () => {
    const base = play(["bath"]);
    const cases: [PangramAction, string][] = [
      [{ kind: "word", word: "hot", refusedBefore: 0 }, "too-short"],
      [{ kind: "word", word: "hose", refusedBefore: 0 }, "bad-letter"],
      [{ kind: "word", word: "b4th", refusedBefore: 0 }, "bad-letter"],
      [{ kind: "word", word: "tint", refusedBefore: 0 }, "no-centre"],
      [{ kind: "word", word: "bath", refusedBefore: 0 }, "already-found"],
      [{ kind: "word", word: "hath", refusedBefore: 0 }, "not-a-word"],
    ];
    for (const [action, code] of cases) {
      const before = JSON.stringify(base.found);
      expect(refusalOf(base, action)).toBe(code);
      expect(JSON.stringify(base.found)).toBe(before);
    }
    const done = applyAction(base, { kind: "finish" });
    expect(done.ok).toBe(true);
    if (done.ok) {
      expect(refusalOf(done.value, { kind: "word", word: "both", refusedBefore: 0 })).toBe("game-over");
      expect(refusalOf(done.value, { kind: "finish" })).toBe("game-over");
    }
    const reached = new Set(cases.map(([, code]) => code).concat("game-over"));
    expect([...reached].sort()).toEqual(Object.keys(REFUSALS).sort());
  });

  it("finishes on its own when every answer is found", () => {
    const p = tutorialPuzzle();
    const s = play(p.answers);
    expect(isTerminal(s)).toBe(true);
    expect(inspect(s)).toMatchObject({ kind: "finished", tier: 0, bucket: 0, score: 63, won: null });
  });

  it("records refusal friction on the find that follows", () => {
    const next = applyAction(initialState(tutorialPuzzle()), { kind: "word", word: "bath", refusedBefore: 3 });
    expect(next.ok && next.value.found[0]?.refusedBefore).toBe(3);
    const bad = applyAction(initialState(tutorialPuzzle()), { kind: "word", word: "bath", refusedBefore: -2 });
    expect(bad.ok && bad.value.found[0]?.refusedBefore).toBe(0);
  });
});

describe("PANGRAM tiers and buckets", () => {
  const p = tutorialPuzzle();
  const top = thresholdFor(60, p.total);

  it("grades by percentage of the total", () => {
    const empty = initialState(p);
    expect(tierFor(empty)).toBe(4);
    expect(tierFor(play(["bath", "both", "hint", "hobo", "hoot", "oath", "than"]))).toBe(3); // 7 of 63
  });

  it("holds the top tier behind a pangram", () => {
    /* Every non pangram answer, which is past the top threshold on score alone. */
    const nonPangrams = p.answers.filter((w) => new Set(w).size < 7);
    const s = play(nonPangrams);
    expect(scoreOfState(s)).toBeGreaterThanOrEqual(top);
    expect(tierFor(s)).toBe(1);
    expect(tierFor(play(["habitation"], s))).toBe(0);
  });

  it("an in progress game is ongoing", () => {
    expect(inspect(play(["bath"]))).toEqual({ kind: "ongoing" });
  });
});

describe("PANGRAM state rebuild", () => {
  it("rebuilds a stored game and refuses one no game could reach", () => {
    const p = tutorialPuzzle();
    expect(buildState(p, ["bath", "both"], [0, 1], false)?.found).toHaveLength(2);
    expect(buildState(p, ["bath"], [0], true)?.finished).toBe(true);
    expect(buildState(p, ["bath", "bath"], [0, 0], false)).toBeNull();
    expect(buildState(p, ["hath"], [0], false)).toBeNull();
    expect(buildState(p, ["bath"], [0, 0], false)).toBeNull();
    expect(buildState(p, ["bath"], [-1], false)).toBeNull();
  });
});
