/**
 * Layer 2. Keyboard play over a lattice. Contract decision 11 and requirement
 * 8.1's full keyboard play.
 *
 * Activated by the grid input variant, so a game that declares one gets arrow
 * key movement, activation, and cancel without writing any of it. The cursor is
 * aria-activedescendant on the grid host rather than a roving tabindex: with 35
 * cells a roving tabindex means 35 focus moves a screen reader narrates as
 * focus changes, where activedescendant narrates one cell.
 *
 * Cols and rows are passed as numbers rather than as an InputDescriptor,
 * because that type lives in Layer 3.
 */

import type { GridInput } from "../core/types.js";
import { on, setAttr } from "./dom.js";

export interface GridCursorOptions extends Pick<GridInput, "cols" | "rows"> {
  readonly host: HTMLElement;
  /** DOM id of the cell element at this index. Owned by the game renderer. */
  readonly cellId: (index: number) => string;
  /** False for a cell the cursor should skip, for example an emptied cell. */
  readonly isNavigable: (index: number) => boolean;
  /** Enter or Space on the cursor cell. */
  readonly onActivate: (index: number) => void;
  /** Escape. Usually clears the selection. */
  readonly onCancel?: () => void;
  readonly announce?: (message: string) => void;
  /** Spoken when the cursor lands. Position plus content is the game's to word. */
  readonly describe?: (index: number) => string;
}

export interface GridCursor {
  readonly index: number;
  /** Called by the renderer after the board changes, because a settle can
   *  empty the cell the cursor is standing on. */
  refresh(): void;
  moveTo(index: number): void;
  destroy(): void;
}

type Delta = { readonly dr: number; readonly dc: number };

const ARROWS: Readonly<Record<string, Delta>> = {
  ArrowUp: { dr: -1, dc: 0 },
  ArrowDown: { dr: 1, dc: 0 },
  ArrowLeft: { dr: 0, dc: -1 },
  ArrowRight: { dr: 0, dc: 1 },
};

export function createGridCursor(options: GridCursorOptions): GridCursor {
  const { host, cols, rows } = options;
  let index = 0;

  const rowOf = (i: number): number => Math.floor(i / cols);
  const colOf = (i: number): number => i % cols;

  /** Walks in the given direction past unnavigable cells, stopping at the edge.
   *  Skipping rather than blocking means a column emptied by gravity does not
   *  become a wall the player has to route around. */
  const step = (from: number, delta: Delta): number => {
    let r = rowOf(from);
    let c = colOf(from);
    for (;;) {
      r += delta.dr;
      c += delta.dc;
      if (r < 0 || r >= rows || c < 0 || c >= cols) return from;
      const candidate = r * cols + c;
      if (options.isNavigable(candidate)) return candidate;
    }
  };

  /** Nearest navigable cell by Chebyshev ring search, used when the cursor's
   *  own cell disappears. */
  const nearestNavigable = (from: number): number => {
    if (options.isNavigable(from)) return from;
    const r0 = rowOf(from);
    const c0 = colOf(from);
    const span = Math.max(rows, cols);
    for (let ring = 1; ring <= span; ring += 1) {
      for (let r = r0 - ring; r <= r0 + ring; r += 1) {
        for (let c = c0 - ring; c <= c0 + ring; c += 1) {
          if (Math.max(Math.abs(r - r0), Math.abs(c - c0)) !== ring) continue;
          if (r < 0 || r >= rows || c < 0 || c >= cols) continue;
          const candidate = r * cols + c;
          if (options.isNavigable(candidate)) return candidate;
        }
      }
    }
    return from;
  };

  const paint = (announce: boolean): void => {
    setAttr(host, "aria-activedescendant", options.cellId(index));
    if (announce && options.announce && options.describe) {
      options.announce(options.describe(index));
    }
  };

  const moveTo = (next: number, announce = true): void => {
    if (next === index) return;
    index = next;
    paint(announce);
  };

  const onKeyDown = (event: Event): void => {
    const key = (event as KeyboardEvent).key;
    const arrow = ARROWS[key];
    if (arrow) {
      event.preventDefault();
      moveTo(step(index, arrow));
      return;
    }
    switch (key) {
      case "Home":
        event.preventDefault();
        moveTo(nearestNavigable(rowOf(index) * cols));
        return;
      case "End":
        event.preventDefault();
        moveTo(nearestNavigable(rowOf(index) * cols + cols - 1));
        return;
      case "PageUp":
        event.preventDefault();
        moveTo(nearestNavigable(colOf(index)));
        return;
      case "PageDown":
        event.preventDefault();
        moveTo(nearestNavigable((rows - 1) * cols + colOf(index)));
        return;
      case "Enter":
      case " ":
        // Space scrolls the page by default, and the board is the page here.
        event.preventDefault();
        options.onActivate(index);
        return;
      case "Escape":
        if (options.onCancel) {
          event.preventDefault();
          options.onCancel();
        }
        return;
      default:
    }
  };

  setAttr(host, "tabindex", "0");
  setAttr(host, "role", "grid");
  index = nearestNavigable(0);
  paint(false);

  const disposers = [
    on(host, "keydown", onKeyDown),
    on(host, "focus", () => paint(true)),
  ];

  return {
    get index(): number {
      return index;
    },
    refresh(): void {
      const next = nearestNavigable(index);
      index = next;
      paint(false);
    },
    moveTo(next: number): void {
      if (next < 0 || next >= rows * cols) return;
      moveTo(nearestNavigable(next));
    },
    destroy(): void {
      for (const dispose of disposers) dispose();
      host.removeAttribute("aria-activedescendant");
    },
  };
}
