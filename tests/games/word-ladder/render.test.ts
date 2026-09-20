// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MountContext } from "../../../src/contract/types.js";
import { internals } from "../../../src/games/word-ladder/module.js";
import { KEY_ROWS, climbSentence, mountWordLadder } from "../../../src/games/word-ladder/render.js";
import {
  applyAction,
  initialState,
  type WordLadderAction,
  type WordLadderPuzzle,
  type WordLadderState,
} from "../../../src/games/word-ladder/rules.js";
import { encodeLayout } from "../../../src/games/word-ladder/word-ladder-codec.js";

function puzzle(): WordLadderPuzzle {
  const parsed = internals.parsePuzzle(1, { layout: encodeLayout(1, "limp", "mare"), levers: ["par-4", "detour-0"] });
  if (!parsed.ok) throw new Error(parsed.error.detail);
  return parsed.value;
}

let hosts: HTMLElement[] = [];

function mount(readOnly = false) {
  const p = puzzle();
  const distanceToGoal = internals.distanceToGoalFor(p.goal);
  const host = document.createElement("div");
  document.body.appendChild(host);
  hosts.push(host);
  const announce = vi.fn();
  let current = initialState(p);
  const context: MountContext<WordLadderState, WordLadderAction, WordLadderPuzzle> = {
    puzzle: p,
    initial: current,
    dispatch(action) {
      const next = applyAction(current, action, distanceToGoal);
      if (next.ok) {
        current = next.value;
        view.update(current);
      }
    },
    announce,
    reducedMotion: true,
    readOnly,
  };
  const view = mountWordLadder(host, context);
  const cells = [...host.querySelectorAll<HTMLButtonElement>(".wl-cell")];
  const keys = [...host.querySelectorAll<HTMLButtonElement>(".wl-key")];
  const run = host.querySelector<HTMLButtonElement>(".wl-run");
  const undo = host.querySelector<HTMLButtonElement>(".wl-undo");
  const reveal = host.querySelector<HTMLButtonElement>(".wl-reveal");
  return { host, cells, keys, run, undo, reveal, announce, view, state: () => current, puzzle: p };
}

afterEach(() => {
  for (const host of hosts) host.remove();
  hosts = [];
});

/** Presses the alphabetical keys to arm a cell and type a full word, then Add. */
function typeWord(m: ReturnType<typeof mount>, word: string): void {
  const firstCell = m.cells[0];
  firstCell?.click(); // arm cell 0
  for (const letter of word) {
    m.keys.find((key) => key.dataset["letter"] === letter)?.click();
  }
  m.run?.click();
}

describe("WORD LADDER renderer", () => {
  it("renders four word cells, an alphabetical keyboard of 26 keys, and three controls", () => {
    const { cells, keys, run, undo, reveal } = mount();
    expect(cells).toHaveLength(4);
    expect(keys).toHaveLength(26);
    expect(run).not.toBeNull();
    expect(undo).not.toBeNull();
    expect(reveal).not.toBeNull();
  });

  it("lays the keyboard out at most seven keys across, so keys clear the tap floor", () => {
    /* WORD-LADDER.md 5: seven across at 360 px gives 46 px a key; ten would fail. */
    for (const rowLetters of KEY_ROWS) expect(rowLetters.length).toBeLessThanOrEqual(7);
    expect(KEY_ROWS.join("")).toBe("abcdefghijklmnopqrstuvwxyz");
  });

  it("labels the current word cells for a screen reader, never colour alone", () => {
    const { cells } = mount();
    expect(cells[0]?.getAttribute("aria-label")).toMatch(/Letter 1: L/);
  });

  it("climbs a valid rung and announces it", () => {
    const m = mount();
    typeWord(m, "lime"); // one change from limp
    expect(m.state().rungs.map((r) => r.word)).toEqual(["lime"]);
    expect(m.announce).toHaveBeenCalled();
  });

  it("undo removes the last rung and reveal locks the board", () => {
    const m = mount();
    typeWord(m, "lime");
    m.undo?.click();
    expect(m.state().rungs).toHaveLength(0);
    m.reveal?.click();
    expect(m.state().revealed).toBe(true);
    for (const key of m.keys) expect(key.disabled).toBe(true);
    for (const cell of m.cells) expect(cell.disabled).toBe(true);
  });

  it("a read only mount never dispatches", () => {
    const m = mount(true);
    typeWord(m, "lime");
    expect(m.state().rungs).toHaveLength(0);
  });

  it("climbSentence reports the current word and goal while playing", () => {
    const m = mount();
    expect(climbSentence(m.state())).toMatch(/LIMP.*MARE/);
  });
});
