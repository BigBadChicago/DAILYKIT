import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { renderArtifact, validateArtifact } from "../../../src/engine/artifact.js";
import { validateRunLog } from "../../../src/engine/telemetry.js";
import type { ShareContext } from "../../../src/core/types.js";
import { entryFor } from "../../../src/shell/registry.js";
import game, { internals } from "../../../src/games/five-letters/module.js";
import { encodeAnswer } from "../../../src/games/five-letters/five-letters-codec.js";
import { bandOf } from "../../../src/games/five-letters/bands.js";
import type { FiveLettersState } from "../../../src/games/five-letters/rules.js";
import { FIRST_SESSION } from "../../../src/games/five-letters/tutorial.js";
import { list } from "./fixtures.js";

const context: ShareContext = { puzzleNumber: 7, currentStreak: 0, rated: true };

function entry(n: number, answer = "heart", candidates: number | undefined = 11) {
  return { answer: encodeAnswer(n, answer), best: candidates === undefined ? {} : { candidates, witness: 3 }, levers: ["distinct-letters"] };
}

function day(n = 7): FiveLettersState {
  const parsed = internals.parsePuzzle(n, entry(n));
  if (!parsed.ok) throw new Error(parsed.error.detail);
  return internals.initialState(parsed.value);
}

function play(words: readonly string[]): FiveLettersState {
  let state = day();
  for (const word of words) {
    const next = internals.apply(state, { kind: "guess", word, refusedBefore: 0 });
    if (!next.ok) throw new Error(`${word}: ${next.error.code}`);
    state = next.value;
  }
  return state;
}

describe("FIVE LETTERS contract surface", () => {
  it("default exports a v3 module whose distribution fits its buckets", () => {
    expect(game.identity.id).toBe("five-letters");
    expect(game.input.kind).toBe("custom");
    expect(game.hasWinLoss).toBe(true);
    expect(game.shareCapabilities.grammar).toBe("A");
    expect(game.shareCapabilities.patterns.length).toBeGreaterThanOrEqual(2);
    expect(game.shareCapabilities.maxRows).toBe(6);
    expect(game.distribution.labels).toHaveLength(7);
    expect(game.archiveEnabled).toBe(true);
  });

  it("agrees with its registry entry, now live", () => {
    const row = entryFor("five-letters");
    expect(row).not.toBeNull();
    expect(row?.bucketCount).toBe(game.distribution.labels.length);
    expect(row?.hasWinLoss).toBe(game.hasWinLoss);
    expect(row?.stateVersion).toBe(game.stateVersion);
    expect(row?.oneLineRule).toBe(game.identity.oneLineRule);
    expect(row?.accent.hue).toBe(game.identity.accent.hue);
    expect(row?.status).toBe("live");
  });
});

describe("FIVE LETTERS parse", () => {
  it("parses a day and recomputes its difficulty", () => {
    const parsed = internals.parsePuzzle(7, entry(7));
    expect(parsed.ok && parsed.value).toMatchObject({ answer: "heart", difficulty: 11 });
    expect(internals.parsePuzzle(7, entry(7, "heart", undefined)).ok).toBe(true);
  });

  it("refuses a damaged entry", () => {
    expect(internals.parsePuzzle(7, null).ok).toBe(false);
    expect(internals.parsePuzzle(7, { answer: "zz" }).ok).toBe(false);
    expect(internals.parsePuzzle(7, entry(7, "heart", 12)).ok).toBe(false);
    expect(internals.parsePuzzle(7, { answer: encodeAnswer(7, "qxzvb") }).ok).toBe(false);
    /* The codec keys on the puzzle number, so a day read as another is damaged. */
    const wrong = internals.parsePuzzle(8, entry(7));
    expect(wrong.ok && wrong.value.answer === "heart").toBe(false);
  });

  it("parses every committed day of the horizon", () => {
    const index = JSON.parse(readFileSync("data/five-letters/manifest.index.json", "utf8")) as { chunks: { url: string }[] };
    let days = 0;
    for (const chunk of index.chunks) {
      const body = JSON.parse(readFileSync(chunk.url.slice(1), "utf8")) as { entries: Record<string, unknown> };
      for (const [n, raw] of Object.entries(body.entries)) {
        const parsed = internals.parsePuzzle(Number(n), raw);
        expect(parsed.ok).toBe(true);
        days += 1;
      }
    }
    expect(days).toBe(365);
  });

  it("has no day past the horizon", () => {
    expect(internals.generatePuzzle(400, 1).ok).toBe(false);
  });

  it("the first session day is a gentle pool word", () => {
    const first = internals.firstSessionPuzzle();
    expect(first.answer).toBe(FIRST_SESSION.answer);
    expect(list("data/five-letters/answers.txt")).toContain(first.answer);
    expect(bandOf(first.difficulty)).toBe(0);
  });
});

describe("FIVE LETTERS persistence", () => {
  it("round trips a game through serialize and deserialize", () => {
    const state = play(["crane", "wears"]);
    const back = internals.deserialize(state.puzzle, internals.serialize(state));
    expect(back.ok && back.value.guesses.map((g) => g.word)).toEqual(["crane", "wears"]);
  });

  it("refuses a wrong version, a malformed save and an impossible one", () => {
    const puzzle = day().puzzle;
    expect(internals.deserialize(puzzle, { v: 2, data: {} }).ok).toBe(false);
    expect(internals.deserialize(puzzle, { v: 1, data: { w: [1], f: [0] } }).ok).toBe(false);
    expect(internals.deserialize(puzzle, { v: 1, data: { w: ["crane"], f: ["x"] } }).ok).toBe(false);
    expect(internals.deserialize(puzzle, { v: 1, data: { w: ["heart", "crane"], f: [0, 0] } }).ok).toBe(false);
    expect(internals.deserialize(puzzle, { v: 1, data: null }).ok).toBe(false);
    expect(internals.migrateState(0, { v: 0, data: {} }).ok).toBe(false);
  });
});

describe("FIVE LETTERS share path end to end", () => {
  it("builds a valid artifact from the module's own run log", () => {
    const state = play(["crane", "wears", "heart"]);
    expect(internals.inspect(state).kind).toBe("finished");
    const run = internals.telemetry(state);
    expect(validateRunLog(run).ok).toBe(true);
    const artifact = internals.shareArtifact(state.puzzle, state, run, context);
    expect(validateArtifact(artifact, "dailykit.providentia.games").ok).toBe(true);
    const text = renderArtifact(artifact, "dailykit.providentia.games");
    expect(text.toLowerCase()).not.toContain("heart");
    expect(internals.difficulty(state.puzzle)).toBe(11);
  });
});
