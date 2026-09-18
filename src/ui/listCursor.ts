/**
 * Layer 2. Keyboard and pointer play over an ordered list. The ORDER adapter of
 * ARCHITECTURE2 section 21, and the sibling of gridCursor for games whose board
 * is a sequence rather than a lattice.
 *
 * Charter Phase 13 defect 3: CIPHER and ROTATE LOCK had each written this
 * model inside their own renderer, which is the definition of an engine seam
 * that does not exist. Every ordering game in the slate needs it.
 *
 * Two decisions that are not obvious:
 *
 * Roving tabindex, not aria-activedescendant. A list here is a handful of real
 * buttons a player taps, and a screen reader should say the pressed state of
 * the one they moved to. gridCursor chose the opposite because 35 cells make
 * 35 focus events.
 *
 * Selection is held by item identity, not by slot. A swap reorders the slots
 * under the cursor, so a selection stored as a slot would silently come to mean
 * a different item. Identity is the game's integer and this module never reads
 * it for anything but equality.
 */

import { on, setAttr } from "./dom.js";

/** A key the game handles itself, declared so the cursor can announce it and
 *  so the module's input declaration has one source. */
export interface ListVerb {
  readonly keys: readonly string[];
  /** Runs with the identity under the cursor, or null on an empty slot. */
  readonly run: (id: number | null, index: number) => void;
}

export interface ListCursorOptions {
  readonly host: HTMLElement;
  /** Slot count. Read on every key, so a list that grows needs no rebuild. */
  readonly count: () => number;
  /** The focusable element in a slot, owned by the game renderer. */
  readonly itemAt: (index: number) => HTMLElement | null;
  /** Identity of the item currently in a slot. */
  readonly idAt: (index: number) => number | null;
  /** Two identities, in the order they were chosen. */
  readonly onSwap: (a: number, b: number) => void;
  /** Called whenever the selection changes, including when it clears. */
  readonly onSelect?: (selected: number | null) => void;
  /** Escape, and any tap that cancels. Runs after the selection is cleared. */
  readonly onCancel?: () => void;
  /** True while the game refuses input, for example once the day is finished. */
  readonly isLocked?: () => boolean;
  readonly verbs?: readonly ListVerb[];
  /** Vertical arrows move the cursor too unless this is "horizontal". */
  readonly orientation?: "both" | "horizontal";
}

export interface ListCursor {
  readonly index: number;
  readonly selected: number | null;
  /** Every key this cursor consumes, for the module's input declaration. */
  readonly keys: readonly string[];
  /** A tap or an Enter on a slot: select, deselect, or swap. */
  activate(index: number): void;
  /** Move the cursor without activating, clamped to the list. */
  moveTo(index: number): void;
  clearSelection(): void;
  /** Called by the renderer after a repaint, because the slot count can change
   *  and the focused slot may no longer exist. */
  refresh(): void;
  destroy(): void;
}

const BASE_KEYS: readonly string[] = [
  "ArrowLeft",
  "ArrowRight",
  "ArrowUp",
  "ArrowDown",
  "Home",
  "End",
  "Enter",
  " ",
  "Escape",
];

export function createListCursor(options: ListCursorOptions): ListCursor {
  const horizontalOnly = options.orientation === "horizontal";
  let index = 0;
  let selected: number | null = null;

  const last = (): number => Math.max(0, options.count() - 1);
  const locked = (): boolean => options.isLocked?.() ?? false;

  const clamp = (next: number): number => Math.max(0, Math.min(last(), next));

  // No wrap. A tray is a short line the player reads left to right, and wrapping
  // from the last piece to the first reads as a jump rather than a step.
  const moveTo = (next: number, focus: boolean): void => {
    index = clamp(next);
    if (focus) options.itemAt(index)?.focus();
  };

  const setSelected = (next: number | null): void => {
    if (selected === next) return;
    selected = next;
    options.onSelect?.(next);
  };

  const activate = (slot: number): void => {
    if (locked()) return;
    const id = options.idAt(slot);
    if (id === null) return;
    index = clamp(slot);
    if (selected === null) {
      setSelected(id);
      return;
    }
    if (selected === id) {
      setSelected(null);
      return;
    }
    const first = selected;
    setSelected(null);
    options.onSwap(first, id);
  };

  const runVerb = (key: string): boolean => {
    for (const verb of options.verbs ?? []) {
      if (!verb.keys.includes(key)) continue;
      if (!locked()) verb.run(options.idAt(index), index);
      return true;
    }
    return false;
  };

  const onKeyDown = (event: Event): void => {
    const key = (event as KeyboardEvent).key;
    let handled = true;
    switch (key) {
      case "ArrowLeft":
        moveTo(index - 1, true);
        break;
      case "ArrowRight":
        moveTo(index + 1, true);
        break;
      case "ArrowUp":
        if (horizontalOnly) handled = false;
        else moveTo(index - 1, true);
        break;
      case "ArrowDown":
        if (horizontalOnly) handled = false;
        else moveTo(index + 1, true);
        break;
      case "Home":
        moveTo(0, true);
        break;
      case "End":
        moveTo(last(), true);
        break;
      case "Enter":
      case " ":
        // Space scrolls the page by default and the list is the page here.
        activate(index);
        break;
      case "Escape":
        setSelected(null);
        options.onCancel?.();
        break;
      default:
        handled = runVerb(key);
    }
    if (handled) event.preventDefault();
  };

  const dispose = on(options.host, "keydown", onKeyDown);
  const keys = [...BASE_KEYS, ...(options.verbs ?? []).flatMap((verb) => [...verb.keys])];

  return {
    get index(): number {
      return index;
    },
    get selected(): number | null {
      return selected;
    },
    keys,
    activate,
    moveTo(next: number): void {
      moveTo(next, false);
    },
    clearSelection(): void {
      setSelected(null);
    },
    refresh(): void {
      index = clamp(index);
      for (let slot = 0; slot <= last(); slot += 1) {
        const node = options.itemAt(slot);
        if (node) setAttr(node, "tabindex", slot === index ? "0" : "-1");
      }
    },
    destroy(): void {
      dispose();
      selected = null;
    },
  };
}
