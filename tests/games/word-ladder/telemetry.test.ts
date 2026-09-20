import { describe, expect, it } from "vitest";

import { renderArtifact, validateArtifact } from "../../../src/engine/artifact.js";
import { runShareLeakChecks, type LeakSample } from "../../../src/engine/share-leak.js";
import { validateRunLog, type ArtifactModel } from "../../../src/engine/telemetry.js";
import type { ShareContext, ShareRow } from "../../../src/core/types.js";
import { buildGraph, distancesFrom } from "../../../src/games/word-ladder/ladder.js";
import {
  applyAction,
  initialState,
  makePuzzle,
  type DistanceToGoal,
  type WordLadderPuzzle,
  type WordLadderState,
} from "../../../src/games/word-ladder/rules.js";
import {
  artifactOf,
  fingerprintOf,
  readEntries,
  rowsFromEntries,
  runLogOf,
  tokenForProgress,
  wordLadderLeakProbes,
} from "../../../src/games/word-ladder/telemetry.js";

const WORLD = ["cold", "cord", "word", "ward", "warm", "wart", "wars"];
const acceptedGraph = buildGraph(WORLD);
const acceptedSet = new Set(WORLD);

function distanceTo(goal: string): DistanceToGoal {
  const map = distancesFrom(acceptedGraph, goal);
  return (word) => map.get(word) ?? null;
}

function puzzle(): WordLadderPuzzle {
  const made = makePuzzle(7, "cold", "warm", acceptedGraph, acceptedGraph, acceptedSet, ["par-4"]);
  if (!made.ok) throw new Error(made.error.detail);
  return made.value;
}

function climb(words: readonly { word: string; refused?: number }[], reveal = false): WordLadderState {
  const p = puzzle();
  const d = distanceTo(p.goal);
  let state = initialState(p);
  for (const step of words) {
    const next = applyAction(state, { kind: "rung", word: step.word, refusedBefore: step.refused ?? 0 }, d);
    if (!next.ok) throw new Error(`fixture rejected at ${step.word}: ${next.error.code}`);
    state = next.value;
  }
  if (reveal) state = { ...state, revealed: true };
  return state;
}

const context = (overrides: Partial<ShareContext> = {}): ShareContext => ({
  puzzleNumber: 7,
  currentStreak: 0,
  rated: true,
  ...overrides,
});

function artifact(state: WordLadderState, overrides: Partial<ShareContext> = {}): ArtifactModel {
  return artifactOf(state, runLogOf(state), context(overrides));
}

describe("WORD LADDER run log", () => {
  it("carries one entry per rung with progress and refusals only", () => {
    const state = climb([{ word: "cord", refused: 2 }, { word: "word" }]);
    const log = runLogOf(state);
    expect(validateRunLog(log).ok).toBe(true);
    const entries = readEntries(log);
    expect(entries).toHaveLength(2);
    expect(entries[0]).toMatchObject({ index: 0, progress: 1, refusedBefore: 2 });
  });

  it("drops a malformed entry rather than throwing", () => {
    const entries = readEntries({ v: 1, entries: [{ index: 0, progress: 1, refusedBefore: 0 }, { nope: true }, 42] });
    expect(entries).toHaveLength(1);
  });
});

describe("WORD LADDER artifact", () => {
  it("emits one progress token per rung, one token wide, in climb order", () => {
    const state = climb([{ word: "cord" }, { word: "word" }, { word: "ward" }, { word: "warm" }]);
    const a = artifact(state);
    expect(a.rows).toHaveLength(4);
    for (const row of a.rows) expect(row).toHaveLength(1);
    expect(a.rows.every((row: ShareRow) => row[0] === "best")).toBe(true); // every rung forward
  });

  it("maps closer, level and farther to best, partial and weak", () => {
    expect(tokenForProgress(1)).toBe("best");
    expect(tokenForProgress(0)).toBe("partial");
    expect(tokenForProgress(-1)).toBe("weak");
  });

  it("names the outcome in the title and appends a streak", () => {
    const state = climb([{ word: "cord" }, { word: "word" }, { word: "ward" }, { word: "warm" }]);
    expect(artifact(state).title).toMatch(/^WORD LADDER #7 \w+, 4\/4$/);
    expect(artifact(state, { currentStreak: 5 }).title).toMatch(/, streak 5$/);
    const revealed = climb([{ word: "cord" }], true);
    expect(artifact(revealed).title).toMatch(/X\/4$/);
  });

  it("validates and renders inside the nine line grammar, ending with the URL", () => {
    const state = climb([{ word: "cord" }, { word: "word" }, { word: "ward" }, { word: "warm" }]);
    const a = artifact(state);
    expect(validateArtifact(a, "dailykit.providentia.games").ok).toBe(true);
    const lines = renderArtifact(a, "dailykit.providentia.games").split("\n");
    expect(lines.length).toBeLessThanOrEqual(9);
    expect(lines.at(-1)).toBe("dailykit.providentia.games");
  });

  it("gives a monotone climb and a detoured climb different fingerprints", () => {
    const monotone = climb([{ word: "cord" }, { word: "word" }, { word: "ward" }, { word: "warm" }]);
    const detoured = climb([{ word: "cord" }, { word: "word" }, { word: "ward" }, { word: "wars" }, { word: "wart" }, { word: "warm" }]);
    expect(fingerprintOf(readEntries(runLogOf(monotone)))).not.toEqual(
      fingerprintOf(readEntries(runLogOf(detoured))),
    );
  });
});

describe("WORD LADDER share leak probes", () => {
  const good: LeakSample = {
    answerKey: "warm",
    artifact: artifact(climb([{ word: "cord" }, { word: "word" }, { word: "ward" }, { word: "warm" }])),
  };

  it("a clean artifact passes every probe and hides the goal word", () => {
    const report = runShareLeakChecks([good], wordLadderLeakProbes);
    expect(report.ok).toBe(true);
    /* The title carries rungs and par, never the goal word. */
    expect(good.artifact.title.toLowerCase()).not.toContain("warm");
  });

  it("the built in title check fires if the answer ever reached the title", () => {
    const leaked: LeakSample = { answerKey: "warm", artifact: { ...good.artifact, title: "WORD LADDER #7 warm" } };
    expect(runShareLeakChecks([leaked], wordLadderLeakProbes).ok).toBe(false);
  });

  it("position probe fires when a non progress token appears", () => {
    const leak: LeakSample = { answerKey: "warm", artifact: { ...good.artifact, rows: [["up"], ["best"]] } };
    expect(wordLadderLeakProbes.positionLeak?.(leak)).toBe(true);
  });

  it("shape probe fires on a wide row or too many rows", () => {
    const wide: LeakSample = { answerKey: "warm", artifact: { ...good.artifact, rows: [["best", "best"]] } };
    expect(wordLadderLeakProbes.shapeLeak?.(wide)).toBe(true);
    const tall: LeakSample = { answerKey: "warm", artifact: { ...good.artifact, rows: new Array(8).fill(["best"]) as ShareRow[] } };
    expect(wordLadderLeakProbes.shapeLeak?.(tall)).toBe(true);
  });

  it("answer property probe fires when rows disagree with the fingerprint", () => {
    const forged: LeakSample = { answerKey: "warm", artifact: { ...good.artifact, rows: [["weak"], ["weak"], ["weak"], ["weak"]] } };
    expect(wordLadderLeakProbes.answerPropertyLeak?.(forged)).toBe(true);
  });

  it("rowsFromEntries and fingerprintOf are the shared source the probe checks", () => {
    const entries = readEntries(runLogOf(climb([{ word: "cord" }, { word: "word" }])));
    expect(rowsFromEntries(entries)).toHaveLength(2);
  });
});
