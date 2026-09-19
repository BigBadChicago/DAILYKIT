import { describe, expect, it } from "vitest";

import { MAX_RUNS, diffsOf, relayDepth } from "../../../src/games/difference-relay/relay.js";
import {
  applyAction,
  buildState,
  bucketFor,
  finishedOutcomeFor,
  initialState,
  isTerminal,
  makePuzzle,
  tierFor,
  type DifferenceRelayPuzzle,
  type DifferenceRelayState,
} from "../../../src/games/difference-relay/rules.js";

/* A real Monday board: unique, fair, par 1, two hidden gaps. */
const TARGET = [6, 9, 7, 2, 1, 5];
const MARKS = [3, 2, null, null, 4];
const START = [7, 1, 9, 6, 2, 5];

function puzzle(): DifferenceRelayPuzzle {
  const made = makePuzzle(1, TARGET, MARKS, START, ["range-wide", "hidden-2"]);
  if (!made.ok) throw new Error(made.error.detail);
  return made.value;
}

/** A state with a chosen current order and no runs. */
function withOrder(order: readonly number[]): DifferenceRelayState {
  return { puzzle: puzzle(), order: order.slice(), runs: [], won: false };
}

describe("DIFFERENCE RELAY makePuzzle", () => {
  it("builds a unique, fair board and derives its par and difficulty", () => {
    const p = puzzle();
    expect(p.numbers).toEqual([1, 2, 5, 6, 7, 9]);
    expect(p.par).toBeGreaterThanOrEqual(1);
    expect(p.par).toBeLessThanOrEqual(MAX_RUNS);
    expect(p.difficulty).toBeGreaterThan(0);
  });

  it("refuses a board with more than one order, one the visible marks already pin, and a board with no hidden gap", () => {
    const monotone = makePuzzle(1, [1, 2, 3, 4, 5, 6], [1, 1, 1, 1, null], [2, 1, 3, 4, 5, 6], []);
    expect(monotone).toMatchObject({ ok: false });
    if (!monotone.ok) expect(monotone.error.detail).toContain("orders satisfy the marks");

    const pinned = makePuzzle(1, [2, 9, 4, 8, 1, 7], [7, 5, 4, 7, null], [1, 2, 4, 7, 8, 9], []);
    expect(pinned).toMatchObject({ ok: false });
    if (!pinned.ok) expect(pinned.error.detail).toContain("visible marks alone");

    const noHidden = makePuzzle(1, TARGET, diffsOf(TARGET), START, []);
    expect(noHidden).toMatchObject({ ok: false });
    if (!noHidden.ok) expect(noHidden.error.detail).toContain("hidden");
  });
});

describe("DIFFERENCE RELAY actions", () => {
  it("swaps by number identity for free and never as a run", () => {
    const swapped = applyAction(initialState(puzzle()), { kind: "swap", a: 7, b: 1 });
    expect(swapped.ok).toBe(true);
    if (swapped.ok) {
      expect(swapped.value.runs).toHaveLength(0);
      expect(swapped.value.order.indexOf(7)).toBe(START.indexOf(1));
      expect(swapped.value.order.indexOf(1)).toBe(START.indexOf(7));
    }
  });

  it("refuses an unknown number, a swap of one number with itself, a repeated run and any action once finished", () => {
    const start = initialState(puzzle());
    expect(applyAction(start, { kind: "swap", a: 7, b: 3 })).toMatchObject({ ok: false, error: { code: "unknown-token" } });
    expect(applyAction(start, { kind: "swap", a: 7, b: 7 })).toMatchObject({ ok: false, error: { code: "same-token" } });

    const afterRun = applyAction(start, { kind: "run" });
    expect(afterRun.ok).toBe(true);
    if (afterRun.ok) {
      expect(applyAction(afterRun.value, { kind: "run" })).toMatchObject({ ok: false, error: { code: "repeat-run" } });
    }

    const won = withOrder(TARGET);
    const win = applyAction(won, { kind: "run" });
    expect(win.ok).toBe(true);
    if (win.ok) {
      expect(win.value.won).toBe(true);
      expect(applyAction(win.value, { kind: "run" })).toMatchObject({ ok: false, error: { code: "game-over" } });
    }
  });

  it("opens the line only when the current order matches the target's differences", () => {
    const trueDiffs = diffsOf(TARGET);
    expect(relayDepth(TARGET, trueDiffs)).toBe(5);
    const run = applyAction(withOrder(TARGET), { kind: "run" });
    expect(run.ok && run.value.won).toBe(true);
    const miss = applyAction(withOrder(START), { kind: "run" });
    expect(miss.ok && miss.value.won).toBe(false);
  });

  it("ends the day after six runs without a win", () => {
    const numbers = puzzle().numbers;
    /* Six distinct non winning orders: rotations of the numbers, none the target. */
    const orders = [
      [1, 2, 5, 6, 7, 9],
      [2, 5, 6, 7, 9, 1],
      [5, 6, 7, 9, 1, 2],
      [6, 7, 9, 1, 2, 5],
      [7, 9, 1, 2, 5, 6],
      [9, 1, 2, 5, 6, 7],
    ];
    expect(orders.every((order) => order.every((n) => numbers.includes(n)))).toBe(true);
    const state = buildState(puzzle(), orders[5] as number[], orders);
    expect(state).not.toBeNull();
    if (state) {
      expect(state.won).toBe(false);
      expect(isTerminal(state)).toBe(true);
      expect(bucketFor(state)).toBe(MAX_RUNS);
      expect(tierFor(state)).toBe(4);
    }
  });
});

describe("DIFFERENCE RELAY grading", () => {
  const p: DifferenceRelayPuzzle = { ...puzzle(), par: 2 };

  function won(runs: number): DifferenceRelayState {
    const orders = Array.from({ length: runs }, (_, i) => [i, ...p.numbers]);
    /* Only the fields the grade reads matter here. */
    return {
      puzzle: p,
      order: p.target.slice(),
      runs: orders.map((_, i) => ({ order: p.target.slice(), depth: i === runs - 1 ? 5 : 0 })),
      won: true,
    };
  }

  it("tiers by runs against par and buckets by the raw run count", () => {
    expect([tierFor(won(1)), bucketFor(won(1))]).toEqual([0, 0]);
    expect([tierFor(won(2)), bucketFor(won(2))]).toEqual([0, 1]);
    expect([tierFor(won(3)), bucketFor(won(3))]).toEqual([1, 2]);
    expect([tierFor(won(4)), bucketFor(won(4))]).toEqual([2, 3]);
    expect([tierFor(won(6)), bucketFor(won(6))]).toEqual([3, 5]);
  });

  it("grades a finished outcome with its bucket and difficulty", () => {
    const outcome = finishedOutcomeFor(won(2));
    expect(outcome).toMatchObject({ kind: "finished", won: true, score: 2, tier: 0, bucket: 1, difficulty: p.difficulty });
  });
});

describe("DIFFERENCE RELAY buildState", () => {
  it("rebuilds a valid game and refuses one no legal game could reach", () => {
    const p = puzzle();
    expect(buildState(p, p.startOrder, [])).not.toBeNull();
    /* A run that is not a permutation of the numbers. */
    expect(buildState(p, p.startOrder, [[1, 1, 1, 1, 1, 1]])).toBeNull();
    /* A win that is not the last run. */
    expect(buildState(p, p.startOrder, [p.target.slice(), p.startOrder.slice()])).toBeNull();
    /* The same run twice. */
    expect(buildState(p, p.startOrder, [p.startOrder.slice(), p.startOrder.slice()])).toBeNull();
    /* More runs than the budget. */
    const many = Array.from({ length: MAX_RUNS + 1 }, (_, i) => [...p.numbers.slice(i % 6), ...p.numbers.slice(0, i % 6)]);
    expect(buildState(p, p.startOrder, many)).toBeNull();
  });

  it("never reaches a state with a repeated run or more runs than allowed", () => {
    const p = puzzle();
    let state = initialState(p);
    const perms = [
      [1, 2, 5, 6, 7, 9],
      [9, 7, 6, 5, 2, 1],
      [2, 1, 5, 6, 7, 9],
    ];
    for (let step = 0; step < 30; step += 1) {
      const order = perms[step % perms.length] as number[];
      state = { ...state, order };
      const next = applyAction(state, { kind: "run" });
      if (next.ok) state = next.value;
    }
    expect(new Set(state.runs.map((run) => run.order.join(","))).size).toBe(state.runs.length);
    expect(state.runs.length).toBeLessThanOrEqual(MAX_RUNS);
  });
});
