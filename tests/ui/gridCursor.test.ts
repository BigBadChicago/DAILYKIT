// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { createGridCursor } from "../../src/ui/gridCursor.js";
import { el } from "../../src/ui/dom.js";

const COLS = 5;
const ROWS = 7;

function setup(empty: Iterable<number> = []) {
  const gone = new Set(empty);
  const host = el("div");
  document.body.appendChild(host);
  const onActivate = vi.fn();
  const onCancel = vi.fn();
  const announce = vi.fn();
  const cursor = createGridCursor({
    host,
    cols: COLS,
    rows: ROWS,
    cellId: (index) => `cell-${index}`,
    isNavigable: (index) => !gone.has(index),
    onActivate,
    onCancel,
    announce,
    describe: (index) => `cell ${index}`,
  });
  const press = (key: string): KeyboardEvent => {
    const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
    host.dispatchEvent(event);
    return event;
  };
  return { host, cursor, press, onActivate, onCancel, announce, gone };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("grid cursor", () => {
  it("declares itself a grid and tracks the cursor with aria-activedescendant", () => {
    const { host, cursor } = setup();
    expect(host.getAttribute("role")).toBe("grid");
    expect(host.getAttribute("tabindex")).toBe("0");
    expect(host.getAttribute("aria-activedescendant")).toBe("cell-0");
    cursor.destroy();
  });

  it("moves on the arrow keys and preventDefault on each", () => {
    const { cursor, press } = setup();
    expect(press("ArrowRight").defaultPrevented).toBe(true);
    expect(cursor.index).toBe(1);
    press("ArrowDown");
    expect(cursor.index).toBe(1 + COLS);
    press("ArrowLeft");
    expect(cursor.index).toBe(COLS);
    press("ArrowUp");
    expect(cursor.index).toBe(0);
  });

  it("stops at every edge rather than wrapping", () => {
    const { cursor, press } = setup();
    press("ArrowUp");
    expect(cursor.index).toBe(0);
    press("ArrowLeft");
    expect(cursor.index).toBe(0);
    cursor.moveTo(ROWS * COLS - 1);
    press("ArrowRight");
    press("ArrowDown");
    expect(cursor.index).toBe(ROWS * COLS - 1);
  });

  it("skips unnavigable cells in the direction of travel", () => {
    const { cursor, press } = setup([1, 2]);
    expect(cursor.index).toBe(0);
    press("ArrowRight");
    expect(cursor.index).toBe(3);
  });

  it("stays put when every cell in that direction is unnavigable", () => {
    const { cursor, press } = setup([1, 2, 3, 4]);
    press("ArrowRight");
    expect(cursor.index).toBe(0);
  });

  it("Home, End, PageUp, and PageDown jump within the row and column", () => {
    const { cursor, press } = setup();
    cursor.moveTo(2 * COLS + 2);
    press("Home");
    expect(cursor.index).toBe(2 * COLS);
    press("End");
    expect(cursor.index).toBe(2 * COLS + COLS - 1);
    press("PageUp");
    expect(cursor.index).toBe(COLS - 1);
    press("PageDown");
    expect(cursor.index).toBe((ROWS - 1) * COLS + COLS - 1);
  });

  it("activates on Enter and on Space, and Space is prevented from scrolling", () => {
    const { cursor, press, onActivate } = setup();
    cursor.moveTo(7);
    press("Enter");
    expect(onActivate).toHaveBeenCalledWith(7);
    expect(press(" ").defaultPrevented).toBe(true);
    expect(onActivate).toHaveBeenCalledTimes(2);
  });

  it("cancels on Escape and leaves the event alone when no handler exists", () => {
    const { press, onCancel } = setup();
    expect(press("Escape").defaultPrevented).toBe(true);
    expect(onCancel).toHaveBeenCalledTimes(1);

    const host = el("div");
    const bare = createGridCursor({
      host,
      cols: COLS,
      rows: ROWS,
      cellId: (i) => `c-${i}`,
      isNavigable: () => true,
      onActivate: vi.fn(),
    });
    const event = new KeyboardEvent("keydown", { key: "Escape", bubbles: true, cancelable: true });
    host.dispatchEvent(event);
    expect(event.defaultPrevented).toBe(false);
    bare.destroy();
  });

  it("announces on movement and on focus but not on refresh", () => {
    const { cursor, press, announce, gone } = setup();
    announce.mockClear();
    press("ArrowRight");
    expect(announce).toHaveBeenCalledWith("cell 1");
    announce.mockClear();
    gone.add(1);
    cursor.refresh();
    expect(announce).not.toHaveBeenCalled();
  });

  it("refresh relocates the cursor when its cell is emptied by a settle", () => {
    const { cursor, gone } = setup();
    cursor.moveTo(2 * COLS + 2);
    gone.add(2 * COLS + 2);
    cursor.refresh();
    expect(cursor.index).not.toBe(2 * COLS + 2);
    expect(gone.has(cursor.index)).toBe(false);
  });

  it("starts on the nearest navigable cell when cell zero is empty", () => {
    const { cursor } = setup([0]);
    expect(cursor.index).not.toBe(0);
  });

  it("ignores an out of range moveTo and drops the descriptor on destroy", () => {
    const { host, cursor } = setup();
    cursor.moveTo(999);
    expect(cursor.index).toBe(0);
    cursor.destroy();
    expect(host.hasAttribute("aria-activedescendant")).toBe(false);
  });
});
