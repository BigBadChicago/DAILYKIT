/**
 * Layer 4. CIPHER play area. The engine owns the chrome; this owns the palette,
 * the slots, and the guess history.
 *
 * CIPHER declares `custom` input, and ui/gridCursor.ts serves a lattice, so the
 * keyboard model is written here. That cost is predicted defect 3 of the Phase
 * 11 plan, confirmed: the presentation kit has no cursor for a palette plus a
 * row of slots, which is two lists rather than a grid.
 */

import { el, on, setAttr, setText } from "../../ui/dom.js";
import type { GameView, MountContext } from "../../contract/types.js";
import { CODE_LENGTH, SYMBOL_COUNT, draftCode, isTerminal, type CipherAction, type CipherState } from "./rules.js";
import type { CipherPuzzle } from "./generator.js";
import "./style.css";

export const SHAPE_NAMES = ["circle", "square", "triangle", "diamond", "hexagon", "cross"] as const;

/* Six outlines that stay apart at 24 pixels. Distinctness is a requirement,
   not a preference: 8.1 forbids meaning carried by colour alone. */
const SHAPE_PATHS: readonly string[] = [
  "M12 3 A9 9 0 1 1 11.99 3 Z",
  "M4 4 H20 V20 H4 Z",
  "M12 3 L21 20 H3 Z",
  "M12 2 L21 12 L12 22 L3 12 Z",
  "M12 2 L20.5 7 V17 L12 22 L3.5 17 V7 Z",
  "M9 3 H15 V9 H21 V15 H15 V21 H9 V15 H3 V9 H9 Z",
];

const SVG_NS = "http://www.w3.org/2000/svg";

export function shapeName(symbol: number): string {
  return SHAPE_NAMES[symbol] ?? "unknown";
}

function shapeNode(symbol: number, filled: boolean): SVGSVGElement {
  const svg = document.createElementNS(SVG_NS, "svg");
  svg.setAttribute("viewBox", "0 0 24 24");
  svg.setAttribute("class", "cipher-shape");
  svg.setAttribute("aria-hidden", "true");
  svg.setAttribute("data-filled", String(filled));
  const path = document.createElementNS(SVG_NS, "path");
  path.setAttribute("d", SHAPE_PATHS[symbol] ?? "");
  svg.appendChild(path);
  return svg;
}

export function feedbackText(exact: number, misplaced: number): string {
  return `${exact} in place, ${misplaced} misplaced`;
}

export interface CipherRenderOptions {
  readonly reducedMotion: boolean;
}

export function mountCipher(
  host: HTMLElement,
  context: MountContext<CipherState, CipherAction, CipherPuzzle>,
  options: CipherRenderOptions,
): GameView<CipherState> {
  let state = context.initial;
  /* Which slot the keyboard writes into. Not focus: focus follows the player
     around the palette, and typing a digit must still fill the code left to
     right without asking them to walk the slots first. */
  let cursor = 0;

  const root = el("div", { class: "cipher", attrs: { "data-reduced-motion": String(options.reducedMotion) } });
  const history = el("ol", { class: "cipher-history", attrs: { "aria-label": "Guesses so far" } });
  const slots = el("div", { class: "cipher-slots", attrs: { role: "group", "aria-label": "Your guess" } });
  const palette = el("div", { class: "cipher-palette", attrs: { role: "group", "aria-label": "Shapes" } });
  const submit = el("button", { class: "cipher-submit", text: "Submit", attrs: { type: "button" } });
  const status = el("p", { class: "cipher-status" });

  const slotNodes: HTMLButtonElement[] = [];
  for (let slot = 0; slot < CODE_LENGTH; slot += 1) {
    const node = el("button", { class: "cipher-slot", attrs: { type: "button", "data-slot": slot } });
    slotNodes.push(node);
    slots.appendChild(node);
  }

  for (let symbol = 0; symbol < SYMBOL_COUNT; symbol += 1) {
    const key = el("button", {
      class: "cipher-key",
      attrs: { type: "button", "data-symbol": symbol, "aria-label": `${shapeName(symbol)}, key ${symbol + 1}` },
    });
    key.appendChild(shapeNode(symbol, true));
    palette.appendChild(key);
  }

  function place(symbol: number): void {
    if (isTerminal(state)) return;
    const target = state.draft[cursor] === null ? cursor : state.draft.findIndex((slot) => slot === null);
    const slot = target === -1 ? cursor : target;
    context.dispatch({ kind: "set", slot, symbol });
    cursor = Math.min(CODE_LENGTH - 1, slot + 1);
    paint();
  }

  function clearSlot(slot: number): void {
    if (isTerminal(state)) return;
    context.dispatch({ kind: "clear", slot });
    cursor = slot;
    paint();
  }

  function backspace(): void {
    const filled = state.draft.reduce<number>((last, value, index) => (value === null ? last : index), -1);
    if (filled >= 0) clearSlot(filled);
  }

  const disposeSlots = on(slots, "click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-slot]");
    if (!target) return;
    clearSlot(Number(target.dataset["slot"]));
  });

  const disposePalette = on(palette, "click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-symbol]");
    if (!target) return;
    place(Number(target.dataset["symbol"]));
  });

  const disposeSubmit = on(submit, "click", () => {
    context.dispatch({ kind: "submit" });
    cursor = 0;
    paint();
  });

  const disposeKeys = on(root, "keydown", (event) => {
    const key = (event as KeyboardEvent).key;
    if (key >= "1" && key <= String(SYMBOL_COUNT)) {
      place(Number(key) - 1);
      event.preventDefault();
      return;
    }
    if (key === "Backspace") {
      backspace();
      event.preventDefault();
      return;
    }
    if (key === "Enter" && (event.target as HTMLElement) !== submit) {
      context.dispatch({ kind: "submit" });
      cursor = 0;
      paint();
      event.preventDefault();
      return;
    }
    if (key === "ArrowLeft" || key === "ArrowRight") {
      const step = key === "ArrowLeft" ? -1 : 1;
      cursor = (cursor + step + CODE_LENGTH) % CODE_LENGTH;
      slotNodes[cursor]?.focus();
      paint();
      event.preventDefault();
    }
  });

  function paintHistory(): void {
    while (history.childElementCount > state.guesses.length) history.lastElementChild?.remove();
    state.guesses.forEach((record, index) => {
      let row = history.children[index] as HTMLLIElement | undefined;
      if (row === undefined) {
        row = el("li", { class: "cipher-row" });
        for (const symbol of record.code) row.appendChild(shapeNode(symbol, true));
        row.appendChild(el("span", { class: "cipher-feedback" }));
        history.appendChild(row);
      }
      const label = feedbackText(record.feedback.exact, record.feedback.misplaced);
      setText(row.lastElementChild as HTMLElement, label);
      setAttr(row, "aria-label", `Guess ${index + 1}: ${record.code.map(shapeName).join(", ")}. ${label}`);
    });
  }

  function paint(): void {
    paintHistory();
    slotNodes.forEach((node, slot) => {
      const symbol = state.draft[slot];
      const empty = symbol === null || symbol === undefined;
      setAttr(node, "data-empty", String(empty));
      setAttr(node, "aria-label", empty ? `Slot ${slot + 1}, empty` : `Slot ${slot + 1}, ${shapeName(symbol)}, tap to clear`);
      node.replaceChildren(...(empty ? [] : [shapeNode(symbol, false)]));
    });
    const complete = draftCode(state) !== null;
    const done = isTerminal(state);
    setAttr(submit, "disabled", complete && !done ? null : "true");
    for (const node of [...slotNodes, ...Array.from(palette.children) as HTMLElement[]]) {
      setAttr(node, "disabled", done ? "true" : null);
    }
    const left = Math.max(0, 6 - state.guesses.length);
    setText(
      status,
      done
        ? state.solved
          ? `Solved in ${state.guesses.length}.`
          : `Out of guesses. The code was ${state.code.map(shapeName).join(", ")}.`
        : `${left} ${left === 1 ? "guess" : "guesses"} left.`,
    );
  }

  root.append(history, slots, palette, submit, status);
  host.appendChild(root);

  function update(next: CipherState): void {
    const scored = next.guesses.length > state.guesses.length;
    state = next;
    if (scored) {
      const record = next.guesses[next.guesses.length - 1]!;
      context.announce(feedbackText(record.feedback.exact, record.feedback.misplaced));
    }
    paint();
  }

  paint();

  return {
    update,
    unmount(): void {
      disposeSlots();
      disposePalette();
      disposeSubmit();
      disposeKeys();
      root.remove();
    },
  };
}
