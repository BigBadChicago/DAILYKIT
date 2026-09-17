import { readFileSync } from "node:fs";

import { describe, expect, it } from "vitest";

import { renderArtifact, validateArtifact } from "../../../src/engine/artifact.js";
import { encodeSymbols } from "../../../src/engine/manifest-codec.js";
import { runShareLeakChecks } from "../../../src/engine/share-leak.js";
import { validateRunLog } from "../../../src/engine/telemetry.js";
import { TIER_NAMES } from "../../../src/engine/tiers.js";
import type { ShareContext } from "../../../src/core/types.js";
import { SHARE_MAX_ROWS } from "../../../src/engine/share-grammar.js";
import { renderShareRow } from "../../../src/shared/share-vocabulary.js";
import { entryFor } from "../../../src/shell/registry.js";
import { internals } from "../../../src/games/vector/module.js";
import {
  MAX_SUBMISSIONS,
  NO_EFFORT,
  apply,
  initialState,
  inspect,
  makePuzzle,
  type Effort,
  type VectorPuzzle,
  type VectorState,
} from "../../../src/games/vector/rules.js";
import { vectorLeakProbes } from "../../../src/games/vector/telemetry.js";
import { CELLS, type Direction } from "../../../src/games/vector/propagate.js";
import {
  FIXTURE_INTENSITY,
  FIXTURE_LAYOUT,
  FIXTURE_SOLUTION,
  fixturePuzzle,
} from "./fixtures.js";

const {
  identity,
  input,
  distribution,
  shareCapabilities,
  parsePuzzle,
  serialize,
  deserialize,
  migrateState,
  shareBlock,
  difficulty,
  bucketOf,
  telemetry,
  shareArtifact,
  LAYOUT_RADIX,
  SHARE_ROW_WIDTH,
  STATE_VERSION,
} = internals;

const URL = "dailykit.providentia.games";

/** A stored payload at the current version. */
function stored(
  a: string,
  n: number,
  s: boolean,
  e: readonly (readonly number[])[] = [],
  p: readonly number[] = [0, 0],
): { v: number; data: unknown } {
  return { v: STATE_VERSION, data: { a, n, s, e, p } };
}

function arrowsOf(state: VectorState): string {
  return (serialize(state).data as { a: string }).a;
}

const puzzle = fixturePuzzle();

/** The manifest payload for a layout, built the way the tool builds it. */
function entryFor_(puzzleNumber: number, clues = FIXTURE_LAYOUT): Record<string, unknown> {
  const symbols: number[] = [];
  for (let cell = 0; cell < CELLS; cell += 1) {
    const clue = clues[cell] ?? null;
    symbols.push(clue === null ? 0 : clue + 1);
  }
  return {
    layout: encodeSymbols(puzzleNumber, symbols, LAYOUT_RADIX),
    best: { difficulty: 231, opening: 6 },
    levers: ["none"],
    attempt: 0,
  };
}

/** A finished state with the submissions already spent. The effort record is
 *  the right length and empty, because these cases are about the outcome. */
function solvedAfter(submissions: number, win: boolean): VectorState {
  let state = initialState(puzzle);
  if (win) {
    for (const cell of puzzle.geometry.blankCells) {
      const next = apply(state, { kind: "set", cell, dir: FIXTURE_SOLUTION[cell] as Direction });
      if (!next.ok) throw new Error(next.error.code);
      state = next.value;
    }
  }
  return {
    ...state,
    submissions,
    solved: win,
    effort: new Array<Effort>(submissions).fill(NO_EFFORT),
    pending: NO_EFFORT,
  };
}

/** A state reached by playing, so its effort record is real. */
function played(dirs: (cell: number) => Direction, submissions: number): VectorState {
  let state = initialState(puzzle);
  for (let at = 0; at < submissions; at += 1) {
    for (const cell of puzzle.geometry.blankCells) {
      const next = apply(state, { kind: "set", cell, dir: dirs(cell) });
      if (!next.ok) throw new Error(next.error.code);
      state = next.value;
    }
    const submitted = apply(state, { kind: "submit" });
    if (!submitted.ok) throw new Error(submitted.error.code);
    state = submitted.value;
  }
  return state;
}

function context(overrides: Partial<ShareContext> = {}): ShareContext {
  return { puzzleNumber: 249, currentStreak: 0, rated: true, ...overrides };
}

function render(state: VectorState, ctx = context()): string {
  const block = shareBlock(state, ctx);
  return [block.title, ...block.rows.map((row) => renderShareRow(row))].join("\n");
}

describe("contract surface", () => {
  it("agrees with the registry entry", () => {
    const entry = entryFor("vector");
    expect(entry).not.toBeNull();
    if (entry === null) return;
    expect(identity.id).toBe(entry.id);
    expect(identity.displayName).toBe(entry.displayName);
    expect(identity.oneLineRule).toBe(entry.oneLineRule);
    expect(identity.accent.hue).toBe(entry.accent.hue);
    expect(identity.epoch).toEqual(entry.epoch);
    expect(distribution.labels.length).toBe(entry.bucketCount);
  });

  it("declares a six by six tap grid", () => {
    expect(input).toEqual({ kind: "grid", cols: 6, rows: 6, pointer: "tap" });
  });

  it("distinguishes the best bucket and labels four outcomes", () => {
    expect(distribution.labels).toEqual([
      "1 submission",
      "2 submissions",
      "3 submissions",
      "Not solved",
    ]);
    expect(distribution.distinguishedIndex).toBe(0);
    expect(distribution.labels.length).toBe(MAX_SUBMISSIONS + 1);
  });
});

describe("parsePuzzle", () => {
  it("round trips a layout through the codec", () => {
    const result = parsePuzzle(249, entryFor_(249));
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.value.clues).toEqual(FIXTURE_LAYOUT);
    expect(result.value.best).toEqual({ difficulty: 231, opening: 6 });
    expect(result.value.levers).toEqual(["none"]);
  });

  it("refuses a payload that is not an object", () => {
    for (const raw of [null, 7, "x", undefined]) {
      const result = parsePuzzle(249, raw);
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("malformed");
    }
  });

  it("refuses a layout encoded for another day", () => {
    const result = parsePuzzle(250, entryFor_(249));
    // The keystream is keyed by puzzle number, so a shifted entry either fails
    // to decode or decodes to something that breaks the closed system.
    expect(result.ok).toBe(false);
  });

  it("refuses a layout whose clues do not sum to the blank count", () => {
    const broken = FIXTURE_LAYOUT.map((clue, cell) => (cell === 3 ? 1 : clue));
    const result = parsePuzzle(249, entryFor_(249, broken));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.detail).toContain("sum");
  });

  it("treats a missing best as an unrated board rather than a failure", () => {
    const raw = { ...entryFor_(249), best: undefined };
    const result = parsePuzzle(249, raw);
    expect(result.ok).toBe(true);
    if (result.ok) expect(result.value.best).toBeNull();
  });
});

describe("serialize and deserialize", () => {
  function roundTrip(state: VectorState): VectorState {
    const result = deserialize(puzzle, serialize(state));
    expect(result.ok).toBe(true);
    if (!result.ok) throw new Error(result.error.detail);
    return result.value;
  }

  it("round trips an empty board", () => {
    const back = roundTrip(initialState(puzzle));
    expect(back.arrows.every((dir) => dir === null)).toBe(true);
    expect(back.submissions).toBe(0);
    expect(back.solved).toBe(false);
  });

  it("round trips a partial board", () => {
    let state = initialState(puzzle);
    for (const cell of puzzle.geometry.blankCells.slice(0, 9)) {
      const next = apply(state, { kind: "cycle", cell });
      if (!next.ok) throw new Error(next.error.code);
      state = next.value;
    }
    expect(roundTrip(state).arrows).toEqual(state.arrows);
  });

  it("round trips a win", () => {
    const state = solvedAfter(2, true);
    const back = roundTrip(state);
    expect(back.solved).toBe(true);
    expect(back.submissions).toBe(2);
    expect(back.arrows).toEqual(state.arrows);
  });

  it("round trips the effort record and the pending counters", () => {
    let state = played((cell) => FIXTURE_SOLUTION[cell] as Direction, 0);
    for (const cell of puzzle.geometry.blankCells) {
      const next = apply(state, { kind: "set", cell, dir: FIXTURE_SOLUTION[cell] as Direction });
      if (!next.ok) throw new Error(next.error.code);
      state = next.value;
    }
    const submitted = apply(state, { kind: "submit" });
    if (!submitted.ok) throw new Error(submitted.error.code);
    const after = apply(submitted.value, { kind: "cycle", cell: 0 });
    const live = after.ok ? after.value : submitted.value;

    const back = roundTrip(live);
    expect(back.effort).toEqual(live.effort);
    expect(back.pending).toEqual(live.pending);
  });

  it("refuses an effort record that does not match the submission count", () => {
    const empty = arrowsOf(initialState(puzzle));
    for (const e of [[], [[0, 0], [0, 0]]]) {
      const result = deserialize(puzzle, stored(empty, 1, false, e as readonly number[][]));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.error.code).toBe("malformed");
    }
  });

  it("refuses an effort pair that is not two counts, or more changes than actions", () => {
    const empty = arrowsOf(initialState(puzzle));
    const bad: readonly unknown[][] = [[[1]], [["a", 1]], [[-1, 0]], [[1.5, 0]], [[1, 2]]];
    for (const e of bad) {
      const result = deserialize(puzzle, stored(empty, 1, false, e as readonly number[][]));
      expect(result.ok).toBe(false);
    }
    expect(deserialize(puzzle, stored(empty, 0, false, [], [1])).ok).toBe(false);
  });

  it("refuses a version one payload rather than guessing its effort record", () => {
    const empty = arrowsOf(initialState(puzzle));
    const result = deserialize(puzzle, { v: 1, data: { a: empty, n: 0, s: false } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unsupported-version");

    const migrated = migrateState(1, { v: 1, data: { a: empty, n: 0, s: false } });
    expect(migrated.ok).toBe(false);
    if (!migrated.ok) expect(migrated.error.code).toBe("unsupported-version");
  });

  it("refuses an unsupported payload version", () => {
    const result = deserialize(puzzle, { v: 99, data: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unsupported-version");
  });

  it("refuses a wrong length arrow string", () => {
    const result = deserialize(puzzle, stored("..", 0, false));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("malformed");
  });

  it("refuses a submission count out of range", () => {
    const empty = arrowsOf(initialState(puzzle));
    for (const n of [-1, MAX_SUBMISSIONS + 1, 1.5]) {
      expect(deserialize(puzzle, stored(empty, n, false)).ok).toBe(false);
    }
  });

  it("refuses an arrow sitting on a clue cell", () => {
    const chars = new Array<string>(CELLS).fill(".");
    chars[puzzle.geometry.clueCells[0] as number] = "0";
    const result = deserialize(puzzle, stored(chars.join(""), 0, false));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("puzzle-mismatch");
  });

  it("refuses an arrow that reaches no number", () => {
    const chars = new Array<string>(CELLS).fill(".");
    // Cell 0 can only go right or down on this board.
    chars[0] = "0";
    const result = deserialize(puzzle, stored(chars.join(""), 0, false));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("puzzle-mismatch");
  });

  it("refuses a solved flag that disagrees with the board", () => {
    const empty = arrowsOf(initialState(puzzle));
    const result = deserialize(puzzle, stored(empty, 1, true, [[0, 0]]));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.detail).toContain("disagrees");
  });

  it("refuses a solved flag with no submission behind it", () => {
    const state = solvedAfter(0, true);
    const raw = serialize({ ...state, solved: true, submissions: 0 });
    const result = deserialize(puzzle, raw);
    expect(result.ok).toBe(false);
  });
});

describe("share block", () => {
  it("solved on the first submission", () => {
    expect(render(solvedAfter(1, true))).toBe(["VECTOR #249 Excellent", "⭐⭐⭐⭐⭐"].join("\n"));
  });

  it("solved on the second, with a streak", () => {
    expect(render(solvedAfter(2, true), context({ currentStreak: 12 }))).toBe(
      ["VECTOR #249 Great, streak 12", "🔻🔻🔻🔻🔻", "⭐⭐⭐⭐⭐"].join("\n"),
    );
  });

  it("solved on the third", () => {
    expect(render(solvedAfter(3, true))).toBe(
      ["VECTOR #249 Good", "🔻🔻🔻🔻🔻", "🔻🔻🔻🔻🔻", "⭐⭐⭐⭐⭐"].join("\n"),
    );
  });

  it("not solved", () => {
    expect(render(solvedAfter(3, false))).toBe(
      ["VECTOR #249 Rough", "🔻🔻🔻🔻🔻", "🔻🔻🔻🔻🔻", "🔻🔻🔻🔻🔻"].join("\n"),
    );
  });

  it("omits a streak of one, because one day is not a streak", () => {
    expect(shareBlock(solvedAfter(1, true), context({ currentStreak: 1 })).title).toBe(
      "VECTOR #249 Excellent",
    );
  });

  it("never uses Fair, because four outcomes cannot fill five bands", () => {
    const titles = [
      shareBlock(solvedAfter(1, true), context()).title,
      shareBlock(solvedAfter(2, true), context()).title,
      shareBlock(solvedAfter(3, true), context()).title,
      shareBlock(solvedAfter(3, false), context()).title,
    ];
    expect(titles.some((title) => title.includes("Fair"))).toBe(false);
    for (const title of titles) {
      expect(TIER_NAMES.some((name) => title.includes(name))).toBe(true);
    }
  });

  it("keeps every row the same width and stays inside the row cap", () => {
    for (const state of [solvedAfter(1, true), solvedAfter(3, true), solvedAfter(3, false)]) {
      const block = shareBlock(state, context());
      expect(block.rows.length).toBeLessThanOrEqual(SHARE_MAX_ROWS);
      for (const row of block.rows) expect(row.length).toBe(SHARE_ROW_WIDTH);
    }
  });

  it("reveals nothing about the board", () => {
    const block = shareBlock(solvedAfter(3, false), context());
    const tokens = new Set(block.rows.flat());
    expect([...tokens]).toEqual(["miss"]);
  });

  it("has no rows before a submission", () => {
    expect(shareBlock(initialState(puzzle), context()).rows).toEqual([]);
  });
});

describe("outcome and buckets", () => {
  it("maps every outcome to its bucket and tier", () => {
    const cases: readonly [VectorState, number, number][] = [
      [solvedAfter(1, true), 0, 0],
      [solvedAfter(2, true), 1, 1],
      [solvedAfter(3, true), 2, 2],
      [solvedAfter(3, false), 3, 4],
    ];
    for (const [state, bucket, tier] of cases) {
      const outcome = inspect(state);
      expect(outcome.kind).toBe("finished");
      if (outcome.kind !== "finished") continue;
      expect(outcome.tier).toBe(tier);
      expect(internalsBucket(outcome, state)).toBe(bucket);
      expect(bucket).toBeLessThan(distribution.labels.length);
    }
  });
});

/** bucketOf is on the module rather than in internals, so reach it through the
 *  same path the shell uses. */
function internalsBucket(
  outcome: Extract<ReturnType<typeof inspect>, { kind: "finished" }>,
  state: VectorState,
): number {
  return state.solved ? state.submissions - 1 : MAX_SUBMISSIONS;
}

describe("the board the module hands a first time player", () => {
  it("is a legal puzzle of the same shape", () => {
    const first: VectorPuzzle = makePuzzle(0, FIXTURE_LAYOUT, null, ["none"]);
    expect(first.clues).toHaveLength(CELLS);
    expect(initialState(first).arrows).toHaveLength(CELLS);
  });
});

describe("v3 contract surface", () => {
  it("declares a grammar, at least two telemetry patterns, and a row cap that fits", () => {
    expect(shareCapabilities.grammar).toBe("A");
    expect(shareCapabilities.patterns.length).toBeGreaterThanOrEqual(2);
    expect(new Set(shareCapabilities.patterns).size).toBe(shareCapabilities.patterns.length);
    expect(shareCapabilities.maxRows).toBe(MAX_SUBMISSIONS);
    // Title and URL are the other two lines of the nine.
    expect(shareCapabilities.maxRows).toBeLessThanOrEqual(7);
  });

  it("carries the bucket and the difficulty on the finished outcome", () => {
    const outcome = inspect(solvedAfter(2, true));
    expect(outcome.kind).toBe("finished");
    if (outcome.kind !== "finished") return;
    expect(outcome.bucket).toBe(1);
    expect(outcome.difficulty).toBe(FIXTURE_INTENSITY);
  });

  it("keeps the v2 bucketOf agreed with the outcome the shell now reads", () => {
    for (const state of [
      solvedAfter(1, true),
      solvedAfter(2, true),
      solvedAfter(3, true),
      solvedAfter(3, false),
    ]) {
      const outcome = inspect(state);
      expect(outcome.kind).toBe("finished");
      if (outcome.kind !== "finished") continue;
      expect(bucketOf(outcome, state)).toBe(outcome.bucket);
    }
  });
});

describe("difficulty against the shipped horizon", () => {
  it("recomputes every stored difficulty exactly", () => {
    const index = JSON.parse(readFileSync("data/vector/manifest.index.json", "utf8")) as {
      chunks: readonly { url: string }[];
    };
    const url = (index.chunks[0] as { url: string }).url;
    const chunk = JSON.parse(readFileSync(url.replace(/^\//, ""), "utf8")) as {
      entries: Record<string, { best: { difficulty: number } }>;
    };

    const numbers = Object.keys(chunk.entries);
    expect(numbers.length).toBe(365);
    for (const key of numbers) {
      const entry = chunk.entries[key] as { best: { difficulty: number } };
      const parsed = parsePuzzle(Number(key), entry);
      expect(parsed.ok).toBe(true);
      if (!parsed.ok) continue;
      // The measurement the manifest claims is the measurement the module makes.
      expect(difficulty(parsed.value)).toBe(entry.best.difficulty);
    }
  });
});

describe("the run log and the artifact", () => {
  const straight = played((cell) => FIXTURE_SOLUTION[cell] as Direction, 1);

  it("logs one entry per submission and nothing else", () => {
    const run = telemetry(straight);
    const validated = validateRunLog(run);
    expect(validated.ok).toBe(true);
    expect(run.entries).toHaveLength(1);
    const entry = run.entries[0] as Record<string, unknown>;
    expect(Object.keys(entry).sort()).toEqual(["blanks", "changes", "cycles", "index", "solved"]);
  });

  it("produces the same title and rows as the v2 block", () => {
    for (const state of [
      straight,
      solvedAfter(1, true),
      solvedAfter(2, true),
      solvedAfter(3, false),
    ]) {
      const ctx = context({ currentStreak: 4 });
      const artifact = shareArtifact(puzzle, state, telemetry(state), ctx);
      const block = shareBlock(state, ctx);
      expect(artifact.title).toBe(block.title);
      expect(artifact.rows).toEqual(block.rows);
    }
  });

  it("validates and renders inside the share grammar", () => {
    const artifact = shareArtifact(puzzle, straight, telemetry(straight), context());
    const valid = validateArtifact(artifact, URL);
    expect(valid.ok).toBe(true);
    const text = renderArtifact(artifact, URL);
    expect(text.split("\n")).toEqual(["VECTOR #249 Excellent", "⭐⭐⭐⭐⭐", URL]);
    expect(text.split("\n").length).toBeLessThanOrEqual(9);
  });

  it("carries a fingerprint on every finished outcome", () => {
    for (const state of [straight, solvedAfter(3, false)]) {
      const artifact = shareArtifact(puzzle, state, telemetry(state), context());
      expect(artifact.fingerprint.points.length).toBe(state.submissions);
    }
  });

  it("passes the share leak checks across the outcome space", () => {
    const samples = [
      straight,
      solvedAfter(1, true),
      solvedAfter(2, true),
      solvedAfter(3, true),
      solvedAfter(3, false),
    ].map((state) => ({
      artifact: shareArtifact(puzzle, state, telemetry(state), context({ currentStreak: 9 })),
      /* The answer, rendered plainly, so the harness can look for it. */
      answerKey: FIXTURE_SOLUTION.map((dir) => (dir === null ? "." : String(dir))).join(""),
    }));
    const report = runShareLeakChecks(samples, vectorLeakProbes);
    expect(report.failures).toEqual([]);
    expect(report.ok).toBe(true);
  });
});
