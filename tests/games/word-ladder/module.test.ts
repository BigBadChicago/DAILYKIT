import { describe, expect, it } from "vitest";

import { renderArtifact, validateArtifact } from "../../../src/engine/artifact.js";
import { validateRunLog } from "../../../src/engine/telemetry.js";
import type { ShareContext } from "../../../src/core/types.js";
import { entryFor } from "../../../src/shell/registry.js";
import game, { internals } from "../../../src/games/word-ladder/module.js";
import { encodeLayout } from "../../../src/games/word-ladder/word-ladder-codec.js";
import { type WordLadderState } from "../../../src/games/word-ladder/rules.js";

const context = (overrides: Partial<ShareContext> = {}): ShareContext => ({
  puzzleNumber: 7,
  currentStreak: 0,
  rated: true,
  ...overrides,
});

/** Builds a real day 1 puzzle through the module's own parser, then climbs it via
 *  the module's apply so every fixture goes through the shipped code path. */
function day1(): { state: WordLadderState; parse: ReturnType<typeof internals.parsePuzzle> } {
  const parse = internals.parsePuzzle(1, { layout: encodeLayout(1, "limp", "mare"), levers: ["par-4", "detour-0"] });
  if (!parse.ok) throw new Error(parse.error.detail);
  return { state: internals.initialState(parse.value), parse };
}

function climb(words: readonly string[]): WordLadderState {
  const { parse } = day1();
  if (!parse.ok) throw new Error("fixture parse failed");
  let state = internals.initialState(parse.value);
  for (const word of words) {
    const next = internals.apply(state, { kind: "rung", word, refusedBefore: 0 });
    if (!next.ok) throw new Error(`fixture rejected at ${word}: ${next.error.code}`);
    state = next.value;
  }
  return state;
}

describe("WORD LADDER contract surface", () => {
  it("default exports a v3 module whose distribution fits its buckets", () => {
    expect(game.identity.id).toBe("word-ladder");
    expect(game.input.kind).toBe("custom");
    expect(game.hasWinLoss).toBe(false);
    expect(game.shareCapabilities.grammar).toBe("B");
    expect(game.shareCapabilities.patterns.length).toBeGreaterThanOrEqual(2);
    expect(game.shareCapabilities.maxRows).toBeLessThanOrEqual(7);
    expect(game.distribution.labels).toHaveLength(5);
    expect(game.distribution.distinguishedIndex).toBe(0);
  });

  it("agrees with its registry entry", () => {
    const entry = entryFor("word-ladder");
    expect(entry).not.toBeNull();
    expect(entry?.bucketCount).toBe(game.distribution.labels.length);
    expect(entry?.hasWinLoss).toBe(game.hasWinLoss);
    expect(entry?.stateVersion).toBe(game.stateVersion);
    expect(entry?.oneLineRule).toBe(game.identity.oneLineRule);
    expect(entry?.displayName).toBe(game.identity.displayName);
    expect(entry?.epoch).toEqual(game.identity.epoch);
    expect(entry?.accent).toEqual(game.identity.accent);
  });

  it("supplies a valid easier first session board", () => {
    const first = internals.firstSessionPuzzle();
    expect(first).toBeDefined();
    expect(first.par).toBeGreaterThanOrEqual(4);
    /* The module also exposes it on the erased contract for the shell. */
    expect(game.firstSessionPuzzle).toBeDefined();
  });
});

describe("WORD LADDER manifest round trip", () => {
  it("parses an obfuscated entry back into the same board", () => {
    const parsed = internals.parsePuzzle(1, { layout: encodeLayout(1, "limp", "mare"), levers: ["par-4", "detour-0"] });
    expect(parsed.ok).toBe(true);
    if (parsed.ok) {
      expect(parsed.value.start).toBe("limp");
      expect(parsed.value.goal).toBe("mare");
      expect(parsed.value.par).toBe(4);
    }
  });

  it("refuses a non object, a layout that does not decode, and a board that is not a puzzle", () => {
    expect(internals.parsePuzzle(1, null).ok).toBe(false);
    expect(internals.parsePuzzle(1, { layout: "short" }).ok).toBe(false);
    /* Two identical words decode but are not a puzzle. */
    const same = encodeLayout(1, "mare", "mare");
    expect(internals.parsePuzzle(1, { layout: same, levers: [] }).ok).toBe(false);
  });
});

describe("WORD LADDER state round trip", () => {
  it("restores an in progress and a finished game", () => {
    const inProgress = climb(["lime", "mime"]);
    const restoredA = internals.deserialize(inProgress.puzzle, internals.serialize(inProgress));
    expect(restoredA.ok).toBe(true);
    if (restoredA.ok) expect(restoredA.value.rungs.map((r) => r.word)).toEqual(["lime", "mime"]);

    const won = climb(["lime", "mime", "mire", "mare"]);
    const restoredB = internals.deserialize(won.puzzle, internals.serialize(won));
    expect(restoredB.ok).toBe(true);
    if (restoredB.ok) expect(restoredB.value.won).toBe(true);
  });

  it("refuses a foreign version, a malformed payload, and an unreachable climb", () => {
    const { parse } = day1();
    if (!parse.ok) return;
    const p = parse.value;
    expect(internals.deserialize(p, { v: 2, data: { w: [], f: [], r: false } }).ok).toBe(false);
    expect(internals.deserialize(p, { v: 1, data: { w: "nope", f: [], r: false } }).ok).toBe(false);
    /* A two letter jump from the start is unreachable. */
    expect(internals.deserialize(p, { v: 1, data: { w: ["mare"], f: [0], r: false } }).ok).toBe(false);
    expect(internals.migrateState(0, { v: 0, data: null }).ok).toBe(false);
  });
});

describe("WORD LADDER outcome and share", () => {
  it("grades a par climb with its bucket and difficulty", () => {
    const state = climb(["lime", "mime", "mire", "mare"]);
    const outcome = internals.inspect(state);
    expect(outcome).toMatchObject({ kind: "finished", won: true, bucket: 0, difficulty: state.puzzle.difficulty });
  });

  it("shares one token per rung, validates, and ends with the URL", () => {
    const state = climb(["lime", "mime", "mire", "mare"]);
    const artifact = internals.shareArtifact(state.puzzle, state, internals.telemetry(state), context());
    expect(artifact.rows).toHaveLength(4);
    for (const row of artifact.rows) expect(row).toHaveLength(1);
    expect(artifact.title).toMatch(/^WORD LADDER #7 \w+, 4\/4$/);
    expect(validateRunLog(internals.telemetry(state)).ok).toBe(true);
    expect(validateArtifact(artifact, game.identity.shareUrl).ok).toBe(true);
    const lines = renderArtifact(artifact, game.identity.shareUrl).split("\n");
    expect(lines.length).toBeLessThanOrEqual(9);
    expect(lines.at(-1)).toBe(game.identity.shareUrl);
  });

  it("difficulty is recomputed from the puzzle, matching the manifest measure", () => {
    const { parse } = day1();
    if (parse.ok) expect(internals.difficulty(parse.value)).toBe(parse.value.difficulty);
  });
});
