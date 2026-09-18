// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { createListCursor, type ListCursor } from "../../src/ui/listCursor.js";
import { el } from "../../src/ui/dom.js";

interface HarnessBase {
  readonly host: HTMLElement;
  readonly nodes: readonly HTMLButtonElement[];
  readonly swaps: Array<[number, number]>;
  readonly verbs: Array<number | null>;
  readonly cancels: { count: number };
  order: number[];
  locked: boolean;
}

interface Harness extends HarnessBase {
  readonly cursor: ListCursor;
}

function build(options: { count?: number; horizontal?: boolean } = {}): Harness {
  const count = options.count ?? 4;
  const host = el("div");
  const nodes: HTMLButtonElement[] = [];
  for (let slot = 0; slot < count; slot += 1) {
    const node = el("button", { attrs: { type: "button" } }) as HTMLButtonElement;
    nodes.push(node);
    host.appendChild(node);
  }
  document.body.appendChild(host);

  const swaps: Array<[number, number]> = [];
  const verbs: Array<number | null> = [];
  const cancels = { count: 0 };
  const harness: HarnessBase = {
    host,
    nodes,
    swaps,
    verbs,
    cancels,
    // Identity is deliberately not the slot, so a test that confuses the two fails.
    order: Array.from({ length: count }, (_, slot) => slot + 10),
    locked: false,
  };

  const cursor = createListCursor({
    host,
    count: () => harness.order.length,
    itemAt: (slot) => nodes[slot] ?? null,
    idAt: (slot) => harness.order[slot] ?? null,
    onSwap: (a, b) => swaps.push([a, b]),
    onCancel: () => {
      cancels.count += 1;
    },
    isLocked: () => harness.locked,
    verbs: [{ keys: ["r", "R"], run: (id) => verbs.push(id) }],
    ...(options.horizontal ? { orientation: "horizontal" as const } : {}),
  });
  return Object.assign(harness, { cursor });
}

function press(host: HTMLElement, key: string): KeyboardEvent {
  const event = new KeyboardEvent("keydown", { key, bubbles: true, cancelable: true });
  host.dispatchEvent(event);
  return event;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("createListCursor", () => {
  it("moves the cursor with both axes and clamps at the ends", () => {
    const h = build();
    press(h.host, "ArrowRight");
    expect(h.cursor.index).toBe(1);
    press(h.host, "ArrowDown");
    expect(h.cursor.index).toBe(2);
    press(h.host, "End");
    expect(h.cursor.index).toBe(3);
    press(h.host, "ArrowRight");
    expect(h.cursor.index).toBe(3);
    press(h.host, "Home");
    expect(h.cursor.index).toBe(0);
    press(h.host, "ArrowLeft");
    expect(h.cursor.index).toBe(0);
  });

  it("leaves the vertical arrows alone when the list declares horizontal", () => {
    const h = build({ horizontal: true });
    const down = press(h.host, "ArrowDown");
    expect(h.cursor.index).toBe(0);
    expect(down.defaultPrevented).toBe(false);
  });

  it("selects, deselects and swaps by identity rather than by slot", () => {
    const h = build();
    press(h.host, "Enter");
    expect(h.cursor.selected).toBe(10);
    press(h.host, "Enter");
    expect(h.cursor.selected).toBeNull();
    expect(h.swaps).toEqual([]);

    press(h.host, "Enter");
    press(h.host, "ArrowRight");
    press(h.host, " ");
    expect(h.swaps).toEqual([[10, 11]]);
    expect(h.cursor.selected).toBeNull();
  });

  it("a tap activates the slot it names and moves the cursor there", () => {
    const h = build();
    h.cursor.activate(2);
    expect(h.cursor.index).toBe(2);
    expect(h.cursor.selected).toBe(12);
  });

  it("Escape clears the selection and reports the cancel", () => {
    const h = build();
    press(h.host, "Enter");
    press(h.host, "Escape");
    expect(h.cursor.selected).toBeNull();
    expect(h.cancels.count).toBe(1);
  });

  it("runs a declared verb with the identity under the cursor", () => {
    const h = build();
    press(h.host, "ArrowRight");
    const event = press(h.host, "r");
    expect(h.verbs).toEqual([11]);
    expect(event.defaultPrevented).toBe(true);
    press(h.host, "R");
    expect(h.verbs).toEqual([11, 11]);
  });

  it("refuses selection, swaps and verbs while the game is locked", () => {
    const h = build();
    h.locked = true;
    press(h.host, "Enter");
    press(h.host, "r");
    h.cursor.activate(1);
    expect(h.cursor.selected).toBeNull();
    expect(h.swaps).toEqual([]);
    expect(h.verbs).toEqual([]);
  });

  it("still moves the cursor while locked, so a finished board is readable", () => {
    const h = build();
    h.locked = true;
    press(h.host, "ArrowRight");
    expect(h.cursor.index).toBe(1);
  });

  it("keeps the selection through a reorder, because it holds the identity", () => {
    const h = build();
    press(h.host, "Enter");
    expect(h.cursor.selected).toBe(10);
    h.order = [11, 10, 12, 13];
    h.cursor.refresh();
    expect(h.cursor.selected).toBe(10);
    // Slot 0 now holds 11, so activating it swaps the two rather than deselecting.
    h.cursor.activate(0);
    expect(h.swaps).toEqual([[10, 11]]);
  });

  it("refresh gives the cursor slot the only zero tabindex", () => {
    const h = build();
    h.cursor.moveTo(2);
    h.cursor.refresh();
    expect(h.nodes.map((node) => node.getAttribute("tabindex"))).toEqual(["-1", "-1", "0", "-1"]);
  });

  it("refresh clamps a cursor left past the end of a shortened list", () => {
    const h = build();
    h.cursor.moveTo(3);
    h.order = [10, 11];
    h.cursor.refresh();
    expect(h.cursor.index).toBe(1);
  });

  it("ignores an empty slot rather than selecting nothing", () => {
    const h = build();
    h.order = [];
    h.cursor.activate(0);
    expect(h.cursor.selected).toBeNull();
  });

  it("reports every key it consumes, verbs included", () => {
    const h = build();
    expect(h.cursor.keys).toEqual([
      "ArrowLeft",
      "ArrowRight",
      "ArrowUp",
      "ArrowDown",
      "Home",
      "End",
      "Enter",
      " ",
      "Escape",
      "r",
      "R",
    ]);
  });

  it("announces the selection change once per change", () => {
    const host = el("div");
    document.body.appendChild(host);
    const onSelect = vi.fn();
    const cursor = createListCursor({
      host,
      count: () => 2,
      itemAt: () => null,
      idAt: (slot) => slot,
      onSwap: () => {},
      onSelect,
    });
    cursor.activate(0);
    cursor.activate(0);
    cursor.clearSelection();
    expect(onSelect.mock.calls).toEqual([[0], [null]]);
  });

  it("destroy detaches the key handler", () => {
    const h = build();
    h.cursor.destroy();
    press(h.host, "ArrowRight");
    expect(h.cursor.index).toBe(0);
  });
});
