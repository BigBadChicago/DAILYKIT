import { describe, expect, it } from "vitest";

import { intBelow } from "../../../src/core/rng.js";
import { rngFromSeed, seedFor } from "../../../src/core/seed.js";
import { arrangementKey, PIECES } from "../../../src/games/rotate-lock/route.js";
import {
  MOVE_CAP,
  applyAction,
  bucketFor,
  decodeMoves,
  encodeMoves,
  initialState,
  inspect,
  isTerminal,
  layoutProblem,
  makePuzzle,
  replay,
  tierFor,
  type RotateLockAction,
  type RotateLockPuzzle,
} from "../../../src/games/rotate-lock/rules.js";
import { IDLE_ROTATE, fixturePuzzle, openingsOf, play, solvingLine } from "./fixtures.js";

const puzzle = fixturePuzzle();

/** A puzzle whose tray is `extra` clockwise turns of piece 6 away from its
 *  nearest opening, so par is known by construction. */
function withPar(): RotateLockPuzzle {
  const opening = openingsOf(puzzle)[0];
  if (opening === undefined) throw new Error("no opening");
  const facing = opening.facing.slice();
  facing[2] = ((facing[2] as number) + 3) % 4 as 0 | 1 | 2 | 3;
  const order = opening.order.slice();
  const a = order[0] as number;
  order[0] = order[6] as number;
  order[6] = a;
  const made = makePuzzle(9, puzzle, { order, facing }, []);
  if (!made.ok) throw new Error(made.error.detail);
  return made.value;
}

describe("ROTATE LOCK refusals, every code", () => {
  it("refuses a piece that is not in the tray", () => {
    const start = initialState(puzzle);
    for (const action of [
      { kind: "rotate", piece: -1 },
      { kind: "rotate", piece: PIECES },
      { kind: "rotate", piece: 1.5 },
      { kind: "swap", a: 0, b: 7 },
      { kind: "swap", a: Number.NaN, b: 1 },
    ] as RotateLockAction[]) {
      expect(applyAction(start, action)).toMatchObject({ ok: false, error: { code: "unknown-piece" } });
    }
  });

  it("refuses a swap of a piece with itself", () => {
    expect(applyAction(initialState(puzzle), { kind: "swap", a: 3, b: 3 })).toMatchObject({
      ok: false,
      error: { code: "same-piece", announce: "Choose two different pieces to swap." },
    });
  });

  it("refuses any move once the lock is open or jammed", () => {
    const opened = play(puzzle, solvingLine(puzzle));
    expect(opened.open).toBe(true);
    expect(applyAction(opened, IDLE_ROTATE)).toMatchObject({ ok: false, error: { code: "game-over" } });
    const jammed = play(puzzle, new Array<RotateLockAction>(MOVE_CAP).fill({ kind: "swap", a: 5, b: 6 }));
    expect(jammed.open).toBe(false);
    expect(applyAction(jammed, IDLE_ROTATE)).toMatchObject({ ok: false, error: { code: "game-over" } });
  });
});

describe("ROTATE LOCK moves", () => {
  it("swaps two pieces wherever they sit and rotates one clockwise", () => {
    const swapped = play(puzzle, [{ kind: "swap", a: 0, b: 6 }]);
    expect(swapped.order).toEqual([1, 6, 2, 3, 4, 5, 0]);
    const turned = play(puzzle, [{ kind: "rotate", piece: 3 }, { kind: "rotate", piece: 3 }]);
    expect(turned.facing[3]).toBe(1);
    expect(turned.moves).toHaveLength(2);
  });

  it("marks a move back into an arrangement already seen as a revisit", () => {
    const state = play(puzzle, [
      { kind: "swap", a: 5, b: 6 },
      { kind: "swap", a: 5, b: 6 },
      { kind: "rotate", piece: 4 },
      { kind: "rotate", piece: 4 },
      { kind: "rotate", piece: 4 },
      { kind: "rotate", piece: 4 },
    ]);
    expect(state.moves.map((move) => move.revisit)).toEqual([false, true, false, false, false, true]);
    expect(state.history).toHaveLength(7);
  });

  it("opens at par along the shortest line and grades it Excellent", () => {
    const line = solvingLine(puzzle);
    expect(line).toHaveLength(puzzle.par);
    expect(isTerminal(play(puzzle, line.slice(0, -1)))).toBe(false);
    const opened = play(puzzle, line);
    expect(inspect(opened)).toEqual({
      kind: "finished",
      score: 3,
      won: true,
      detail: "Opened in 3 moves, par 3",
      tier: 0,
      bucket: 0,
      difficulty: puzzle.difficulty,
    });
  });

  it("tiers by moves over par at the edges 0, 4 and 10, and jams at the cap", () => {
    const target = withPar();
    const expected = (over: number): number => (over === 0 ? 0 : over <= 4 ? 1 : over <= 10 ? 2 : 3);
    const seen = new Set<number>();
    const rng = rngFromSeed(seedFor("rotate-lock", 1, "tier-edges"));
    for (let run = 0; run < 400; run += 1) {
      const prefix: RotateLockAction[] = [];
      const detour = intBelow(rng, 12);
      for (let step = 0; step < detour; step += 1) {
        prefix.push(intBelow(rng, 2) === 0 ? { kind: "swap", a: intBelow(rng, 3), b: 3 + intBelow(rng, 4) } : { kind: "rotate", piece: intBelow(rng, 7) });
      }
      const midway = replay(target, prefix);
      if (midway === null || midway.open) continue;
      const line = solvingLine({ ...target, startOrder: midway.order, startFacing: midway.facing });
      const state = play(target, [...prefix, ...line]);
      expect(state.open).toBe(true);
      const over = state.moves.length - target.par;
      expect([tierFor(state), bucketFor(state)]).toEqual([expected(over), expected(over)]);
      seen.add(over);
    }
    for (const edge of [0, 4, 5, 10, 11]) expect(seen.has(edge), `over ${String(edge)}`).toBe(true);
    const jammed = play(target, new Array<RotateLockAction>(MOVE_CAP).fill(IDLE_ROTATE));
    expect(isTerminal(jammed)).toBe(true);
    expect(inspect(jammed)).toMatchObject({ won: false, tier: 4, bucket: 4, detail: `Jammed after 56 moves, par ${String(target.par)}` });
  });
});

describe("ROTATE LOCK puzzles", () => {
  it("refuses a malformed layout, a board with several routes and an already open tray", () => {
    const start = { order: puzzle.startOrder, facing: puzzle.startFacing };
    expect(layoutProblem({ ...puzzle, lock: puzzle.start }, start)).toMatch(/distinct/);
    expect(layoutProblem({ ...puzzle, marks: [10, 4] }, start)).toMatch(/ascending/);
    expect(layoutProblem({ ...puzzle, lengths: [1, 1] }, start)).toMatch(/pieces/);
    expect(layoutProblem({ ...puzzle, lengths: [4, 1, 1, 1, 1, 1, 1] }, start)).toMatch(/length/);
    expect(layoutProblem(puzzle, { ...start, order: [0, 0, 1, 2, 3, 4, 5] })).toMatch(/permutation/);
    expect(layoutProblem(puzzle, { ...start, facing: [0, 0, 0, 0, 0, 0, 4 as 0] })).toMatch(/facing/);
    expect(makePuzzle(1, { ...puzzle, marks: [] }, start, []).ok).toBe(false);
    const opening = openingsOf(puzzle)[0];
    expect(makePuzzle(1, puzzle, opening ?? start, [])).toMatchObject({ ok: false, error: { detail: "the tray already opens the lock" } });
  });

  it("encodes moves in two characters each and replays them exactly", () => {
    const actions: RotateLockAction[] = [{ kind: "swap", a: 0, b: 6 }, { kind: "rotate", piece: 2 }];
    const state = play(puzzle, actions);
    expect(encodeMoves(state.moves)).toBe("06r2");
    expect(decodeMoves("06r2")).toEqual(actions);
    expect(replay(puzzle, actions)).toEqual(state);
    for (const bad of ["0", "x1", "rr", "0a", "r0".repeat(MOVE_CAP + 1)]) expect(decodeMoves(bad)).toBeNull();
    expect(replay(puzzle, [{ kind: "swap", a: 1, b: 1 }])).toBeNull();
  });

  /* Section 10 property test: no sequence of actions, legal or not, reaches a
     state that breaks the invariants. */
  it("never reaches an invalid state under random play", () => {
    const rng = rngFromSeed(seedFor("rotate-lock", 1, "rules-property"));
    for (let game = 0; game < 60; game += 1) {
      let state = initialState(puzzle);
      for (let step = 0; step < 90; step += 1) {
        const pick = intBelow(rng, 3);
        const action: RotateLockAction =
          pick === 0
            ? { kind: "rotate", piece: intBelow(rng, 9) - 1 }
            : { kind: "swap", a: intBelow(rng, 8), b: intBelow(rng, 8) };
        const next = applyAction(state, action);
        if (next.ok) state = next.value;
        expect(new Set(state.order).size).toBe(PIECES);
        expect(state.moves.length).toBeLessThanOrEqual(MOVE_CAP);
        expect(state.history).toHaveLength(state.moves.length + 1);
        expect(state.history.at(-1)).toBe(arrangementKey(state));
        expect(isTerminal(state)).toBe(state.open || state.moves.length === MOVE_CAP);
      }
    }
  });
});
