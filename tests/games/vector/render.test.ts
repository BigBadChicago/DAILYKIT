// @vitest-environment jsdom
/**
 * VECTOR's accessibility contract, the evidence for gate step
 * accessibility-contract. Written in v3 migration phase 5 part B, when the gate
 * found VECTOR was the one live game without a renderer test.
 */
import { afterEach, describe, expect, it, vi } from "vitest";
import { isOk } from "../../../src/core/result.js";
import type { MountContext } from "../../../src/contract/types.js";
import { mountVector } from "../../../src/games/vector/render.js";
import { CELLS } from "../../../src/games/vector/propagate.js";
import {
  MAX_SUBMISSIONS,
  apply,
  initialState,
  type VectorAction,
  type VectorState,
} from "../../../src/games/vector/rules.js";
import { FIXTURE_BLANKS, FIXTURE_CLUES, FIXTURE_LAYOUT, FIXTURE_SOLUTION, fixturePuzzle } from "./fixtures.js";

const puzzle = fixturePuzzle();
let hosts: HTMLElement[] = [];

/** Synchronous like the shell, which applies and calls update inside dispatch. */
function mount(initial: VectorState = initialState(puzzle), readOnly = false) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  hosts.push(host);
  const announce = vi.fn();
  const rejected: string[] = [];
  let current = initial;
  const context: MountContext<VectorState, VectorAction, typeof puzzle> = {
    puzzle,
    initial,
    dispatch(action) {
      const result = apply(current, action);
      if (isOk(result)) {
        current = result.value;
        view.update(current);
      } else {
        rejected.push(result.error.code);
      }
    },
    announce,
    reducedMotion: false,
    readOnly,
  };
  const view = mountVector(host, context, { reducedMotion: false });
  const board = host.querySelector<HTMLElement>(".vec-board")!;
  const press = (key: string): void => {
    board.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true }));
  };
  return { host, view, board, press, announce, rejected, state: () => current };
}

function filled(): VectorState {
  let state = initialState(puzzle);
  for (let cell = 0; cell < CELLS; cell += 1) {
    const dir = FIXTURE_SOLUTION[cell];
    if (dir === null || dir === undefined) continue;
    const result = apply(state, { kind: "set", cell, dir });
    if (isOk(result)) state = result.value;
  }
  return state;
}

afterEach(() => {
  for (const host of hosts) host.remove();
  hosts = [];
});

describe("vector renderer accessibility", () => {
  it("exposes a labelled grid with rows and gridcells and one focus stop", () => {
    const { host, board } = mount();
    expect(host.querySelector(".vec-game")!.getAttribute("aria-label")).toBe("Vector board");
    expect(board.getAttribute("role")).toBe("grid");
    expect(board.getAttribute("tabindex")).toBe("0");
    expect(host.querySelectorAll('[role="row"]')).toHaveLength(6);
    expect(host.querySelectorAll('[role="gridcell"]')).toHaveLength(CELLS);
    expect(host.querySelectorAll("[tabindex]")).toHaveLength(1);
  });

  it("labels every clue by position and number and every blank by position and content", () => {
    const { host } = mount();
    const clues = host.querySelectorAll(".vec-cell--clue");
    const blanks = host.querySelectorAll(".vec-cell--blank");
    expect(clues).toHaveLength(FIXTURE_CLUES);
    expect(blanks).toHaveLength(FIXTURE_BLANKS);
    expect(host.querySelector("#vec-cell-3")!.getAttribute("aria-label")).toBe(
      `row 1, column 4, the number ${String(FIXTURE_LAYOUT[3])}`,
    );
    for (const blank of blanks) expect(blank.getAttribute("aria-label")).toMatch(/^row \d, column \d, empty$/);
  });

  it("never encodes an arrow in the picture alone", () => {
    const { host, press } = mount();
    press("Enter");
    const cell = host.querySelector("#vec-cell-0")!;
    expect(cell.querySelector("svg")!.getAttribute("aria-hidden")).toBe("true");
    expect(cell.getAttribute("aria-label")).toMatch(/^row 1, column 1, pointing (up|right|down|left), reaching the \d at row \d, column \d$/);
  });

  it("points aria-activedescendant at a blank and moves it past clues with the arrow keys", () => {
    const { board, press, announce } = mount();
    expect(board.getAttribute("aria-activedescendant")).toBe("vec-cell-0");
    press("ArrowRight");
    press("ArrowRight");
    expect(board.getAttribute("aria-activedescendant")).toBe("vec-cell-2");
    press("ArrowRight");
    /* Cell 3 holds a clue, so the cursor lands on the next blank. */
    expect(board.getAttribute("aria-activedescendant")).toBe("vec-cell-4");
    expect(announce).toHaveBeenLastCalledWith("row 1, column 5, empty");
  });

  it("plays from the keyboard: Enter cycles an arrow and announces it, Escape clears it", () => {
    const { press, state, announce } = mount();
    press("Enter");
    expect(state().arrows[0]).not.toBeNull();
    expect(announce).toHaveBeenLastCalledWith(expect.stringContaining("row 1, column 1, pointing"));
    press("Escape");
    expect(state().arrows[0]).toBeNull();
    expect(announce).toHaveBeenLastCalledWith("row 1, column 1, empty");
  });

  it("keeps a polite live status in step with the board", () => {
    const { host, press } = mount();
    const status = host.querySelector(".vec-status")!;
    expect(status.getAttribute("role")).toBe("status");
    expect(status.getAttribute("aria-live")).toBe("polite");
    expect(status.textContent).toBe(`0 of ${String(FIXTURE_BLANKS)} arrows placed, ${String(MAX_SUBMISSIONS)} submissions left`);
    press("Enter");
    expect(status.textContent).toBe(`1 of ${String(FIXTURE_BLANKS)} arrows placed, ${String(MAX_SUBMISSIONS)} submissions left`);
  });

  it("disables submit until every blank holds an arrow, then announces a solve", () => {
    const empty = mount();
    expect(empty.host.querySelector<HTMLButtonElement>(".vec-submit")!.disabled).toBe(true);

    const { host, announce, state } = mount(filled());
    const submit = host.querySelector<HTMLButtonElement>(".vec-submit")!;
    expect(submit.disabled).toBe(false);
    submit.click();
    expect(state().solved).toBe(true);
    expect(announce).toHaveBeenCalledWith("Solved.");
    expect(submit.hasAttribute("hidden")).toBe(true);
  });

  it("dispatches nothing from a read only replay", () => {
    const { press, state, host } = mount(initialState(puzzle), true);
    press("Enter");
    host.querySelector<HTMLElement>("#vec-cell-0")!.click();
    expect(state().arrows.every((dir) => dir === null)).toBe(true);
    expect(host.querySelector(".vec-submit")!.hasAttribute("hidden")).toBe(true);
  });

  it("removes everything it created on unmount", () => {
    const { host, view } = mount();
    expect(host.childElementCount).toBe(1);
    view.unmount();
    expect(host.childElementCount).toBe(0);
  });
});
