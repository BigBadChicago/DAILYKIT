import { describe, expect, it } from "vitest";

import { renderArtifact, validateArtifact } from "../../../src/engine/artifact.js";
import { runShareLeakChecks, type LeakSample } from "../../../src/engine/share-leak.js";
import { validateRunLog, type ArtifactModel } from "../../../src/engine/telemetry.js";
import type { ShareContext, ShareRow } from "../../../src/core/types.js";
import { entryFor } from "../../../src/shell/registry.js";
import game, { internals } from "../../../src/games/difference-relay/module.js";
import { encodeLayout } from "../../../src/games/difference-relay/relay-codec.js";
import { buildState, makePuzzle, type DifferenceRelayPuzzle, type DifferenceRelayState } from "../../../src/games/difference-relay/rules.js";
import { differenceRelayLeakProbes } from "../../../src/games/difference-relay/telemetry.js";

const TARGET = [6, 9, 7, 2, 1, 5];
const MARKS = [3, 2, null, null, 4];
const START = [7, 1, 9, 6, 2, 5];

function puzzle(number = 1): DifferenceRelayPuzzle {
  const made = makePuzzle(number, TARGET, MARKS, START, ["range-wide", "hidden-2"]);
  if (!made.ok) throw new Error(made.error.detail);
  return made.value;
}

const context = (overrides: Partial<ShareContext> = {}): ShareContext => ({
  puzzleNumber: 7,
  currentStreak: 0,
  rated: true,
  ...overrides,
});

function artifactOf(state: DifferenceRelayState, overrides: Partial<ShareContext> = {}): ArtifactModel {
  return internals.shareArtifact(state.puzzle, state, internals.telemetry(state), context(overrides));
}

describe("DIFFERENCE RELAY contract surface", () => {
  it("default exports a v3 module whose distribution fits its buckets", () => {
    expect(game.identity.id).toBe("difference-relay");
    expect(game.input.kind).toBe("custom");
    expect(game.shareCapabilities.grammar).toBe("A");
    expect(game.shareCapabilities.patterns.length).toBeGreaterThanOrEqual(2);
    expect(game.shareCapabilities.maxRows).toBeLessThanOrEqual(7);
    expect(game.distribution.labels).toHaveLength(7);
  });

  it("agrees with its registry entry", () => {
    const entry = entryFor("difference-relay");
    expect(entry).not.toBeNull();
    expect(entry?.bucketCount).toBe(game.distribution.labels.length);
    expect(entry?.hasWinLoss).toBe(game.hasWinLoss);
    expect(entry?.stateVersion).toBe(game.stateVersion);
    expect(entry?.oneLineRule).toBe(game.identity.oneLineRule);
    expect(entry?.displayName).toBe(game.identity.displayName);
    expect(entry?.epoch).toEqual(game.identity.epoch);
    expect(entry?.accent).toEqual(game.identity.accent);
  });
});

describe("DIFFERENCE RELAY manifest round trip", () => {
  it("parses an obfuscated entry back into the same board", () => {
    const layout = encodeLayout(1, TARGET, MARKS, START);
    const parsed = internals.parsePuzzle(1, { layout, levers: ["range-wide", "hidden-2"] });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.target).toEqual(TARGET);
      expect(parsed.value.marks).toEqual(MARKS);
      expect(parsed.value.startOrder).toEqual(START);
    }
  });

  it("refuses a non object, a layout that does not decode, and a decoded board that is not a puzzle", () => {
    expect(internals.parsePuzzle(1, null).ok).toBe(false);
    expect(internals.parsePuzzle(1, { layout: "short" }).ok).toBe(false);
    /* A monotone board decodes but has two solutions, so makePuzzle refuses it. */
    const bad = encodeLayout(1, [1, 2, 3, 4, 5, 6], [1, 1, 1, 1, null], [2, 1, 3, 4, 5, 6]);
    expect(internals.parsePuzzle(1, { layout: bad, levers: [] }).ok).toBe(false);
  });
});

describe("DIFFERENCE RELAY state round trip", () => {
  it("restores a reachable in progress and finished game", () => {
    const p = puzzle();
    const states = [
      buildState(p, p.startOrder, []),
      buildState(p, [1, 2, 5, 6, 7, 9], [[1, 2, 5, 6, 7, 9]]),
      buildState(p, p.target, [[9, 7, 6, 5, 2, 1], p.target.slice()]),
    ];
    for (const state of states) {
      expect(state).not.toBeNull();
      if (!state) continue;
      const restored = internals.deserialize(p, internals.serialize(state));
      expect(restored).toEqual({ ok: true, value: state });
    }
  });

  it("refuses a foreign version, a malformed payload, a foreign order and an impossible run history", () => {
    const p = puzzle();
    expect(internals.deserialize(p, { v: 2, data: { o: p.startOrder, r: [] } }).ok).toBe(false);
    expect(internals.deserialize(p, { v: 1, data: { o: "nope", r: [] } }).ok).toBe(false);
    expect(internals.deserialize(p, { v: 1, data: { o: [1, 2, 3, 4, 5, 6], r: [] } }).ok).toBe(false);
    expect(internals.deserialize(p, { v: 1, data: { o: p.startOrder, r: [p.target.slice(), p.startOrder.slice()] } }).ok).toBe(false);
    expect(game.migrateState(0, { v: 0, data: null }).ok).toBe(false);
  });
});

describe("DIFFERENCE RELAY outcome and share", () => {
  const p = puzzle(7);
  const winIn3 = (): DifferenceRelayState => {
    const state = buildState(p, p.target, [[1, 2, 5, 6, 7, 9], [9, 7, 6, 5, 2, 1], p.target.slice()]);
    if (!state) throw new Error("fixture build failed");
    return state;
  };

  it("grades a finished day with its bucket and difficulty", () => {
    const state = winIn3();
    expect(internals.inspect(state)).toMatchObject({ kind: "finished", won: true, score: 3, bucket: 2, difficulty: p.difficulty });
  });

  it("shares one meter row per run and names the outcome", () => {
    const artifact = artifactOf(winIn3());
    expect(artifact.rows).toHaveLength(3);
    for (const row of artifact.rows) expect(row).toHaveLength(5);
    expect(artifact.rows[2]).toEqual(["barFull", "barFull", "barFull", "barFull", "barFull"]);
    expect(artifact.title).toMatch(/^DIFFERENCE RELAY #7 \w+, 3\/6$/);
    expect(artifactOf(winIn3(), { currentStreak: 4 }).title).toMatch(/, streak 4$/);
  });

  it("validates, renders inside the grammar and ends with the URL", () => {
    const artifact = artifactOf(winIn3());
    expect(validateRunLog(internals.telemetry(winIn3())).ok).toBe(true);
    expect(validateArtifact(artifact, game.identity.shareUrl).ok).toBe(true);
    const lines = renderArtifact(artifact, game.identity.shareUrl).split("\n");
    expect(lines.length).toBeLessThanOrEqual(9);
    expect(lines.at(-1)).toBe(game.identity.shareUrl);
  });

  it("gives two runs of different reach different fingerprints", () => {
    /* First run reaches gap 0 in one and gap 1 in the other, so the depths differ. */
    const shallow = buildState(p, p.target, [[1, 2, 5, 6, 7, 9], p.target.slice()]);
    const deep = buildState(p, p.target, [[6, 9, 1, 2, 5, 7], p.target.slice()]);
    if (shallow && deep) expect(artifactOf(shallow).fingerprint).not.toEqual(artifactOf(deep).fingerprint);
  });

  it("leaks neither the target nor the position of the answer, across many boards", () => {
    const samples: LeakSample[] = [];
    for (let day = 1; day <= 20; day += 1) {
      const dayPuzzle = puzzle(day);
      const state = buildState(dayPuzzle, dayPuzzle.target, [[1, 2, 5, 6, 7, 9], dayPuzzle.target.slice()]);
      if (state) samples.push({ artifact: artifactOf(state), answerKey: dayPuzzle.target.join("") });
    }
    expect(runShareLeakChecks(samples, differenceRelayLeakProbes)).toEqual({ ok: true, failures: [] });
  });

  it("fires every leak probe on an artifact built to leak", () => {
    const base = artifactOf(winIn3());
    const leaking = (rows: ShareRow[]): LeakSample => ({ artifact: { ...base, rows }, answerKey: "x" });
    expect(differenceRelayLeakProbes.positionLeak?.(leaking([["best", "barFull", "barFull", "barFull", "barFull"]]))).toBe(true);
    expect(differenceRelayLeakProbes.orderingLeak?.(leaking([["barEmpty", "barFull", "barFull", "barFull", "barFull"]]))).toBe(true);
    expect(differenceRelayLeakProbes.shapeLeak?.(leaking([["barFull", "barFull"]]))).toBe(true);
    expect(
      differenceRelayLeakProbes.answerPropertyLeak?.({
        artifact: { ...base, rows: [["barFull", "barFull", "barFull", "barFull", "barFull"]] },
        answerKey: "x",
      }),
    ).toBe(true);
  });
});
