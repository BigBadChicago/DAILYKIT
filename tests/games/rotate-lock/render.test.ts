// @vitest-environment jsdom
/**
 * ROTATE LOCK's accessibility contract, the evidence for gate step
 * accessibility-contract. ROTATE-LOCK.md sections 5 and 13.
 */
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MountContext } from "../../../src/contract/types.js";
import { CELLS, PIECES, trace } from "../../../src/games/rotate-lock/route.js";
import { boardDescription, mountRotateLock, routeSentence } from "../../../src/games/rotate-lock/render.js";
import {
  applyAction,
  initialState,
  type RotateLockAction,
  type RotateLockPuzzle,
  type RotateLockState,
} from "../../../src/games/rotate-lock/rules.js";
import { fixturePuzzle, openingsOf, solvingLine } from "./fixtures.js";

const puzzle = fixturePuzzle();
let hosts: HTMLElement[] = [];

/** Synchronous like the shell, which applies and calls update inside dispatch. */
function mount(initial: RotateLockState = initialState(puzzle), readOnly = false) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  hosts.push(host);
  const announce = vi.fn();
  const rejected: string[] = [];
  let current = initial;
  const context: MountContext<RotateLockState, RotateLockAction, RotateLockPuzzle> = {
    puzzle,
    initial,
    dispatch(action) {
      const result = applyAction(current, action);
      if (result.ok) {
        current = result.value;
        view.update(current);
      } else {
        rejected.push(result.error.code);
      }
    },
    announce,
    reducedMotion: true,
    readOnly,
  };
  const view = mountRotateLock(host, context);
  const pieces = [...host.querySelectorAll<HTMLButtonElement>(".rl-piece")];
  const cells = [...host.querySelectorAll<HTMLElement>(".rl-cell")];
  const rotate = host.querySelector<HTMLButtonElement>(".rl-rotate")!;
  const status = host.querySelector<HTMLElement>(".rl-status")!;
  const tray = host.querySelector<HTMLElement>(".rl-tray")!;
  const press = (key: string): void => {
    tray.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
  };
  return { host, view, pieces, cells, rotate, status, press, announce, rejected, state: () => current };
}

afterEach(() => {
  for (const host of hosts) host.remove();
  hosts = [];
});

describe("ROTATE LOCK renderer", () => {
  it("renders a described board, seven labelled pieces with one tab stop, and a disabled Rotate", () => {
    const { host, pieces, cells, rotate } = mount();
    expect(cells).toHaveLength(CELLS);
    expect(host.querySelector(".rl-board")?.getAttribute("aria-label")).toBe(boardDescription(puzzle));
    expect(pieces).toHaveLength(PIECES);
    expect(pieces[0]?.getAttribute("aria-label")).toBe("Piece 1, length 3, pointing right");
    expect(pieces.filter((piece) => piece.getAttribute("tabindex") === "0")).toHaveLength(1);
    for (const piece of pieces) expect(piece.type).toBe("button");
    expect(rotate.disabled).toBe(true);
  });

  it("draws the player's own route and nothing of the answer", () => {
    const { cells } = mount();
    const shown = trace(puzzle, { order: puzzle.startOrder, facing: puzzle.startFacing });
    const routeCells = new Set(shown.steps.map((step) => step.cell));
    for (const [cell, node] of cells.entries()) {
      const text = node.textContent ?? "";
      if (cell === shown.failedCell) expect(text).toBe("x");
      else if (cell === puzzle.start) expect(text).toBe("S");
      else if (cell === puzzle.lock) expect(text).toBe("L");
      else if (puzzle.marks.includes(cell)) expect(text).toBe("+");
      else if (routeCells.has(cell)) expect(text).toMatch(/^[\^>v<]$/);
      else expect(text).toBe("");
    }
    /* Every glyph above is a function of the tray the player built, so the
       same board with a different tray draws a different route. */
    const other = openingsOf(puzzle)[0]!;
    expect(trace(puzzle, other).steps).not.toEqual(shown.steps);
  });

  it("selects by tap, swaps on a second tap, rotates the selection, and announces each move with the route", () => {
    const { pieces, rotate, status, announce, state } = mount();
    pieces[0]!.click();
    expect(pieces[0]?.getAttribute("aria-pressed")).toBe("true");
    expect(pieces[0]?.getAttribute("aria-label")).toMatch(/selected$/);
    expect(rotate.disabled).toBe(false);
    pieces[0]!.click();
    expect(pieces[0]?.getAttribute("aria-pressed")).toBe("false");
    pieces[0]!.click();
    pieces[1]!.click();
    expect(state().order.slice(0, 2)).toEqual([0, 1]);
    expect(announce).toHaveBeenLastCalledWith(`Swapped pieces 1 and 2. ${routeSentence(trace(puzzle, state()), 3)}`);
    pieces[3]!.click();
    rotate.click();
    expect(announce).toHaveBeenLastCalledWith(expect.stringMatching(/^Rotated piece 4 to point /));
    expect(status.textContent).toBe(routeSentence(trace(puzzle, state()), 3));
  });

  it("plays fully by keyboard: arrows move focus, Enter selects and swaps, R rotates, Escape clears", () => {
    const { pieces, press, state } = mount();
    pieces[0]!.focus();
    press("ArrowRight");
    expect(document.activeElement).toBe(pieces[1]);
    press("End");
    expect(document.activeElement).toBe(pieces[6]);
    press("Home");
    press("Enter");
    expect(pieces[0]?.getAttribute("aria-pressed")).toBe("true");
    press("Escape");
    expect(pieces[0]?.getAttribute("aria-pressed")).toBe("false");
    press(" ");
    press("ArrowDown");
    press("Enter");
    expect(state().order.slice(0, 2)).toEqual([0, 1]);
    press("r");
    expect(state().moves.at(-1)).toMatchObject({ kind: "rotate", piece: state().order[1] });
  });

  it("opens the lock along the solving line, shows it in text and locks the tray", () => {
    const { pieces, rotate, status, cells, view, state } = mount();
    for (const action of solvingLine(puzzle)) {
      if (action.kind === "swap") {
        pieces[state().order.indexOf(action.a)]!.click();
        pieces[state().order.indexOf(action.b)]!.click();
      } else {
        pieces[state().order.indexOf(action.piece)]!.click();
        rotate.click();
        pieces[state().order.indexOf(action.piece)]!.click();
      }
    }
    void view;
    expect(state().open).toBe(true);
    expect(status.textContent).toBe("The lock is open.");
    expect(cells[puzzle.lock]?.textContent).toBe("O");
    expect(pieces.every((piece) => piece.disabled)).toBe(true);
  });

  it("dispatches nothing in a read only view and removes only its own play area", () => {
    const { host, pieces, rotate, view, press, state } = mount(initialState(puzzle), true);
    pieces[0]!.click();
    pieces[1]!.click();
    rotate.click();
    press("r");
    expect(state().moves).toHaveLength(0);
    view.unmount();
    expect(host.children).toHaveLength(0);
  });

  it("names every route failure in words", () => {
    const base = { steps: [], open: false, failedCell: -1, turned: [] };
    expect(routeSentence({ ...base, failure: "off-board", failedSlot: 3 }, 3)).toBe("Piece 4 runs off the board.");
    expect(routeSentence({ ...base, failure: "crossing", failedSlot: 0 }, 3)).toBe("Piece 1 crosses the route.");
    expect(routeSentence({ ...base, failure: "through-mark", failedSlot: 1 }, 3)).toBe("Piece 2 goes straight through a marked turn.");
    expect(routeSentence({ ...base, failure: "early-lock", failedSlot: 5 }, 3)).toBe("Piece 6 reaches the lock too early.");
    expect(routeSentence({ ...base, failure: "short-of-lock", failedSlot: null }, 3)).toBe("The route ends away from the lock.");
    expect(routeSentence({ ...base, failure: "missed-marks", failedSlot: null, turned: [4] }, 3)).toBe("The route ends at the lock but misses 2 marked turns.");
    expect(routeSentence({ ...base, failure: "missed-marks", failedSlot: null, turned: [4, 6] }, 3)).toBe("The route ends at the lock but misses 1 marked turn.");
  });
});
