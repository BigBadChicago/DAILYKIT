/**
 * Layer 4. The VECTOR play area. The engine owns everything outside this host.
 *
 * Keyboard play comes from ui/gridCursor.ts, which this renderer creates. The
 * cursor owns role, tabindex and aria-activedescendant on the board, so cells
 * are addressed by id and are not focusable: thirty six focusable buttons would
 * be thirty six focus changes for a screen reader to narrate, which is the case
 * activedescendant exists for.
 *
 * The one assistance this board gives is the ray highlight. It shows a static
 * fact about the board, never a fact about the answer. No clue tally, no
 * satisfied marker, no completion signal. VECTOR.md 14.2.
 */

import type { GameView, MountContext } from "../../contract/types.js";
import { clear, el, on, setAttr, setClass, setText } from "../../ui/dom.js";
import { createGridCursor } from "../../ui/gridCursor.js";
import {
  CELLS,
  COLS,
  NO_TARGET,
  ROWS,
  cellAt,
  colOf,
  rowOf,
  solutionOf,
  type ArrowBoard,
  type Direction,
} from "./propagate.js";
import {
  MAX_SUBMISSIONS,
  isComplete,
  isFinished,
  type VectorAction,
  type VectorPuzzle,
  type VectorState,
} from "./rules.js";

export interface VectorRenderOptions {
  readonly reducedMotion: boolean;
}

/** Clockwise from up, matching the Direction encoding. Self drawn, no font. */
const ARROW_PATHS: readonly string[] = [
  "M12 4 L20 14 L15 14 L15 20 L9 20 L9 14 L4 14 Z",
  "M20 12 L10 20 L10 15 L4 15 L4 9 L10 9 L10 4 Z",
  "M12 20 L4 10 L9 10 L9 4 L15 4 L15 10 L20 10 Z",
  "M4 12 L14 4 L14 9 L20 9 L20 15 L14 15 L14 20 Z",
];
const DIRECTION_WORDS: readonly string[] = ["up", "right", "down", "left"];
const STEPS: readonly (readonly [number, number])[] = [
  [-1, 0],
  [0, 1],
  [1, 0],
  [0, -1],
];

const cellId = (cell: number): string => `vec-cell-${String(cell)}`;

function arrowSvg(dir: Direction): SVGSVGElement {
  const svg = document.createElementNS("http://www.w3.org/2000/svg", "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "vec-arrow");
  svg.setAttribute("aria-hidden", "true");
  const path = document.createElementNS("http://www.w3.org/2000/svg", "path");
  path.setAttribute("d", ARROW_PATHS[dir] as string);
  svg.appendChild(path);
  return svg;
}

function cellName(cell: number): string {
  return `row ${String(rowOf(cell) + 1)}, column ${String(colOf(cell) + 1)}`;
}

/** Cells the ray crosses, ending on the clue it reaches. Static per puzzle. */
function rayCells(puzzle: VectorPuzzle, cell: number, dir: Direction): readonly number[] {
  const target = puzzle.geometry.targets[cell * 4 + dir] as number;
  if (target === NO_TARGET) return [];
  const [dr, dc] = STEPS[dir] as readonly [number, number];
  const out: number[] = [];
  let row = rowOf(cell) + dr;
  let col = colOf(cell) + dc;
  for (;;) {
    const at = cellAt(row, col);
    out.push(at);
    if (at === target) return out;
    row += dr;
    col += dc;
  }
}

export function mountVector(
  host: HTMLElement,
  context: MountContext<VectorState, VectorAction, VectorPuzzle>,
  options: VectorRenderOptions,
): GameView<VectorState> {
  const { puzzle } = context;
  let state = context.initial;
  /** The cell the ray highlight follows. Set by a tap or by an activation. */
  let lit: number | null = null;
  let revealed: ArrowBoard | null = null;
  let destroyed = false;

  const root = el("section", {
    class: "vec-game",
    attrs: { "aria-label": "Vector board" },
  });
  setClass(root, "vec-game--reduced-motion", options.reducedMotion);

  const board = el("div", { class: "vec-board" });
  board.style.setProperty("--vec-cols", String(COLS));

  const cellNodes: HTMLElement[] = [];
  for (let row = 0; row < ROWS; row += 1) {
    const rowNode = el("div", { class: "vec-row", attrs: { role: "row" } });
    for (let col = 0; col < COLS; col += 1) {
      const cell = cellAt(row, col);
      const clue = puzzle.clues[cell];
      const node = el("div", {
        class: clue === null ? "vec-cell vec-cell--blank" : "vec-cell vec-cell--clue",
        attrs: { id: cellId(cell), role: "gridcell", "data-cell": String(cell) },
      });
      if (clue !== null) {
        setText(node, String(clue));
        setAttr(node, "aria-label", `${cellName(cell)}, the number ${String(clue)}`);
      }
      rowNode.appendChild(node);
      cellNodes[cell] = node;
    }
    board.appendChild(rowNode);
  }

  const status = el("p", {
    class: "vec-status",
    attrs: { role: "status", "aria-live": "polite" },
  });
  const submit = el("button", {
    class: "vec-submit",
    text: "Submit",
    attrs: { type: "button" },
  });
  const reveal = el("p", { class: "vec-reveal", attrs: { hidden: true } });

  root.append(board, status, submit, reveal);
  clear(host);
  host.appendChild(root);

  function describe(cell: number): string {
    const dir = revealed === null ? state.arrows[cell] : revealed[cell];
    if (dir === null || dir === undefined) return `${cellName(cell)}, empty`;
    const target = puzzle.geometry.targets[cell * 4 + dir] as number;
    const clue = puzzle.clues[target] as number;
    return (
      `${cellName(cell)}, pointing ${DIRECTION_WORDS[dir] as string}, ` +
      `reaching the ${String(clue)} at ${cellName(target)}`
    );
  }

  /**
   * A tap or an activation, by pointer or by keyboard. Refusals belong to the
   * rules layer and the shell announces them, so this declines to dispatch only
   * where dispatching could not be what the player meant.
   */
  function activate(cell: number): void {
    if (context.readOnly || isFinished(state)) return;
    if (puzzle.clues[cell] !== null) return;
    lit = cell;
    context.dispatch({ kind: "cycle", cell });
  }

  const cursor = createGridCursor({
    host: board,
    cols: COLS,
    rows: ROWS,
    cellId,
    isNavigable: (index) => puzzle.clues[index] === null,
    onActivate: (index) => {
      activate(index);
    },
    onCancel: () => {
      if (context.readOnly || isFinished(state)) return;
      lit = cursor.index;
      context.dispatch({ kind: "set", cell: cursor.index, dir: null });
    },
    announce: context.announce,
    describe,
  });

  /**
   * One delegated listener rather than thirty six. The cursor is moved to the
   * tapped cell so the keyboard and the pointer never disagree about where the
   * player is.
   */
  const disposers = [
    on(board, "click", (event) => {
      const target = (event.target as Element | null)?.closest("[data-cell]");
      if (target === null || target === undefined) return;
      const cell = Number(target.getAttribute("data-cell"));
      if (!Number.isInteger(cell) || cell < 0 || cell >= CELLS) return;
      if (puzzle.clues[cell] === null) cursor.moveTo(cell);
      activate(cell);
    }),
    on(submit, "click", () => {
      if (context.readOnly) return;
      context.dispatch({ kind: "submit" });
    }),
  ];

  function paintHighlight(): void {
    for (const node of cellNodes) {
      setClass(node, "vec-cell--lit", false);
      setClass(node, "vec-cell--target", false);
    }
    if (lit === null || revealed !== null) return;
    const dir = state.arrows[lit];
    if (dir === null) return;
    const path = rayCells(puzzle, lit, dir);
    for (let at = 0; at < path.length; at += 1) {
      const node = cellNodes[path[at] as number] as HTMLElement;
      setClass(node, at === path.length - 1 ? "vec-cell--target" : "vec-cell--lit", true);
    }
  }

  function paint(): void {
    const finished = isFinished(state);
    const showing = revealed;

    for (let cell = 0; cell < CELLS; cell += 1) {
      if (puzzle.clues[cell] !== null) continue;
      const node = cellNodes[cell] as HTMLElement;
      const dir = showing === null ? state.arrows[cell] : showing[cell];
      clear(node);
      if (dir !== null && dir !== undefined) node.appendChild(arrowSvg(dir));
      setClass(node, "vec-cell--filled", dir !== null && dir !== undefined);
      setAttr(node, "aria-label", describe(cell));
    }

    setClass(root, "vec-game--finished", finished);
    setClass(root, "vec-game--revealed", showing !== null);

    const placed = puzzle.geometry.blankCells.filter((cell) => state.arrows[cell] !== null).length;
    const total = puzzle.geometry.blankCells.length;
    const left = MAX_SUBMISSIONS - state.submissions;
    setText(
      status,
      finished
        ? `${String(state.submissions)} of ${String(MAX_SUBMISSIONS)} submissions used`
        : `${String(placed)} of ${String(total)} arrows placed, ` +
          `${String(left)} submission${left === 1 ? "" : "s"} left`,
    );

    setAttr(submit, "hidden", finished || context.readOnly);
    submit.disabled = !isComplete(state);

    cursor.refresh();
    paintHighlight();
  }

  paint();

  return {
    update(next: VectorState): void {
      if (destroyed) return;
      const previous = state;
      state = next;

      if (!previous.solved && next.solved) {
        context.announce("Solved.");
      } else if (previous.submissions !== next.submissions) {
        const left = MAX_SUBMISSIONS - next.submissions;
        context.announce(
          left === 0 ? "Not right. No submissions left." : `Not right. ${String(left)} left.`,
        );
      } else if (lit !== null && previous.arrows[lit] !== next.arrows[lit]) {
        context.announce(describe(lit));
      }

      /* The answer is derived here and stored nowhere. VECTOR.md 5. A replay is
         read only and reveals nothing, because the player may not have reached
         that day yet. */
      if (isFinished(next) && !next.solved && revealed === null && !context.readOnly) {
        revealed = solutionOf(puzzle.geometry);
        if (revealed !== null) {
          setAttr(reveal, "hidden", false);
          setText(reveal, "The answer:");
        }
      }
      paint();
    },
    unmount(): void {
      destroyed = true;
      for (const off of disposers) off();
      cursor.destroy();
      clear(host);
    },
  };
}

/** The help panel draws the same cells at a smaller size. */
export { arrowSvg };
