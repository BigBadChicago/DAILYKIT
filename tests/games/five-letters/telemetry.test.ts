import { describe, expect, it } from "vitest";

import { renderArtifact, validateArtifact } from "../../../src/engine/artifact.js";
import { runShareLeakChecks, type LeakSample } from "../../../src/engine/share-leak.js";
import { validateRunLog, type ArtifactModel } from "../../../src/engine/telemetry.js";
import type { ShareContext, ShareRow } from "../../../src/core/types.js";
import { applyAction, initialState, type FiveLettersState } from "../../../src/games/five-letters/rules.js";
import {
  archetypeOf,
  artifactOf,
  artifactRows,
  churnBetween,
  disciplineAt,
  fingerprintOf,
  fiveLettersLeakProbes,
  readEntries,
  runLogOf,
  shareRow,
} from "../../../src/games/five-letters/telemetry.js";
import { puzzleFor } from "./fixtures.js";

const URL = "dailykit.providentia.games";

function play(words: readonly { word: string; refused?: number }[], answer = "heart"): FiveLettersState {
  let state = initialState(puzzleFor(answer));
  for (const step of words) {
    const next = applyAction(state, { kind: "guess", word: step.word, refusedBefore: step.refused ?? 0 });
    if (!next.ok) throw new Error(`${step.word}: ${next.error.code}`);
    state = next.value;
  }
  return state;
}

const context = (overrides: Partial<ShareContext> = {}): ShareContext => ({ puzzleNumber: 7, currentStreak: 0, rated: true, ...overrides });
const artifact = (state: FiveLettersState, overrides: Partial<ShareContext> = {}): ArtifactModel =>
  artifactOf(state, runLogOf(state), context(overrides));

const FAST = play([{ word: "tares" }, { word: "heart" }]);
const GOOD = play([{ word: "crane" }, { word: "wears", refused: 1 }, { word: "heart" }]);
const SIX = play([{ word: "pluck" }, { word: "ghost" }, { word: "fjord" }, { word: "adieu" }, { word: "crane" }, { word: "heart" }]);
const LOST = play([{ word: "pluck" }, { word: "ghost", refused: 3 }, { word: "fjord" }, { word: "adieu" }, { word: "crane" }, { word: "tares" }]);

describe("FIVE LETTERS run log", () => {
  it("carries counts, churn, discipline and friction, and no letter", () => {
    const log = runLogOf(GOOD);
    expect(validateRunLog(log).ok).toBe(true);
    const entries = readEntries(log);
    expect(entries).toHaveLength(3);
    expect(entries[1]).toMatchObject({ index: 1, refusedBefore: 1, solved: false });
    expect(entries[2]).toMatchObject({ right: 5, present: 0, solved: true });
    /* Every value is a number or a boolean: no string can carry a letter. */
    expect(JSON.stringify(log)).not.toMatch(/:"/);
  });

  it("drops a malformed entry rather than throwing", () => {
    const entries = readEntries({
      v: 1,
      entries: [
        { index: 0, right: 1, present: 2, churn: 0, discipline: 2, refusedBefore: 0, solved: false },
        { index: 1, right: 4, present: 3, churn: 0, discipline: 2, refusedBefore: 0, solved: false },
        { index: 2, right: 1 },
        7,
      ],
    });
    expect(entries).toHaveLength(1);
  });

  it("measures churn and discipline against the feedback held", () => {
    expect(churnBetween("crane", "heart")).toBe(4);
    expect(churnBetween("heart", "hears")).toBe(1);
    /* WEARS is consistent with CRANE's marks against HEART; PLUCK is not. */
    expect(disciplineAt(GOOD.guesses, 1)).toBe(2);
    const careless = play([{ word: "crane" }, { word: "pluck" }]);
    expect(disciplineAt(careless.guesses, 1)).toBe(0);
    expect(disciplineAt(careless.guesses, 0)).toBe(2);
  });
});

describe("FIVE LETTERS artifact", () => {
  it("emits one sorted row of five per guess", () => {
    expect(shareRow(2, 1)).toEqual(["best", "best", "partial", "miss", "miss"]);
    const rows = artifact(GOOD).rows;
    expect(rows).toHaveLength(3);
    for (const row of rows) expect(row).toHaveLength(5);
    expect(rows[2]).toEqual(shareRow(5, 0));
  });

  it("names the tier and the count in the title, X on a loss, and a streak", () => {
    expect(artifact(FAST).title).toBe("FIVE LETTERS #7 Excellent, 2/6");
    expect(artifact(GOOD).title).toBe("FIVE LETTERS #7 Great, 3/6");
    expect(artifact(SIX).title).toBe("FIVE LETTERS #7 Fair, 6/6");
    expect(artifact(LOST).title).toBe("FIVE LETTERS #7 Rough, X/6");
    expect(artifact(GOOD, { currentStreak: 4 }).title).toMatch(/, streak 4$/);
  });

  it("validates and renders inside the nine line grammar, ending with the URL", () => {
    for (const state of [FAST, GOOD, SIX, LOST]) {
      const a = artifact(state);
      expect(validateArtifact(a, URL).ok).toBe(true);
      const lines = renderArtifact(a, URL).split("\n");
      expect(lines.length).toBeLessThanOrEqual(9);
      expect(lines.at(-1)).toBe(URL);
    }
  });

  it("classifies archetypes from the run only", () => {
    expect(archetypeOf([])).toBe("UNSTARTED");
    expect(archetypeOf(readEntries(runLogOf(GOOD)))).toBe("STRICT");
    const prober = play([{ word: "pluck" }, { word: "ghost" }, { word: "fjord" }]);
    expect(archetypeOf(readEntries(runLogOf(prober)))).toBe("PROBER");
    const typist = play([{ word: "crane", refused: 3 }, { word: "cramp" }, { word: "heart" }]);
    expect(["TYPIST", "STEADY", "STRICT"]).toContain(archetypeOf(readEntries(runLogOf(typist))));
    expect(archetypeOf([
      { index: 0, right: 0, present: 0, churn: 0, discipline: 2, refusedBefore: 2, solved: false },
      { index: 1, right: 0, present: 1, churn: 1, discipline: 0, refusedBefore: 0, solved: false },
    ])).toBe("TYPIST");
    expect(archetypeOf([
      { index: 0, right: 0, present: 0, churn: 0, discipline: 2, refusedBefore: 0, solved: false },
      { index: 1, right: 0, present: 1, churn: 1, discipline: 0, refusedBefore: 0, solved: false },
    ])).toBe("STEADY");
  });

  it("two runs with the same tier can differ in fingerprint", () => {
    const a = play([{ word: "crane" }, { word: "wears" }, { word: "heart" }]);
    const b = play([{ word: "pluck" }, { word: "hears" }, { word: "heart" }]);
    expect(artifact(a).outcome.tier).toBe(artifact(b).outcome.tier);
    expect(fingerprintOf(readEntries(runLogOf(a)))).not.toEqual(fingerprintOf(readEntries(runLogOf(b))));
  });
});

describe("FIVE LETTERS share leak probes", () => {
  const samples: LeakSample[] = [FAST, GOOD, SIX, LOST].map((state) => ({ answerKey: "heart", artifact: artifact(state) }));
  const good = samples[1] as LeakSample;
  const withRows = (rows: ShareRow[]): LeakSample => ({ ...good, artifact: { ...good.artifact, rows } });

  it("the good, average, bad and lost artifacts pass every probe", () => {
    const report = runShareLeakChecks(samples, fiveLettersLeakProbes);
    expect(report.failures).toEqual([]);
    for (const sample of samples) expect(sample.artifact.title.toLowerCase()).not.toContain("heart");
  });

  it("the built in title check fires if the answer reached the title", () => {
    const leaked = { ...good, artifact: { ...good.artifact, title: "FIVE LETTERS #7 heart" } };
    expect(runShareLeakChecks([leaked], fiveLettersLeakProbes).ok).toBe(false);
  });

  it("position probe fires on a positional row", () => {
    expect(fiveLettersLeakProbes.positionLeak?.(withRows([["miss", "best", "partial", "miss", "best"]]))).toBe(true);
    expect(fiveLettersLeakProbes.positionLeak?.(withRows([["up", "miss", "miss", "miss", "miss"]]))).toBe(true);
  });

  it("answer property probe fires on an impossible row, a wrong title, or a disagreeing outcome", () => {
    expect(fiveLettersLeakProbes.answerPropertyLeak?.(withRows([shareRow(4, 1), shareRow(5, 0)]))).toBe(true);
    const titled = { ...good, artifact: { ...good.artifact, title: "FIVE LETTERS #7 Great, 3/6, starts with H" } };
    expect(fiveLettersLeakProbes.answerPropertyLeak?.(titled)).toBe(true);
    expect(fiveLettersLeakProbes.answerPropertyLeak?.(withRows([shareRow(1, 1), shareRow(2, 2)]))).toBe(true);
  });

  it("ordering probe fires on a solved row before the last or a seventh row", () => {
    expect(fiveLettersLeakProbes.orderingLeak?.(withRows([shareRow(5, 0), shareRow(1, 1)]))).toBe(true);
    const seven = Array.from({ length: 7 }, () => shareRow(0, 0));
    expect(fiveLettersLeakProbes.orderingLeak?.(withRows(seven))).toBe(true);
  });

  it("shape probe fires on a row that is not five wide", () => {
    expect(fiveLettersLeakProbes.shapeLeak?.(withRows([["best", "best"]]))).toBe(true);
    expect(fiveLettersLeakProbes.shapeLeak?.(withRows(artifactRows(readEntries(runLogOf(GOOD)))))).toBe(false);
  });
});
