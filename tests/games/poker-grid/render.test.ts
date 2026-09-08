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

  /**
   * The Phase 10 shell applies a dispatch synchronously and calls update from
   * inside it, so anything the renderer reads from currentState after
   * dispatching is already the next state. This is the regression test for the
   * defect that produced: the commit was decided from a post dispatch read, so
   * the fourth card committed a four card hand and the fifth never committed at
   * all. The renderer must decide from the pre dispatch length.
   */
  it("commits on the fifth card and never earlier, under a synchronous shell", () => {
    const host = document.createElement("div");
    document.body.appendChild(host);
    const actions: PokerAction[] = [];
    let current = state();
    const context = {
      puzzle,
      initial: current,
      dispatch: (action: PokerAction) => {
        actions.push(action);
        if (action.kind === "add") {
          current = state({ selection: [...current.selection, action.cell] });
          view.update(current);
        }
      },
      announce: vi.fn(),
      reducedMotion: true,
      readOnly: false,
    } as MountContext<PokerState, PokerAction, typeof puzzle>;
    const view = mountPokerGrid(host, context, { reducedMotion: true });

    /* Keyboard rather than pointer, because jsdom has no PointerEvent and
       because both inputs run through the same activate. A run down column
       zero is connected under four way adjacency. */
    const board = host.querySelector<HTMLElement>(".pg-board")!;
    const key = (name: string): void => {
      board.dispatchEvent(
        new KeyboardEvent("keydown", { key: name, bubbles: true, cancelable: true }),
      );
    };
    for (let i = 0; i < 5; i += 1) {
      key("Enter");
      key("ArrowDown");
    }

    const commits = actions.filter((action) => action.kind === "commit");
    expect(commits).toHaveLength(1);
    expect(actions[actions.length - 1]).toEqual({ kind: "commit" });
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
