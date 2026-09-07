// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import type { MountContext } from "../../../src/contract/types.js";
import { mountPokerGrid } from "../../../src/games/poker-grid/render.js";
import { generatePuzzle } from "../../../src/games/poker-grid/generator.js";
import type { PokerAction, PokerState } from "../../../src/games/poker-grid/rules.js";

const puzzle = generatePuzzle(1, 1234);

function state(overrides: Partial<PokerState> = {}): PokerState {
  return {
    grid: puzzle.cells,
    best: puzzle.best,
    selection: [],
    hands: [],
    score: 0,
    terminal: false,
    exceededStoredBest: false,
    ...overrides,
  };
}

function mount(initial: PokerState = state()) {
  const host = document.createElement("div");
  document.body.appendChild(host);
  const dispatch = vi.fn<(action: PokerAction) => void>();
  const context = {
    puzzle,
    initial,
    dispatch,
    announce: vi.fn(),
    reducedMotion: true,
    readOnly: false,
  } as MountContext<PokerState, PokerAction, typeof puzzle>;
  const view = mountPokerGrid(host, context, { reducedMotion: true });
  return { host, dispatch, view };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("Poker Grid renderer", () => {
  it("renders a stable accessible five by seven card board", () => {
    const { host, view } = mount();
    const cards = host.querySelectorAll<HTMLButtonElement>(".pg-card");
    expect(cards).toHaveLength(35);
    expect(cards[0]?.id).toBe("pg-card-0");
    expect(cards[0]?.getAttribute("aria-label")).toMatch(/of/);
    expect(host.querySelector(".pg-board")?.getAttribute("role")).toBe("grid");
    view.unmount();
  });

  it("routes keyboard activation through add and paints selection state", () => {
    const { host, dispatch, view } = mount();
    const board = host.querySelector<HTMLElement>(".pg-board")!;
    board.focus();
    board.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true, cancelable: true }));
    expect(dispatch).toHaveBeenCalledWith({ kind: "add", cell: 0 });
    view.update(state({ selection: [0] }));
    expect(host.querySelector("#pg-card-0")?.classList.contains("pg-card--selected")).toBe(true);
    expect(host.querySelector("#pg-card-0")?.querySelector(".pg-card__order")?.textContent).toBe("1");
    view.unmount();
  });

  it("renders empty cells as non navigable spaces and removes its DOM on teardown", () => {
    const { host, view } = mount();
    const nextGrid: (number | null)[] = [...puzzle.cells];
    nextGrid[0] = null;
    view.update(state({ grid: nextGrid }));
    expect(host.querySelector("#pg-card-0")?.classList.contains("pg-card--empty")).toBe(true);
    expect(host.querySelector("#pg-card-0")?.getAttribute("aria-label")).toContain("Empty space");
    view.unmount();
    expect(host.children).toHaveLength(0);
  });
});
