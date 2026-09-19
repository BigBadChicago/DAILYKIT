/**
 * Layer 4. DIFFERENCE RELAY play area. DIFFERENCE-RELAY.md sections 5 and 13.
 *
 * `custom` input, because the row of stations is an ordered list with a
 * selection and a Run verb and ui/gridCursor serves a lattice. Every meaning is
 * a glyph or a word, never a colour alone, and the relay sentence says in words
 * what the baton did. Selection lives here and is never an action.
 */

import type { GameView, MountContext } from "../../contract/types.js";
import { el, on, setAttr, setText } from "../../ui/dom.js";
import { createListCursor } from "../../ui/listCursor.js";

import { GAPS, MAX_RUNS, STATIONS } from "./relay.js";
import { isTerminal, type DifferenceRelayAction, type DifferenceRelayPuzzle, type DifferenceRelayState } from "./rules.js";
import "./style.css";

export function stationLabel(value: number, slot: number, selected: boolean): string {
  return `Number ${String(value)} at station ${String(slot + 1)}${selected ? ", selected" : ""}`;
}

export function gapText(mark: number | null): string {
  return mark === null ? "?" : String(mark);
}

/** DIFFERENCE-RELAY.md 13.3. Announced whenever the last run changes. */
export function relaySentence(state: DifferenceRelayState): string {
  const last = state.runs[state.runs.length - 1];
  if (last === undefined) return `Order the numbers, then run the relay. Run 1 of ${String(MAX_RUNS)}.`;
  if (last.depth === GAPS) return `The relay is open. Solved in ${String(state.runs.length)} runs.`;
  if (isTerminal(state)) return "The relay did not open. Out of runs.";
  return `The baton reached station ${String(last.depth + 1)} of ${String(STATIONS)}, run ${String(state.runs.length)} of ${String(MAX_RUNS)}.`;
}

export function boardDescription(puzzle: DifferenceRelayPuzzle): string {
  const gaps = puzzle.marks.map((mark, i) => `gap ${String(i + 1)} ${mark === null ? "hidden" : `difference ${String(mark)}`}`).join(", ");
  return `Six stations and five gaps. Marks: ${gaps}.`;
}

export function mountDifferenceRelay(
  host: HTMLElement,
  context: MountContext<DifferenceRelayState, DifferenceRelayAction, DifferenceRelayPuzzle>,
): GameView<DifferenceRelayState> {
  const puzzle = context.puzzle;
  let state = context.initial;

  const root = el("div", { class: "dr-game", attrs: { "data-reduced-motion": String(context.reducedMotion) } });
  const status = el("p", { class: "dr-status" });
  const row = el("div", { class: "dr-row", attrs: { role: "group", "aria-label": boardDescription(puzzle) } });
  const counter = el("p", { class: "dr-runs" });
  const ladder = el("div", { class: "dr-ladder", attrs: { "aria-hidden": "true" } });
  const runButton = el("button", { class: "dr-run", text: "Run relay", attrs: { type: "button" } });

  /* Stations interleaved with gap markers. Only the buttons are cursor items. */
  const stationNodes: HTMLButtonElement[] = [];
  const gapNodes: HTMLElement[] = [];
  for (let slot = 0; slot < STATIONS; slot += 1) {
    const node = el("button", { class: "dr-station", attrs: { type: "button", "data-slot": slot } });
    stationNodes.push(node);
    row.appendChild(node);
    if (slot < GAPS) {
      const gap = el("span", { class: "dr-gap", attrs: { "data-gap": slot, "aria-hidden": "true" } });
      gapNodes.push(gap);
      row.appendChild(gap);
    }
  }

  const locked = (): boolean => context.readOnly || isTerminal(state);

  function runRelay(): void {
    if (locked()) return;
    context.dispatch({ kind: "run" });
  }

  const cursor = createListCursor({
    host: row,
    count: () => STATIONS,
    itemAt: (slot) => stationNodes[slot] ?? null,
    idAt: (slot) => state.order[slot] ?? null,
    onSwap: (a, b) => context.dispatch({ kind: "swap", a, b }),
    onSelect: () => paint(),
    onCancel: () => paint(),
    isLocked: locked,
    orientation: "horizontal",
    verbs: [{ keys: ["r", "R"], run: () => runRelay() }],
  });

  const disposeRow = on(row, "click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-slot]");
    if (target) {
      cursor.activate(Number(target.dataset["slot"]));
      paint();
    }
  });
  const disposeRun = on(runButton, "click", () => runRelay());

  function paintLadder(): void {
    const meters = state.runs.map((run) => "▮".repeat(run.depth) + "▯".repeat(GAPS - run.depth));
    setText(ladder, meters.join("\n"));
  }

  function paint(): void {
    setText(status, relaySentence(state));
    const runs = state.runs.length;
    setText(
      counter,
      state.won
        ? `Opened in ${String(runs)} ${runs === 1 ? "run" : "runs"}.`
        : isTerminal(state)
          ? "Out of runs."
          : `Run ${String(runs + 1)} of ${String(MAX_RUNS)}.`,
    );
    const done = locked();
    stationNodes.forEach((node, slot) => {
      const value = state.order[slot] as number;
      const isSelected = cursor.selected === value;
      setText(node, String(value));
      setAttr(node, "aria-label", stationLabel(value, slot, isSelected));
      setAttr(node, "aria-pressed", String(isSelected));
      setAttr(node, "disabled", done ? "true" : null);
    });
    gapNodes.forEach((node, gap) => {
      setText(node, gapText(puzzle.marks[gap] ?? null));
      setAttr(node, "data-hidden", String(puzzle.marks[gap] === null));
    });
    paintLadder();
    cursor.refresh();
    setAttr(runButton, "disabled", done ? "true" : null);
  }

  root.append(status, row, counter, ladder, runButton);
  host.appendChild(root);
  paint();

  return {
    update(next: DifferenceRelayState): void {
      const previous = state;
      state = next;
      if (next.runs.length > previous.runs.length) {
        context.announce(relaySentence(next));
      } else if (next.order !== previous.order) {
        context.announce("Numbers swapped.");
      }
      if (isTerminal(next)) cursor.clearSelection();
      paint();
    },
    unmount(): void {
      disposeRow();
      disposeRun();
      cursor.destroy();
      root.remove();
    },
  };
}
