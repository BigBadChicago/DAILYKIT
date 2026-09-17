import { firstSessionPuzzle } from "../../../src/games/rotate-lock/generator.js";
import type { Arrangement, Layout } from "../../../src/games/rotate-lock/route.js";
import { applyAction, initialState, type RotateLockAction, type RotateLockPuzzle, type RotateLockState } from "../../../src/games/rotate-lock/rules.js";
import { arrangementsFor, solve } from "../../../src/games/rotate-lock/solver.js";

/** The tutorial board: start 0, lock 1, marks 4, 6 and 10, par 3. */
export function fixturePuzzle(): RotateLockPuzzle {
  return firstSessionPuzzle();
}

export function openingsOf(layout: Layout): Arrangement[] {
  const route = solve(layout).routes[0];
  if (route === undefined) throw new Error("fixture layout has no route");
  return arrangementsFor(layout, route);
}

export function play(puzzle: RotateLockPuzzle, actions: readonly RotateLockAction[]): RotateLockState {
  let state = initialState(puzzle);
  for (const action of actions) {
    const next = applyAction(state, action);
    if (!next.ok) throw new Error(`${next.error.code} on ${JSON.stringify(action)}`);
    state = next.value;
  }
  return state;
}

/** Moves that take the start arrangement to the given target: swaps by cycle,
 *  then clockwise turns. Exactly par moves when the target is the nearest one. */
export function movesTo(from: Arrangement, to: Arrangement): RotateLockAction[] {
  const actions: RotateLockAction[] = [];
  const order = from.order.slice();
  for (let slot = 0; slot < order.length; slot += 1) {
    const want = to.order[slot] as number;
    if (order[slot] !== want) {
      actions.push({ kind: "swap", a: order[slot] as number, b: want });
      const other = order.indexOf(want);
      order[other] = order[slot] as number;
      order[slot] = want;
    }
  }
  for (let id = 0; id < from.facing.length; id += 1) {
    const turns = ((to.facing[id] as number) - (from.facing[id] as number) + 4) % 4;
    for (let t = 0; t < turns; t += 1) actions.push({ kind: "rotate", piece: id });
  }
  return actions;
}

/** A shortest solving line for the puzzle. */
export function solvingLine(puzzle: RotateLockPuzzle): RotateLockAction[] {
  const start = { order: puzzle.startOrder, facing: puzzle.startFacing };
  let best: RotateLockAction[] | null = null;
  for (const target of openingsOf(puzzle)) {
    const line = movesTo(start, target);
    if (best === null || line.length < best.length) best = line;
  }
  return best ?? [];
}

/** A move that changes the arrangement without opening it: rotate a piece. */
export const IDLE_ROTATE: RotateLockAction = { kind: "rotate", piece: 6 };
