/**
 * Layer 4. ROTATE LOCK play area. ROTATE-LOCK.md sections 5 and 13.
 *
 * `custom` input, because the tray is a list with a selection and a rotation
 * verb and ui/gridCursor serves a lattice. The board is display only: every
 * cell's meaning is a glyph, never a colour alone, and the route sentence says
 * in words what the drawing shows. Selection lives here and is never an action.
 */

import type { GameView, MountContext } from "../../contract/types.js";
import { el, on, setAttr, setText } from "../../ui/dom.js";
import { createListCursor } from "../../ui/listCursor.js";

import { CELLS, PIECES, colOf, rowOf, type Direction, type Trace } from "./route.js";
import { MOVE_CAP, isTerminal, traceOf, type RotateLockAction, type RotateLockPuzzle, type RotateLockState } from "./rules.js";
import "./style.css";

export const DIRECTION_NAMES: readonly string[] = ["up", "right", "down", "left"];
export const DIRECTION_GLYPHS: readonly string[] = ["^", ">", "v", "<"];

export function cellName(cell: number): string {
  return `row ${String(rowOf(cell) + 1)} column ${String(colOf(cell) + 1)}`;
}

/** ROTATE-LOCK.md 13.3. Slots are numbered from one, the way the tray reads. */
export function routeSentence(trace: Trace, marks: number): string {
  const piece = trace.failedSlot === null ? "" : `Piece ${String(trace.failedSlot + 1)}`;
  switch (trace.failure) {
    case null:
      return "The lock is open.";
    case "off-board":
      return `${piece} runs off the board.`;
    case "crossing":
      return `${piece} crosses the route.`;
    case "through-mark":
      return `${piece} goes straight through a marked turn.`;
    case "early-lock":
      return `${piece} reaches the lock too early.`;
    case "short-of-lock":
      return "The route ends away from the lock.";
    case "missed-marks": {
      const missed = marks - trace.turned.length;
      return `The route ends at the lock but misses ${String(missed)} marked ${missed === 1 ? "turn" : "turns"}.`;
    }
  }
}

export function pieceLabel(slot: number, length: number, dir: Direction, selected: boolean): string {
  return `Piece ${String(slot + 1)}, length ${String(length)}, pointing ${DIRECTION_NAMES[dir] ?? ""}${selected ? ", selected" : ""}`;
}

export function boardDescription(puzzle: RotateLockPuzzle): string {
  const marks = puzzle.marks.map(cellName).join("; ");
  return `Start at ${cellName(puzzle.start)}. Lock at ${cellName(puzzle.lock)}. Marked turns at ${marks}.`;
}

export function mountRotateLock(
  host: HTMLElement,
  context: MountContext<RotateLockState, RotateLockAction, RotateLockPuzzle>,
): GameView<RotateLockState> {
  const puzzle = context.puzzle;
  let state = context.initial;

  const root = el("div", { class: "rl-game", attrs: { "data-reduced-motion": String(context.reducedMotion) } });
  const status = el("p", { class: "rl-status" });
  const board = el("div", { class: "rl-board", attrs: { role: "img", "aria-label": boardDescription(puzzle) } });
  const counter = el("p", { class: "rl-moves" });
  const tray = el("div", { class: "rl-tray", attrs: { role: "group", "aria-label": "Tray, in route order" } });
  const rotate = el("button", { class: "rl-rotate", text: "Rotate", attrs: { type: "button" } });

  const cellNodes: HTMLElement[] = [];
  for (let cell = 0; cell < CELLS; cell += 1) {
    const node = el("div", { class: "rl-cell", attrs: { "data-cell": cell, "aria-hidden": "true" } });
    cellNodes.push(node);
    board.appendChild(node);
  }
  const pieceNodes: HTMLButtonElement[] = [];
  for (let slot = 0; slot < PIECES; slot += 1) {
    const node = el("button", { class: "rl-piece", attrs: { type: "button", "data-slot": slot } });
    pieceNodes.push(node);
    tray.appendChild(node);
  }

  const locked = (): boolean => context.readOnly || isTerminal(state);

  function rotatePiece(piece: number | null): void {
    if (locked() || piece === null) return;
    context.dispatch({ kind: "rotate", piece });
  }

  // The tray is the ORDER adapter. Selection, focus and the swap live in
  // ui/listCursor; the rotation verb is declared to it and dispatched here.
  const cursor = createListCursor({
    host: tray,
    count: () => PIECES,
    itemAt: (slot) => pieceNodes[slot] ?? null,
    idAt: (slot) => state.order[slot] ?? null,
    onSwap: (a, b) => context.dispatch({ kind: "swap", a, b }),
    onSelect: () => paint(),
    onCancel: () => paint(),
    isLocked: locked,
    verbs: [{ keys: ["r", "R"], run: (piece) => rotatePiece(piece) }],
  });

  const disposeTray = on(tray, "click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-slot]");
    if (target) {
      cursor.activate(Number(target.dataset["slot"]));
      paint();
    }
  });
  const disposeRotate = on(rotate, "click", () => rotatePiece(cursor.selected));
  const disposeKeys = (): void => cursor.destroy();

  function paintBoard(trace: Trace): void {
    const glyphs = new Array<string>(CELLS).fill("");
    const kinds = new Array<string>(CELLS).fill("empty");
    for (const step of trace.steps) {
      glyphs[step.cell] = DIRECTION_GLYPHS[step.dir] ?? "";
      kinds[step.cell] = "route";
    }
    const taken = new Set(trace.turned);
    for (const mark of puzzle.marks) {
      glyphs[mark] = "+";
      kinds[mark] = taken.has(mark) ? "mark-taken" : "mark";
    }
    glyphs[puzzle.start] = "S";
    kinds[puzzle.start] = "start";
    glyphs[puzzle.lock] = trace.open ? "O" : "L";
    kinds[puzzle.lock] = trace.open ? "open" : "lock";
    if (trace.failedCell >= 0) {
      glyphs[trace.failedCell] = "x";
      kinds[trace.failedCell] = "fault";
    }
    cellNodes.forEach((node, cell) => {
      setText(node, glyphs[cell] ?? "");
      setAttr(node, "data-kind", kinds[cell] ?? "empty");
    });
  }

  function paint(): void {
    const trace = traceOf(state);
    paintBoard(trace);
    setText(status, routeSentence(trace, puzzle.marks.length));
    const moves = state.moves.length;
    setText(
      counter,
      state.open
        ? `Opened in ${String(moves)} ${moves === 1 ? "move" : "moves"}.`
        : isTerminal(state)
          ? `Jammed after ${String(MOVE_CAP)} moves.`
          : `Moves ${String(moves)} of ${String(MOVE_CAP)}.`,
    );
    const done = locked();
    pieceNodes.forEach((node, slot) => {
      const piece = state.order[slot] as number;
      const length = puzzle.lengths[piece] as number;
      const dir = state.facing[piece] as Direction;
      const isSelected = cursor.selected === piece;
      setText(node, (DIRECTION_GLYPHS[dir] ?? "").repeat(length));
      setAttr(node, "aria-label", pieceLabel(slot, length, dir, isSelected));
      setAttr(node, "aria-pressed", String(isSelected));
      setAttr(node, "data-length", length);
      setAttr(node, "disabled", done ? "true" : null);
    });
    cursor.refresh();
    setAttr(rotate, "disabled", done || cursor.selected === null ? "true" : null);
  }

  root.append(status, board, counter, tray, rotate);
  host.appendChild(root);
  paint();

  return {
    update(next: RotateLockState): void {
      const previous = state;
      state = next;
      if (next.moves.length > previous.moves.length) {
        const move = next.moves[next.moves.length - 1];
        if (move !== undefined) {
          const said =
            move.kind === "swap"
              ? `Swapped pieces ${String(next.order.indexOf(move.b) + 1)} and ${String(next.order.indexOf(move.a) + 1)}.`
              : `Rotated piece ${String(next.order.indexOf(move.piece) + 1)} to point ${DIRECTION_NAMES[next.facing[move.piece] as Direction] ?? ""}.`;
          context.announce(`${said} ${routeSentence(traceOf(next), puzzle.marks.length)}`);
        }
      }
      if (isTerminal(next)) cursor.clearSelection();
      paint();
    },
    unmount(): void {
      disposeTray();
      disposeRotate();
      disposeKeys();
      root.remove();
    },
  };
}
