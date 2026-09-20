import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { renderArtifact, validateArtifact } from "../../../src/engine/artifact.js";
import { validateRunLog } from "../../../src/engine/telemetry.js";
import type { ShareContext } from "../../../src/core/types.js";
import { entryFor } from "../../../src/shell/registry.js";
import game, { internals } from "../../../src/games/pangram/module.js";
import { encodeLayout, encodeWords } from "../../../src/games/pangram/pangram-codec.js";
import type { PangramState } from "../../../src/games/pangram/rules.js";
import { tutorialPuzzle } from "./fixtures.js";

const context: ShareContext = { puzzleNumber: 7, currentStreak: 0, rated: true };

function entry(n: number) {
  const p = tutorialPuzzle(n);
  return {
    layout: encodeLayout(n, p.letters, p.centre),
    words: encodeWords(n, p.letters, p.answers),
    best: { total: p.total, count: p.answers.length, pangrams: p.pangrams },
    levers: ["centre-consonant", "pangrams-1", "no-s"],
  };
}

function day(n = 7): PangramState {
  const parsed = internals.parsePuzzle(n, entry(n));
  if (!parsed.ok) throw new Error(parsed.error.detail);
  return internals.initialState(parsed.value);
}

function play(words: readonly string[]): PangramState {
  let state = day();
  for (const word of words) {
    const next = internals.apply(state, { kind: "word", word, refusedBefore: 0 });
    if (!next.ok) throw new Error(`${word}: ${next.error.code}`);
    state = next.value;
  }
  return state;
}

describe("PANGRAM contract surface", () => {
  it("default exports a v3 module whose distribution fits its buckets", () => {
    expect(game.identity.id).toBe("pangram");
    expect(game.input.kind).toBe("custom");
    expect(game.hasWinLoss).toBe(false);
    expect(game.shareCapabilities.grammar).toBe("C");
    expect(game.shareCapabilities.patterns.length).toBeGreaterThanOrEqual(2);
    expect(game.shareCapabilities.maxRows).toBeLessThanOrEqual(7);
    expect(game.distribution.labels).toHaveLength(5);
    expect(game.distribution.distinguishedIndex).toBe(0);
    expect(game.archiveEnabled).toBe(true);
  });

  it("agrees with its registry entry", () => {
    const row = entryFor("pangram");
    expect(row).not.toBeNull();
    expect(row?.bucketCount).toBe(game.distribution.labels.length);
    expect(row?.hasWinLoss).toBe(game.hasWinLoss);
    expect(row?.stateVersion).toBe(game.stateVersion);
    expect(row?.oneLineRule).toBe(game.identity.oneLineRule);
    expect(row?.displayName).toBe(game.identity.displayName);
    expect(row?.epoch).toEqual(game.identity.epoch);
    expect(row?.accent).toEqual(game.identity.accent);
  });

  it("supplies an easier first session day and no day past the horizon", () => {
    const first = internals.firstSessionPuzzle();
    expect(first.answers.length).toBeGreaterThanOrEqual(20);
    expect(game.firstSessionPuzzle).toBeDefined();
    const beyond = internals.generatePuzzle(400, 1);
    expect(beyond.ok).toBe(false);
    if (!beyond.ok) expect(beyond.error.code).toBe("missing");
  });

  it("never pulls the word lists or the generator into the page", () => {
    const source = readFileSync("src/games/pangram/module.ts", "utf8");
    expect(source).not.toMatch(/from "\.\/(generator|solver|bands)\.js"/);
    for (const file of ["rules", "render", "telemetry", "pangram-codec", "letters", "help", "tutorial"]) {
      const text = readFileSync(`src/games/pangram/${file}.ts`, "utf8");
      expect(text).not.toMatch(/generator\.js|solver\.js|accepted\.txt|familiar\.txt/);
    }
  });
});

describe("PANGRAM manifest round trip", () => {
  it("parses an obfuscated entry back into the same day", () => {
    const parsed = internals.parsePuzzle(7, entry(7));
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.letters).toBe("abhinot");
      expect(parsed.value.centre).toBe("h");
      expect(parsed.value.answers).toEqual(tutorialPuzzle().answers);
      expect(internals.difficulty(parsed.value)).toBe(63);
    }
  });

  it("parses every committed day", () => {
    const index = JSON.parse(readFileSync("data/pangram/manifest.index.json", "utf8")) as {
      chunks: { from: number; to: number; url: string }[];
    };
    let days = 0;
    for (const chunk of index.chunks) {
      const body = JSON.parse(readFileSync(chunk.url.slice(1), "utf8")) as { entries: Record<string, unknown> };
      for (let n = chunk.from; n <= chunk.to; n += 1) {
        const parsed = internals.parsePuzzle(n, body.entries[String(n)]);
        expect(parsed.ok).toBe(true);
        days += 1;
      }
    }
    expect(days).toBe(365);
  });

  it("refuses a non object, a bad layout, bad words, and figures that disagree", () => {
    expect(internals.parsePuzzle(7, null).ok).toBe(false);
    expect(internals.parsePuzzle(7, { ...entry(7), layout: "short" }).ok).toBe(false);
    expect(internals.parsePuzzle(7, { ...entry(7), words: "" }).ok).toBe(false);
    expect(internals.parsePuzzle(7, { ...entry(7), best: { total: 64, count: 21, pangrams: 1 } }).ok).toBe(false);
    /* Decoding with the wrong puzzle number scrambles the letters. */
    expect(internals.parsePuzzle(8, entry(7)).ok).toBe(false);
  });
});

describe("PANGRAM state round trip", () => {
  it("restores an in progress and a finished game", () => {
    const partway = play(["bath", "habit"]);
    const a = internals.deserialize(partway.puzzle, internals.serialize(partway));
    expect(a.ok && a.value.found.map((f) => f.word)).toEqual(["bath", "habit"]);
    const finished = internals.apply(partway, { kind: "finish" });
    if (!finished.ok) throw new Error("finish refused");
    const b = internals.deserialize(partway.puzzle, internals.serialize(finished.value));
    expect(b.ok && b.value.finished).toBe(true);
  });

  it("refuses a foreign version, a malformed payload, and a find that is not an answer", () => {
    const p = day().puzzle;
    expect(internals.deserialize(p, { v: 2, data: { w: [], f: [], d: false } }).ok).toBe(false);
    expect(internals.deserialize(p, { v: 1, data: { w: "bath", f: [], d: false } }).ok).toBe(false);
    expect(internals.deserialize(p, { v: 1, data: { w: [], f: ["x"], d: false } }).ok).toBe(false);
    expect(internals.deserialize(p, { v: 1, data: { w: ["hath"], f: [0], d: false } }).ok).toBe(false);
    expect(internals.migrateState(0, { v: 0, data: null }).ok).toBe(false);
  });
});

describe("PANGRAM outcome and share", () => {
  it("grades a finished game with its bucket and difficulty", () => {
    const done = internals.apply(play(["bath"]), { kind: "finish" });
    if (!done.ok) throw new Error("finish refused");
    expect(internals.inspect(done.value)).toMatchObject({ kind: "finished", won: null, tier: 4, bucket: 4, difficulty: 63 });
  });

  it("shares two rows of eight that validate and end with the URL", () => {
    const done = internals.apply(play(["bath", "habitation"]), { kind: "finish" });
    if (!done.ok) throw new Error("finish refused");
    const state = done.value;
    const run = internals.telemetry(state);
    expect(validateRunLog(run).ok).toBe(true);
    const artifact = internals.shareArtifact(state.puzzle, state, run, context);
    expect(artifact.rows).toHaveLength(2);
    expect(validateArtifact(artifact, game.identity.shareUrl).ok).toBe(true);
    const lines = renderArtifact(artifact, game.identity.shareUrl).split("\n");
    expect(lines.length).toBeLessThanOrEqual(9);
    expect(lines.at(-1)).toBe(game.identity.shareUrl);
  });
});
