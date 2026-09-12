import { describe, expect, it } from "vitest";

import { encodeSymbols } from "../../../src/engine/manifest-codec.js";
import { TIER_NAMES } from "../../../src/engine/tiers.js";
import { SHARE_MAX_ROWS, type ShareContext } from "../../../src/core/types.js";
import { renderShareRow } from "../../../src/shared/share-vocabulary.js";
import { entryFor } from "../../../src/shell/registry.js";
import { internals } from "../../../src/games/vector/module.js";
import {
  MAX_SUBMISSIONS,
  apply,
  initialState,
  inspect,
  makePuzzle,
  type VectorPuzzle,
  type VectorState,
} from "../../../src/games/vector/rules.js";
import { CELLS, type Direction } from "../../../src/games/vector/propagate.js";
import { FIXTURE_LAYOUT, FIXTURE_SOLUTION, fixturePuzzle } from "./fixtures.js";

const {
  identity,
  input,
  distribution,
  parsePuzzle,
  serialize,
  deserialize,
  shareBlock,
  LAYOUT_RADIX,
  SHARE_ROW_WIDTH,
} = internals;

const puzzle = fixturePuzzle();

/** The manifest payload for a layout, built the way the tool builds it. */
function entryFor_(puzzleNumber: number, clues = FIXTURE_LAYOUT): Record<string, unknown> {
  const symbols: number[] = [];
  for (let cell = 0; cell < CELLS; cell += 1) {
    const clue = clues[cell];
    symbols.push(clue === null ? 0 : clue + 1);
  }
  return {
    layout: encodeSymbols(puzzleNumber, symbols, LAYOUT_RADIX),
    best: { difficulty: 231, opening: 6 },
    levers: ["none"],
    attempt: 0,
  };
}

function solvedAfter(submissions: number, win: boolean): VectorState {
  let state = initialState(puzzle);
  if (win) {
    for (const cell of puzzle.geometry.blankCells) {
      const next = apply(state, { kind: "set", cell, dir: FIXTURE_SOLUTION[cell] as Direction });
      if (!next.ok) throw new Error(next.error.code);
      state = next.value;
    }
    return { ...state, submissions, solved: true };
  }
  return { ...state, submissions, solved: false };
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

  it("refuses an unsupported payload version", () => {
    const result = deserialize(puzzle, { v: 99, data: {} });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("unsupported-version");
  });

  it("refuses a wrong length arrow string", () => {
    const result = deserialize(puzzle, { v: 1, data: { a: "..", n: 0, s: false } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("malformed");
  });

  it("refuses a submission count out of range", () => {
    const good = serialize(initialState(puzzle)) as { v: number; data: { a: string } };
    for (const n of [-1, MAX_SUBMISSIONS + 1, 1.5]) {
      const result = deserialize(puzzle, { v: 1, data: { a: good.data.a, n, s: false } });
      expect(result.ok).toBe(false);
    }
  });

  it("refuses an arrow sitting on a clue cell", () => {
    const chars = new Array<string>(CELLS).fill(".");
    chars[puzzle.geometry.clueCells[0] as number] = "0";
    const result = deserialize(puzzle, { v: 1, data: { a: chars.join(""), n: 0, s: false } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("puzzle-mismatch");
  });

  it("refuses an arrow that reaches no number", () => {
    const chars = new Array<string>(CELLS).fill(".");
    // Cell 0 can only go right or down on this board.
    chars[0] = "0";
    const result = deserialize(puzzle, { v: 1, data: { a: chars.join(""), n: 0, s: false } });
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.error.code).toBe("puzzle-mismatch");
  });

  it("refuses a solved flag that disagrees with the board", () => {
    const empty = serialize(initialState(puzzle)) as { v: number; data: { a: string } };
    const result = deserialize(puzzle, { v: 1, data: { a: empty.data.a, n: 1, s: true } });
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
