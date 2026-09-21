import { describe, expect, it } from "vitest";

import { renderArtifact, validateArtifact } from "../../../src/engine/artifact.js";
import { runShareLeakChecks, type LeakSample } from "../../../src/engine/share-leak.js";
import { validateRunLog, type ArtifactModel } from "../../../src/engine/telemetry.js";
import type { ShareContext, ShareRow } from "../../../src/core/types.js";
import { applyAction, initialState, type PangramState } from "../../../src/games/pangram/rules.js";
import {
  archetypeOf,
  artifactOf,
  fingerprintOf,
  lengthClassOf,
  meterFor,
  meterRow,
  openingRow,
  pangramLeakProbes,
  readEntries,
  runLogOf,
  tokenForFind,
} from "../../../src/games/pangram/telemetry.js";
import { tutorialPuzzle } from "./fixtures.js";

const URL = "dailykit.providentia.games";

function play(words: readonly { word: string; refused?: number }[], finish = true): PangramState {
  let state = initialState(tutorialPuzzle());
  for (const step of words) {
    const next = applyAction(state, { kind: "word", word: step.word, refusedBefore: step.refused ?? 0 });
    if (!next.ok) throw new Error(`${step.word}: ${next.error.code}`);
    state = next.value;
  }
  return finish && !state.finished ? { ...state, finished: true } : state;
}

const context = (overrides: Partial<ShareContext> = {}): ShareContext => ({
  puzzleNumber: 7,
  currentStreak: 0,
  rated: true,
  ...overrides,
});

function artifact(state: PangramState, overrides: Partial<ShareContext> = {}): ArtifactModel {
  return artifactOf(state, runLogOf(state), context(overrides));
}

const STRONG = play([{ word: "bath" }, { word: "habitation" }, { word: "inhabitant" }, { word: "inhibition" }, { word: "habitat" }]);
const WEAK = play([{ word: "hint", refused: 2 }, { word: "oath", refused: 1 }]);
const EMPTY = play([]);
const ALL = play(tutorialPuzzle().answers.map((word) => ({ word })));

describe("PANGRAM run log", () => {
  it("carries a length class, a pangram flag, friction and the meter, and no word", () => {
    const log = runLogOf(STRONG);
    expect(validateRunLog(log).ok).toBe(true);
    const entries = readEntries(log);
    expect(entries).toHaveLength(5);
    expect(entries[1]).toMatchObject({ index: 1, lengthClass: 2, pangram: true, refusedBefore: 0 });
    expect(JSON.stringify(log)).not.toMatch(/bath|habit|inhab/);
  });

  it("drops a malformed entry rather than throwing", () => {
    const entries = readEntries({
      v: 1,
      entries: [{ index: 0, lengthClass: 0, pangram: false, refusedBefore: 0, meter: 1 }, { index: 1, meter: 99 }, 7],
    });
    expect(entries).toHaveLength(1);
  });

  it("classes lengths and fills the meter against the top threshold", () => {
    expect(lengthClassOf("bath")).toBe(0);
    expect(lengthClassOf("habit")).toBe(1);
    expect(lengthClassOf("habitat")).toBe(2);
    expect(meterFor(0, 63)).toBe(0);
    expect(meterFor(38, 63)).toBe(8);
    expect(meterFor(500, 63)).toBe(8);
    expect(meterFor(19, 63)).toBe(4);
  });
});

describe("PANGRAM artifact", () => {
  it("emits two rows of eight: the meter then the opening finds", () => {
    const a = artifact(STRONG);
    expect(a.rows).toHaveLength(2);
    for (const row of a.rows) expect(row).toHaveLength(8);
    expect(a.rows[1]?.slice(0, 5)).toEqual(["weak", "best", "strong", "strong", "strong"]);
    expect(a.rows[1]?.slice(5)).toEqual(["unused", "unused", "unused"]);
  });

  it("maps finds to tokens without a miss", () => {
    expect(tokenForFind({ pangram: true, lengthClass: 2 })).toBe("best");
    expect(tokenForFind({ pangram: false, lengthClass: 2 })).toBe("strong");
    expect(tokenForFind({ pangram: false, lengthClass: 1 })).toBe("partial");
    expect(tokenForFind({ pangram: false, lengthClass: 0 })).toBe("weak");
  });

  it("a day with no finds still shares a full shape", () => {
    const a = artifact(EMPTY);
    expect(a.rows).toEqual([meterRow(0), openingRow([])]);
    expect(validateArtifact(a, URL).ok).toBe(true);
    expect(a.archetype).toBe("BROWSER");
  });

  it("names the tier, the find count and the pangram in the title, and a streak", () => {
    expect(artifact(STRONG).title).toMatch(/^PANGRAM #7 \w+, 5 words, pangram$/);
    expect(artifact(WEAK).title).toMatch(/^PANGRAM #7 \w+, 2 words$/);
    expect(artifact(play([{ word: "bath" }])).title).toMatch(/1 word$/);
    expect(artifact(STRONG, { currentStreak: 4 }).title).toMatch(/, streak 4$/);
    expect(artifact(ALL).title).toMatch(/^PANGRAM #7 Excellent, 21 words, pangram$/);
  });

  it("validates and renders inside the nine line grammar, ending with the URL", () => {
    for (const state of [STRONG, WEAK, EMPTY, ALL]) {
      const a = artifact(state);
      expect(validateArtifact(a, URL).ok).toBe(true);
      const lines = renderArtifact(a, URL).split("\n");
      expect(lines).toHaveLength(4);
      expect(lines.at(-1)).toBe(URL);
    }
  });

  it("classifies archetypes from the run only", () => {
    expect(archetypeOf(readEntries(runLogOf(STRONG)))).toBe("HUNTER");
    expect(archetypeOf(readEntries(runLogOf(WEAK)))).toBe("GUESSER");
    const longhand = play([{ word: "hobbit" }, { word: "inhabit" }, { word: "inhibit" }, { word: "bath" }, { word: "habitat" }]);
    expect(archetypeOf(readEntries(runLogOf(longhand)))).toBe("LONGHAND");
    const builder = play([{ word: "bath" }, { word: "both" }, { word: "hint" }, { word: "habit" }]);
    expect(archetypeOf(readEntries(runLogOf(builder)))).toBe("BUILDER");
  });

  it("two runs with the same tier can differ in fingerprint", () => {
    const a = play([{ word: "bath" }, { word: "both", refused: 1 }]);
    const b = play([{ word: "both" }, { word: "bath" }]);
    expect(fingerprintOf(readEntries(runLogOf(a)))).not.toEqual(fingerprintOf(readEntries(runLogOf(b))));
  });
});

describe("PANGRAM share leak probes", () => {
  const samples: LeakSample[] = [STRONG, WEAK, EMPTY, ALL].map((state) => ({
    answerKey: "habitation",
    artifact: artifact(state),
  }));

  it("the good, average, bad and perfect artifacts pass every probe", () => {
    const report = runShareLeakChecks(samples, pangramLeakProbes);
    expect(report.failures).toEqual([]);
    for (const sample of samples) expect(sample.artifact.title.toLowerCase()).not.toContain("habitation");
  });

  const good = samples[0] as LeakSample;

  it("the built in title check fires if an answer reached the title", () => {
    const leaked = { ...good, artifact: { ...good.artifact, title: "PANGRAM #7 habitation" } };
    expect(runShareLeakChecks([leaked], pangramLeakProbes).ok).toBe(false);
  });

  it("position probe fires on a token outside the two row vocabularies", () => {
    const rows: ShareRow[] = [meterRow(3), ["up", ...openingRow([]).slice(1)]];
    expect(pangramLeakProbes.positionLeak?.({ ...good, artifact: { ...good.artifact, rows } })).toBe(true);
    const rows2: ShareRow[] = [["best", ...meterRow(0).slice(1)], openingRow([])];
    expect(pangramLeakProbes.positionLeak?.({ ...good, artifact: { ...good.artifact, rows: rows2 } })).toBe(true);
  });

  it("answer property probe fires when the meter disagrees with the fingerprint", () => {
    const rows: ShareRow[] = [meterRow(1), good.artifact.rows[1] as ShareRow];
    expect(pangramLeakProbes.answerPropertyLeak?.({ ...good, artifact: { ...good.artifact, rows } })).toBe(true);
  });

  it("ordering probe fires on a gap in the meter or a find after the pad", () => {
    const gap: ShareRow = ["barFull", "barEmpty", "barFull", "barEmpty", "barEmpty", "barEmpty", "barEmpty", "barEmpty"];
    expect(pangramLeakProbes.orderingLeak?.({ ...good, artifact: { ...good.artifact, rows: [gap, openingRow([])] } })).toBe(true);
    const late: ShareRow = ["unused", "best", "unused", "unused", "unused", "unused", "unused", "unused"];
    expect(pangramLeakProbes.orderingLeak?.({ ...good, artifact: { ...good.artifact, rows: [meterRow(0), late] } })).toBe(true);
  });

  it("shape probe fires on a third row or a short row", () => {
    const tall: ShareRow[] = [meterRow(0), openingRow([]), openingRow([])];
    expect(pangramLeakProbes.shapeLeak?.({ ...good, artifact: { ...good.artifact, rows: tall } })).toBe(true);
    const short: ShareRow[] = [meterRow(0), ["best"]];
    expect(pangramLeakProbes.shapeLeak?.({ ...good, artifact: { ...good.artifact, rows: short } })).toBe(true);
  });
});
