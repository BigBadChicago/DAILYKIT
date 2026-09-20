import { describe, expect, it } from "vitest";

import { buildGraph, distancesFrom } from "../../../src/games/word-ladder/ladder.js";
import {
  applyAction,
  bucketFor,
  buildState,
  currentWord,
  finishedOutcomeFor,
  initialState,
  isTerminal,
  makePuzzle,
  puzzleProblem,
  tierFor,
  type DistanceToGoal,
  type WordLadderPuzzle,
} from "../../../src/games/word-ladder/rules.js";

/* A small self contained world with a clean par 4 ladder cold to warm. */
const WORLD = ["cold", "cord", "word", "ward", "warm", "wart", "wars", "care", "core", "bore", "bore", "ware"];
const ACCEPTED = Array.from(new Set(WORLD));
const acceptedGraph = buildGraph(ACCEPTED);
const acceptedSet = new Set(ACCEPTED);

/* Distance to a goal over the accepted graph, the function the module supplies. */
function distanceTo(goal: string): DistanceToGoal {
  const map = distancesFrom(acceptedGraph, goal);
  return (word: string) => map.get(word) ?? null;
}

function puzzle(): WordLadderPuzzle {
  const made = makePuzzle(1, "cold", "warm", acceptedGraph, acceptedGraph, acceptedSet, ["par-4", "detour-3"]);
  if (!made.ok) throw new Error(made.error.detail);
  return made.value;
}

const rung = (word: string, refusedBefore = 0) => ({ kind: "rung" as const, word, refusedBefore });

describe("WORD LADDER puzzle shape", () => {
  it("accepts a solvable in band pair and records par and difficulty", () => {
    const p = puzzle();
    expect(p.par).toBe(4);
    expect(p.difficulty).toBeGreaterThan(0);
  });

  it("puzzleProblem catches bad words", () => {
    expect(puzzleProblem("cold", "warm")).toBeNull();
    expect(puzzleProblem("cold", "cold")).not.toBeNull();
    expect(puzzleProblem("cat", "dog")).not.toBeNull();
    expect(puzzleProblem("COLD", "warm")).not.toBeNull();
  });

  it("makePuzzle refuses an unsolvable pair, an out of band par, and an unfamiliar only path", () => {
    /* care to core is length 1 in this world, below the par band. */
    const short = makePuzzle(1, "care", "core", acceptedGraph, acceptedGraph, acceptedSet, []);
    expect(short.ok).toBe(false);
    /* An endpoint outside the accepted list. */
    const foreign = makePuzzle(1, "cold", "zzzz", acceptedGraph, acceptedGraph, acceptedSet, []);
    expect(foreign.ok).toBe(false);
  });
});

describe("WORD LADDER climbing", () => {
  it("accepts a one letter change into an accepted word", () => {
    const p = puzzle();
    const next = applyAction(initialState(p), rung("cord"), distanceTo(p.goal));
    expect(next.ok).toBe(true);
    if (next.ok) {
      expect(currentWord(next.value)).toBe("cord");
      expect(next.value.rungs[0]?.progress).toBe(1); // cord is closer to warm than cold
    }
  });

  it("refuses a non word, a two letter jump, the same word, and a repeat", () => {
    const p = puzzle();
    const d = distanceTo(p.goal);
    const afterCord = applyAction(initialState(p), rung("cord"), d);
    expect(afterCord.ok).toBe(true);
    if (!afterCord.ok) return;
    expect(applyAction(afterCord.value, rung("czzz"), d)).toMatchObject({ ok: false });
    expect(applyAction(afterCord.value, rung("warm"), d)).toMatchObject({ ok: false }); // two changes from cord
    expect(applyAction(afterCord.value, rung("cord"), d)).toMatchObject({ ok: false }); // same word
    const backToCold = applyAction(afterCord.value, rung("cold"), d);
    expect(backToCold.ok).toBe(false); // cold is the start, already used
  });

  it("carries the refusal count onto the accepted rung", () => {
    const p = puzzle();
    const next = applyAction(initialState(p), rung("cord", 3), distanceTo(p.goal));
    expect(next.ok).toBe(true);
    if (next.ok) expect(next.value.rungs[0]?.refusedBefore).toBe(3);
  });

  it("undo removes the last rung and reveal ends the day", () => {
    const p = puzzle();
    const d = distanceTo(p.goal);
    const one = applyAction(initialState(p), rung("cord"), d);
    expect(one.ok).toBe(true);
    if (!one.ok) return;
    const undone = applyAction(one.value, { kind: "undo" }, d);
    expect(undone.ok).toBe(true);
    if (undone.ok) expect(undone.value.rungs).toHaveLength(0);
    const revealed = applyAction(one.value, { kind: "reveal" }, d);
    expect(revealed.ok).toBe(true);
    if (revealed.ok) {
      expect(revealed.value.revealed).toBe(true);
      expect(isTerminal(revealed.value)).toBe(true);
      expect(applyAction(revealed.value, rung("word"), d).ok).toBe(false); // game over
    }
  });

  it("wins on reaching the goal", () => {
    const p = puzzle();
    const d = distanceTo(p.goal);
    let state = initialState(p);
    for (const word of ["cord", "word", "ward", "warm"]) {
      const next = applyAction(state, rung(word), d);
      expect(next.ok).toBe(true);
      if (!next.ok) return;
      state = next.value;
    }
    expect(state.won).toBe(true);
    expect(isTerminal(state)).toBe(true);
  });
});

describe("WORD LADDER grading", () => {
  const p = puzzle();
  const d = distanceTo(p.goal);
  function climb(words: readonly string[]) {
    let state = initialState(p);
    for (const word of words) {
      const next = applyAction(state, rung(word), d);
      if (!next.ok) throw new Error(`fixture climb rejected at ${word}: ${next.error.code}`);
      state = next.value;
    }
    return state;
  }

  it("grades a par climb as bucket 0 and the best tier", () => {
    const state = climb(["cord", "word", "ward", "warm"]);
    expect(bucketFor(state)).toBe(0);
    expect(tierFor(state)).toBe(0);
    expect(finishedOutcomeFor(state)).toMatchObject({ won: true, bucket: 0, difficulty: p.difficulty });
  });

  it("grades a reveal as bucket 4 and the last tier, won null", () => {
    const revealed = { ...climb(["cord"]), revealed: true, won: false };
    expect(bucketFor(revealed)).toBe(4);
    expect(tierFor(revealed)).toBe(4);
    expect(finishedOutcomeFor(revealed).won).toBeNull();
  });
});

describe("WORD LADDER state round trip", () => {
  it("rebuilds a valid climb and rejects an illegal one", () => {
    const p = puzzle();
    const d = distanceTo(p.goal);
    const state = buildState(p, ["cord", "word"], [0, 1], false, d);
    expect(state).not.toBeNull();
    if (state) expect(state.rungs).toHaveLength(2);
    /* A two letter jump between rungs is unreachable. */
    expect(buildState(p, ["cord", "ward"], [0, 0], false, d)).toBeNull();
    /* A rung after the goal is reached is impossible. */
    expect(buildState(p, ["cord", "word", "ward", "warm", "wars"], [0, 0, 0, 0, 0], false, d)).toBeNull();
    /* Mismatched refusal count length. */
    expect(buildState(p, ["cord"], [0, 0], false, d)).toBeNull();
  });
});
