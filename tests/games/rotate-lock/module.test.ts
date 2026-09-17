import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { seedFor } from "../../../src/core/seed.js";
import type { ShareContext } from "../../../src/core/types.js";
import { renderArtifact, validateArtifact } from "../../../src/engine/artifact.js";
import { SHARE_MAX_ROWS } from "../../../src/engine/share-grammar.js";
import { encodeLayout } from "../../../src/games/rotate-lock/layout-codec.js";
import game, { KEYS, internals } from "../../../src/games/rotate-lock/module.js";
import { bandForPuzzle, bandOf } from "../../../src/games/rotate-lock/generator.js";
import { MOVE_CAP, type RotateLockAction } from "../../../src/games/rotate-lock/rules.js";
import { entryFor } from "../../../src/shell/registry.js";
import type { RotateLockEntry } from "../../../tools/rotate-lock-generate.js";
import { IDLE_ROTATE, fixturePuzzle, play, solvingLine } from "./fixtures.js";

const context = (overrides: Partial<ShareContext> = {}): ShareContext => ({ puzzleNumber: 7, currentStreak: 0, rated: true, ...overrides });
const chunk = JSON.parse(readFileSync("data/rotate-lock/manifest.1-365.json", "utf8")) as { entries: Record<string, RotateLockEntry> };
const index = JSON.parse(readFileSync("data/rotate-lock/manifest.index.json", "utf8")) as { horizon: number; chunks: { url: string }[] };

describe("ROTATE LOCK contract surface", () => {
  it("default exports a v3 module with its declared shape", () => {
    expect(game.identity.id).toBe("rotate-lock");
    expect(game.input).toEqual({ kind: "custom", pointer: "tap", keys: KEYS });
    expect(game.hasWinLoss).toBe(true);
    expect(game.archiveEnabled).toBe(true);
    expect(game.distribution).toEqual({ labels: ["At par", "1 to 4 over", "5 to 10 over", "11 or more over", "Jammed"], distinguishedIndex: 0 });
    expect(game.shareCapabilities.grammar).toBe("B");
    expect(game.shareCapabilities.patterns.length).toBeGreaterThanOrEqual(2);
    expect(game.shareCapabilities.maxRows).toBeLessThanOrEqual(SHARE_MAX_ROWS);
    expect(game.manifest.indexUrl).toBe("/data/rotate-lock/manifest.index.json");
    expect(game.help().example.lines.length).toBeGreaterThan(0);
  });

  it("agrees with its registry entry", () => {
    const entry = entryFor("rotate-lock");
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

describe("ROTATE LOCK manifest round trip", () => {
  it("declares a year in the shell's index shape", () => {
    expect(index.horizon).toBe(365);
    expect(index.chunks).toEqual([{ from: 1, to: 365, url: "/data/rotate-lock/manifest.1-365.json" }]);
  });

  it("parses every committed day and measures what the entry stores", () => {
    for (let day = 1; day <= index.horizon; day += 1) {
      const entry = chunk.entries[String(day)];
      const parsed = internals.parsePuzzle(day, entry);
      if (!parsed.ok) throw new Error(`day ${String(day)}: ${parsed.error.detail}`);
      expect(parsed.value.number).toBe(day);
      expect(parsed.value.par).toBe(entry?.best.par);
      expect(parsed.value.difficulty).toBe(entry?.best.difficulty);
      expect(internals.difficulty(parsed.value)).toBe(entry?.best.difficulty);
      expect(bandOf(parsed.value.difficulty)).toBe(bandForPuzzle(day));
    }
  });

  it("refuses an entry it cannot trust", () => {
    const day1 = chunk.entries["1"] as RotateLockEntry;
    expect(internals.parsePuzzle(1, null).ok).toBe(false);
    expect(internals.parsePuzzle(1, { layout: 7 }).ok).toBe(false);
    expect(internals.parsePuzzle(1, { layout: day1.layout.slice(1) }).ok).toBe(false);
    /* Keyed by day: a day's layout read as another day's is noise, not a puzzle. */
    expect(internals.parsePuzzle(2, day1).ok).toBe(false);
    const puzzle = fixturePuzzle();
    const twoRoutes = encodeLayout(5, { ...puzzle, marks: [] }, { order: puzzle.startOrder, facing: puzzle.startFacing });
    expect(internals.parsePuzzle(5, { layout: twoRoutes })).toMatchObject({ ok: false, error: { code: "malformed" } });
  });

  it("generates a deterministic unrated day past the horizon", () => {
    const first = internals.generatePuzzle(400, seedFor("rotate-lock", 400));
    const second = internals.generatePuzzle(400, seedFor("rotate-lock", 400));
    expect(first.ok).toBe(true);
    expect(first).toEqual(second);
  });
});

describe("ROTATE LOCK state round trip", () => {
  const puzzle = fixturePuzzle();

  it("restores every state it serialized, revisits included", () => {
    const lines: RotateLockAction[][] = [[], [IDLE_ROTATE], [{ kind: "swap", a: 0, b: 6 }, { kind: "swap", a: 0, b: 6 }], solvingLine(puzzle)];
    for (const actions of lines) {
      const state = play(puzzle, actions);
      const stored = internals.serialize(state);
      expect(JSON.parse(JSON.stringify(stored))).toEqual(stored);
      expect(internals.deserialize(puzzle, stored)).toEqual({ ok: true, value: state });
    }
    const jammed = play(puzzle, new Array<RotateLockAction>(MOVE_CAP).fill(IDLE_ROTATE));
    const stored = internals.serialize(jammed);
    expect((stored.data as { m: string }).m).toHaveLength(MOVE_CAP * 2);
    expect(internals.deserialize(puzzle, stored)).toEqual({ ok: true, value: jammed });
  });

  it("refuses a foreign version, a malformed payload and moves no game could make", () => {
    expect(internals.deserialize(puzzle, { v: 2, data: { m: "" } })).toMatchObject({ ok: false, error: { code: "unsupported-version" } });
    expect(internals.deserialize(puzzle, { v: 1, data: null })).toMatchObject({ ok: false, error: { code: "malformed" } });
    expect(internals.deserialize(puzzle, { v: 1, data: { m: "0" } })).toMatchObject({ ok: false, error: { code: "malformed" } });
    expect(internals.deserialize(puzzle, { v: 1, data: { m: "33" } })).toMatchObject({ ok: false, error: { code: "malformed" } });
    const past = `${solvingLine(puzzle).map((action) => (action.kind === "swap" ? `${String(action.a)}${String(action.b)}` : `r${String(action.piece)}`)).join("")}r0`;
    expect(internals.deserialize(puzzle, { v: 1, data: { m: past } })).toMatchObject({ ok: false, error: { code: "malformed" } });
    expect(internals.migrateState(0, { v: 0, data: null }).ok).toBe(false);
  });
});

describe("ROTATE LOCK outcome and share", () => {
  const puzzle = fixturePuzzle();

  it("is ongoing until the lock opens, then graded with bucket and difficulty", () => {
    expect(internals.inspect(play(puzzle, [IDLE_ROTATE]))).toEqual({ kind: "ongoing" });
    expect(internals.inspect(play(puzzle, solvingLine(puzzle)))).toMatchObject({ kind: "finished", won: true, tier: 0, bucket: 0 });
  });

  it("maps the run to a valid artifact that ends with the URL", () => {
    const state = play(puzzle, solvingLine(puzzle));
    const model = internals.shareArtifact(puzzle, state, internals.telemetry(state), context());
    expect(validateArtifact(model, game.identity.shareUrl).ok).toBe(true);
    const lines = renderArtifact(model, game.identity.shareUrl).split("\n");
    expect(lines[0]).toBe("ROTATE LOCK #7 Excellent, 3 moves");
    expect(lines.at(-1)).toBe(game.identity.shareUrl);
  });
});
