import { describe, expect, it } from "vitest";

import type { Rejection } from "../../../src/core/types.js";
import type { Result } from "../../../src/core/result.js";
import {
  CELLS,
  DOWN,
  LEFT,
  RIGHT,
  UP,
  candidateList,
  type Direction,
} from "../../../src/games/vector/propagate.js";
import {
  MAX_SUBMISSIONS,
  REJECTIONS,
  apply,
  bucketFor,
  candidatesFor,
  initialState,
  inspect,
  isComplete,
  isSatisfied,
  tierFor,
  type VectorAction,
  type VectorState,
} from "../../../src/games/vector/rules.js";
import { FIXTURE_SOLUTION, fixturePuzzle } from "./fixtures.js";

const puzzle = fixturePuzzle();

function value(result: Result<VectorState, Rejection>): VectorState {
  if (!result.ok) throw new Error(`expected ok, got ${result.error.code}`);
  return result.value;
}

function code(result: Result<VectorState, Rejection>): string {
  if (result.ok) throw new Error("expected a rejection");
  return result.error.code;
}

function run(state: VectorState, actions: readonly VectorAction[]): VectorState {
  let at = state;
  for (const action of actions) at = value(apply(at, action));
  return at;
}

/** The solution, placed cell by cell. */
function solved(): VectorState {
  let state = initialState(puzzle);
  for (const cell of puzzle.geometry.blankCells) {
    state = value(apply(state, { kind: "set", cell, dir: FIXTURE_SOLUTION[cell] as Direction }));
  }
  return state;
}

/** Complete and wrong. Every blank takes its first candidate. */
function firstCandidateBoard(): VectorState {
  let state = initialState(puzzle);
  for (const cell of puzzle.geometry.blankCells) {
    const dir = candidatesFor(puzzle, cell)[0] as Direction;
    state = value(apply(state, { kind: "set", cell, dir }));
  }
  return state;
}

describe("initialState", () => {
  it("starts empty, unsolved, with no submissions spent", () => {
    const state = initialState(puzzle);
    expect(state.arrows).toHaveLength(CELLS);
    expect(state.arrows.every((dir) => dir === null)).toBe(true);
    expect(state.submissions).toBe(0);
    expect(state.solved).toBe(false);
    expect(isComplete(state)).toBe(false);
  });
});

describe("cycle", () => {
  it("advances through the cell's candidates and back to empty", () => {
    const cell = 0;
    const list = candidateList(puzzle.geometry, cell);
    let state = initialState(puzzle);
    for (const dir of list) {
      state = value(apply(state, { kind: "cycle", cell }));
      expect(state.arrows[cell]).toBe(dir);
    }
    state = value(apply(state, { kind: "cycle", cell }));
    expect(state.arrows[cell]).toBe(null);
  });

  it("touches no other cell", () => {
    const state = run(initialState(puzzle), [{ kind: "cycle", cell: 0 }]);
    for (let cell = 1; cell < CELLS; cell += 1) expect(state.arrows[cell]).toBe(null);
  });
});

describe("set", () => {
  it("writes a candidate direction", () => {
    const state = value(apply(initialState(puzzle), { kind: "set", cell: 0, dir: RIGHT }));
    expect(state.arrows[0]).toBe(RIGHT);
  });

  it("overwrites rather than refusing", () => {
    const state = run(initialState(puzzle), [
      { kind: "set", cell: 0, dir: RIGHT },
      { kind: "set", cell: 0, dir: DOWN },
    ]);
    expect(state.arrows[0]).toBe(DOWN);
  });

  it("clears on null", () => {
    const state = run(initialState(puzzle), [
      { kind: "set", cell: 0, dir: RIGHT },
      { kind: "set", cell: 0, dir: null },
    ]);
    expect(state.arrows[0]).toBe(null);
  });
});

describe("rejections, every path", () => {
  it("cell-range on a cell that is not on the board", () => {
    expect(code(apply(initialState(puzzle), { kind: "cycle", cell: CELLS }))).toBe(
      REJECTIONS.cellRange.code,
    );
    expect(code(apply(initialState(puzzle), { kind: "set", cell: -1, dir: UP }))).toBe(
      REJECTIONS.cellRange.code,
    );
  });

  it("not-a-blank on a clue cell", () => {
    const clue = puzzle.geometry.clueCells[0];
    expect(code(apply(initialState(puzzle), { kind: "cycle", cell: clue }))).toBe(
      REJECTIONS.notABlank.code,
    );
    expect(code(apply(initialState(puzzle), { kind: "set", cell: clue, dir: UP }))).toBe(
      REJECTIONS.notABlank.code,
    );
  });

  it("not-a-candidate on a direction that reaches no number", () => {
    // Cell 0 can only go right or down.
    expect(code(apply(initialState(puzzle), { kind: "set", cell: 0, dir: UP }))).toBe(
      REJECTIONS.notACandidate.code,
    );
    expect(code(apply(initialState(puzzle), { kind: "set", cell: 0, dir: LEFT }))).toBe(
      REJECTIONS.notACandidate.code,
    );
  });

  it("incomplete on a submit with a blank left empty", () => {
    expect(code(apply(initialState(puzzle), { kind: "submit" }))).toBe(
      REJECTIONS.incomplete.code,
    );
  });

  it("incomplete does not spend a submission", () => {
    const state = initialState(puzzle);
    expect(apply(state, { kind: "submit" }).ok).toBe(false);
    expect(state.submissions).toBe(0);
  });

  it("game-over on any action once the puzzle is won", () => {
    const won = value(apply(solved(), { kind: "submit" }));
    expect(code(apply(won, { kind: "cycle", cell: 0 }))).toBe(REJECTIONS.gameOver.code);
    expect(code(apply(won, { kind: "set", cell: 0, dir: RIGHT }))).toBe(REJECTIONS.gameOver.code);
    expect(code(apply(won, { kind: "submit" }))).toBe(REJECTIONS.gameOver.code);
  });

  it("game-over on any action once the submissions are spent", () => {
    let state = firstCandidateBoard();
    for (let n = 0; n < MAX_SUBMISSIONS; n += 1) state = value(apply(state, { kind: "submit" }));
    expect(code(apply(state, { kind: "cycle", cell: 0 }))).toBe(REJECTIONS.gameOver.code);
  });

  it("gives every rejection a distinct code and a plain sentence", () => {
    const codes = Object.values(REJECTIONS).map((rejection) => rejection.code);
    expect(new Set(codes).size).toBe(codes.length);
    for (const rejection of Object.values(REJECTIONS)) {
      expect(rejection.announce.length).toBeGreaterThan(0);
      expect(rejection.announce.endsWith(".")).toBe(true);
    }
  });
});

describe("submit", () => {
  it("wins on a board that satisfies every clue", () => {
    const state = value(apply(solved(), { kind: "submit" }));
    expect(state.solved).toBe(true);
    expect(state.submissions).toBe(1);
  });

  it("spends a submission on a complete but wrong board", () => {
    const wrong = firstCandidateBoard();
    expect(isComplete(wrong)).toBe(true);
    expect(isSatisfied(wrong)).toBe(false);
    const state = value(apply(wrong, { kind: "submit" }));
    expect(state.solved).toBe(false);
    expect(state.submissions).toBe(1);
  });

  it("still wins on the last submission", () => {
    let state = firstCandidateBoard();
    state = value(apply(state, { kind: "submit" }));
    state = value(apply(state, { kind: "submit" }));
    for (const cell of puzzle.geometry.blankCells) {
      state = value(apply(state, { kind: "set", cell, dir: FIXTURE_SOLUTION[cell] as Direction }));
    }
    state = value(apply(state, { kind: "submit" }));
    expect(state.solved).toBe(true);
    expect(state.submissions).toBe(MAX_SUBMISSIONS);
  });
});

describe("terminal detection", () => {
  it("is ongoing until a submission decides it", () => {
    expect(inspect(initialState(puzzle)).kind).toBe("ongoing");
    expect(inspect(solved()).kind).toBe("ongoing");
  });

  it("finishes a win with the submission count as the score", () => {
    const outcome = inspect(value(apply(solved(), { kind: "submit" })));
    expect(outcome).toEqual({
      kind: "finished",
      score: 1,
      won: true,
      tier: 0,
      detail: "Solved on submission 1",
    });
  });

  it("finishes a loss after three spent submissions", () => {
    let state = firstCandidateBoard();
    for (let n = 0; n < MAX_SUBMISSIONS; n += 1) state = value(apply(state, { kind: "submit" }));
    expect(inspect(state)).toEqual({
      kind: "finished",
      score: 0,
      won: false,
      tier: 4,
      detail: "Not solved",
    });
  });

  it("maps every outcome to a tier and a bucket", () => {
    const expected: readonly [number, number][] = [
      [1, 0],
      [2, 1],
      [3, 2],
    ];
    for (const [submissions, tier] of expected) {
      const state: VectorState = { puzzle, arrows: FIXTURE_SOLUTION, submissions, solved: true };
      expect(tierFor(state)).toBe(tier);
      expect(bucketFor(state)).toBe(submissions - 1);
    }
    const lost: VectorState = { puzzle, arrows: FIXTURE_SOLUTION, submissions: 3, solved: false };
    expect(tierFor(lost)).toBe(4);
    expect(bucketFor(lost)).toBe(3);
  });
});

describe("property, no action sequence reaches an invalid state", () => {
  it("holds over five hundred random sequences", () => {
    let seed = 0x9e3779b9;
    const next = (): number => {
      seed ^= seed << 13;
      seed >>>= 0;
      seed ^= seed >>> 17;
      seed ^= seed << 5;
      seed >>>= 0;
      return seed;
    };
    const pick = <T,>(list: readonly T[]): T => list[next() % list.length] as T;
    const dirs: readonly (Direction | null)[] = [UP, RIGHT, DOWN, LEFT, null];

    for (let run = 0; run < 500; run += 1) {
      let state = initialState(puzzle);
      for (let step = 0; step < 60; step += 1) {
        const roll = next() % 10;
        const action: VectorAction =
          roll < 5
            ? { kind: "cycle", cell: next() % CELLS }
            : roll < 8
              ? { kind: "set", cell: next() % CELLS, dir: pick(dirs) }
              : { kind: "submit" };
        const result = apply(state, action);
        if (result.ok) state = result.value;

        expect(state.arrows).toHaveLength(CELLS);
        for (const cell of puzzle.geometry.clueCells) expect(state.arrows[cell]).toBe(null);
        for (const cell of puzzle.geometry.blankCells) {
          const dir = state.arrows[cell];
          if (dir !== null) expect(candidatesFor(puzzle, cell)).toContain(dir);
        }
        expect(state.submissions).toBeGreaterThanOrEqual(0);
        expect(state.submissions).toBeLessThanOrEqual(MAX_SUBMISSIONS);
        if (state.solved) {
          expect(state.submissions).toBeGreaterThanOrEqual(1);
          expect(isSatisfied(state)).toBe(true);
        }
      }
    }
  });
});
