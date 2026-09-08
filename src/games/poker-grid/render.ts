import { createGridCursor } from "../../ui/gridCursor.js";
import { el, on, patchKeyed, setAttr, setClass, setText } from "../../ui/dom.js";
import type { MountContext, GameView } from "../../contract/types.js";
import { cardRank, cardSuit } from "./evaluator.js";
import { BOARD_CELLS, BOARD_COLS, BOARD_ROWS, type PokerAction, type PokerState } from "./rules.js";
import type { PokerPuzzle } from "./generator.js";

const RANK_NAMES = ["two", "three", "four", "five", "six", "seven", "eight", "nine", "ten", "jack", "queen", "king", "ace"] as const;
const SUIT_NAMES = ["clubs", "diamonds", "hearts", "spades"] as const;
const SUIT_GLYPHS = ["♣", "♦", "♥", "♠"] as const;

export interface PokerGridRenderOptions {
  readonly reducedMotion: boolean;
}
import "./style.css";

function cardLabel(card: number): string {
  return `${RANK_NAMES[cardRank(card) - 2]} of ${SUIT_NAMES[cardSuit(card)]}`;
}

function suitPath(suit: number): string {
  return [
    "M12 2 C8 7 4 9 4 13 C4 16 6 18 9 18 C7 21 8 23 12 23 C16 23 17 21 15 18 C18 18 20 16 20 13 C20 9 16 7 12 2 Z",
    "M12 2 L21 12 L12 22 L3 12 Z",
    "M12 22 C10 19 4 16 4 10 C4 6 9 6 12 10 C15 6 20 6 20 10 C20 16 14 19 12 22 Z",
    "M12 2 C9 7 4 10 4 14 C4 17 7 19 10 18 L8 22 L16 22 L14 18 C17 19 20 17 20 14 C20 10 15 7 12 2 Z",
  ][suit] ?? "";
}

function cardFace(card: number): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", suitPath(cardSuit(card)));
  svg.appendChild(path);
  return svg;
}

function cardNode(cell: number): HTMLButtonElement {
  return el("button", {
    class: "pg-card",
    attrs: { type: "button", id: `pg-card-${cell}`, "data-cell": cell },
  }) as HTMLButtonElement;
}

function selectionPosition(selection: readonly number[], cell: number): number {
  const position = selection.indexOf(cell);
  return position < 0 ? 0 : position + 1;
}

function paintCard(node: HTMLElement, state: PokerState, cell: number): void {
  const card = state.grid[cell];
  const position = selectionPosition(state.selection, cell);
  setClass(node, "pg-card--selected", position > 0);
  setClass(node, "pg-card--empty", card === null || card === undefined);
  setAttr(node, "aria-pressed", position > 0);
  setAttr(node, "aria-label", card === null || card === undefined ? `Empty space, row ${Math.floor(cell / BOARD_COLS) + 1}, column ${(cell % BOARD_COLS) + 1}` : cardLabel(card));
  setText(node, "");
  if (card === null || card === undefined) return;
  const rank = el("span", { class: "pg-card__rank", text: String(cardRank(card)) });
  const suit = el("span", { class: `pg-card__suit pg-card__suit--${SUIT_NAMES[cardSuit(card)]}` }, [cardFace(card), el("span", { class: "dk-visually-hidden", text: SUIT_GLYPHS[cardSuit(card)] })]);
  node.append(rank, suit);
  if (position > 0) node.appendChild(el("span", { class: "pg-card__order", text: String(position), attrs: { "aria-hidden": "true" } }));
}

export function mountPokerGrid(
  host: HTMLElement,
  context: MountContext<PokerState, PokerAction, PokerPuzzle>,
  options: PokerGridRenderOptions,
): GameView<PokerState> {
  const root = el("section", { class: "pg-game", attrs: { "aria-label": "Poker Grid board" } });
  setClass(root, "pg-game--reduced-motion", options.reducedMotion);
  const board = el("div", { class: "pg-board", attrs: { "aria-label": "35 card board" } });
  const status = el("p", { class: "pg-status", attrs: { role: "status", "aria-live": "polite" } });
  let currentState = context.initial;
  const cursor = createGridCursor({
    host: board,
    cols: BOARD_COLS,
    rows: BOARD_ROWS,
    cellId: (index) => `pg-card-${index}`,
    isNavigable: (index) => currentState.grid[index] !== null,
    onActivate: (index) => activate(index),
    onCancel: () => context.dispatch({ kind: "truncate", index: 0 }),
    announce: context.announce,
    describe: (index) => currentState.grid[index] === null ? "Empty space." : cardLabel(currentState.grid[index] as number),
  });
  let pointerActive = false;
  let pointerMoved = false;
  let pointerId: number | null = null;
  let pointerCell: number | null = null;

  function activate(cell: number): void {
    const position = currentState.selection.indexOf(cell);
    if (position >= 0) {
      context.dispatch({ kind: "truncate", index: position });
    } else {
      context.dispatch({ kind: "add", cell });
      if (currentState.selection.length === 4) context.dispatch({ kind: "commit" });
    }
  }

  const disposePointerDown = on(board, "pointerdown", (event) => {
    const pointer = event as PointerEvent;
    const target = (pointer.target as HTMLElement).closest<HTMLElement>("[data-cell]");
    if (!target) return;
    pointerActive = true;
    pointerMoved = false;
    pointerId = pointer.pointerId;
    pointerCell = Number(target.dataset["cell"]);
    board.setPointerCapture(pointer.pointerId);
  });
  const disposePointerOver = on(board, "pointerover", (event) => {
    if (!pointerActive) return;
    const pointer = event as PointerEvent;
    if (pointerId !== pointer.pointerId) return;
    const target = (pointer.target as HTMLElement).closest<HTMLElement>("[data-cell]");
    if (!target) return;
    pointerMoved = true;
    activate(Number(target.dataset["cell"]));
  });
  const disposePointerUp = on(board, "pointerup", (event) => {
    const pointer = event as PointerEvent;
    if (pointerId !== pointer.pointerId) return;
    pointerActive = false;
    pointerId = null;
    if (!pointerMoved && pointerCell !== null) activate(pointerCell);
    pointerCell = null;
    if (currentState.selection.length === 5) context.dispatch({ kind: "commit" });
    if (pointerMoved) event.preventDefault();
  });

  root.append(board, status);
  host.appendChild(root);

  function update(next: PokerState): void {
    currentState = next;
    patchKeyed(board, Array.from({ length: BOARD_CELLS }, (_, index) => index), (cell) => String(cell), (cell) => cardNode(cell), (node, cell) => paintCard(node, currentState, cell));
    cursor.refresh();
    setText(status, `${next.selection.length} of 5 selected. ${next.grid.filter((card) => card !== null).length} cards remain.`);
  }

  update(currentState);

  return {
    update,
    unmount(): void {
      disposePointerDown();
      disposePointerOver();
      disposePointerUp();
      cursor.destroy();
      root.remove();
    },
  };
}

export { cardLabel };
