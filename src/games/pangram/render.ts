/**
 * Layer 4. PANGRAM play area. PANGRAM.md sections 5 and 17.
 *
 * `custom` input: seven letter keys, a draft word, and Delete, Shuffle, Enter
 * and Finish. The keys sit four over three with the centre letter always in the
 * middle of the lower row, a plain keypad and never a honeycomb (BACKLOG.md).
 * Every meaning is a glyph or a word, never colour alone, and each find and
 * refusal is announced in words.
 */

import type { GameView, MountContext } from "../../contract/types.js";
import { tierLabel } from "../../engine/tiers.js";
import { el, on, setAttr, setText } from "../../ui/dom.js";

import { MAX_LENGTH } from "./letters.js";
import {
  finishedOutcomeFor,
  isTerminal,
  refusalFor,
  scoreOfState,
  tierFor,
  type PangramAction,
  type PangramPuzzle,
  type PangramState,
} from "./rules.js";
import { METER_CELLS, meterFor } from "./telemetry.js";
import "./style.css";

/** Keypad slots for the six outer letters; slot 5 is the centre. */
export const OUTER_SLOTS: readonly number[] = [0, 1, 2, 3, 4, 6];
export const CENTRE_SLOT = 5;
export const TOP_ROW = 4;
export const KEY_COUNT = 7;

/** The outer letters in display order after `shuffles` presses. A fixed cycle
 *  rather than randomness, so the renderer stays deterministic under test. */
export function outerOrder(puzzle: PangramPuzzle, shuffles: number): string[] {
  const outer = puzzle.letters.split("").filter((letter) => letter !== puzzle.centre);
  const steps = [5, 1, 3, 0, 4, 2];
  let order = outer;
  for (let s = 0; s < shuffles % 6; s += 1) order = steps.map((i) => order[i] as string);
  return order;
}

export function statusSentence(state: PangramState): string {
  const score = scoreOfState(state);
  const found = state.found.length;
  if (isTerminal(state)) return `Finished. ${finishedOutcomeFor(state).detail}.`;
  return `Score ${String(score)}, ${tierLabel(tierFor(state))}. ${String(found)} ${found === 1 ? "word" : "words"} found.`;
}

export function mountPangram(
  host: HTMLElement,
  context: MountContext<PangramState, PangramAction, PangramPuzzle>,
): GameView<PangramState> {
  const puzzle = context.puzzle;
  let state = context.initial;
  /* Selection, not game state: the word being typed, the shuffle count, the
     finish confirmation, and refusals since the last find, which the next find
     carries as its friction (PANGRAM.md 19). */
  let draft = "";
  let shuffles = 0;
  let confirmingFinish = false;
  let refusedSinceFind = 0;

  const root = el("div", { class: "pg-game", attrs: { "data-reduced-motion": String(context.reducedMotion) } });
  const status = el("p", { class: "pg-status", attrs: { role: "status", "aria-live": "polite" } });
  const meter = el("div", { class: "pg-meter", attrs: { role: "img" } });
  const draftLine = el("p", { class: "pg-draft", attrs: { "aria-label": "Word being typed" } });
  const keys = el("div", { class: "pg-keys", attrs: { role: "group", "aria-label": "Letter keys" } });
  const topRow = el("div", { class: "pg-key-row pg-key-row-top" });
  const bottomRow = el("div", { class: "pg-key-row pg-key-row-bottom" });
  const controls = el("div", { class: "pg-controls" });
  const deleteButton = el("button", { class: "pg-delete", text: "Delete", attrs: { type: "button" } });
  const shuffleButton = el("button", { class: "pg-shuffle", text: "Shuffle", attrs: { type: "button" } });
  const enterButton = el("button", { class: "pg-enter", text: "Enter", attrs: { type: "button" } });
  const finishButton = el("button", { class: "pg-finish", text: "Finish", attrs: { type: "button" } });
  const found = el("ul", { class: "pg-found", attrs: { "aria-label": "Words found" } });
  const missedHeading = el("p", { class: "pg-missed-heading" });
  const missed = el("ul", { class: "pg-missed", attrs: { "aria-label": "Words missed" } });

  const meterCells: HTMLElement[] = [];
  for (let i = 0; i < METER_CELLS; i += 1) {
    const cell = el("span", { class: "pg-meter-cell" });
    meterCells.push(cell);
    meter.appendChild(cell);
  }

  const keyNodes: HTMLButtonElement[] = [];
  for (let slot = 0; slot < KEY_COUNT; slot += 1) {
    const key = el("button", { class: "pg-key", attrs: { type: "button", "data-slot": slot } });
    keyNodes.push(key);
    (slot < TOP_ROW ? topRow : bottomRow).appendChild(key);
  }
  keys.append(topRow, bottomRow);

  const locked = (): boolean => context.readOnly || isTerminal(state);

  function letterAt(slot: number): string {
    if (slot === CENTRE_SLOT) return puzzle.centre;
    return outerOrder(puzzle, shuffles)[OUTER_SLOTS.indexOf(slot)] as string;
  }

  function typeLetter(letter: string): void {
    if (locked() || draft.length >= MAX_LENGTH) return;
    draft += letter;
    confirmingFinish = false;
    paint();
  }

  function submit(): void {
    if (locked() || draft.length === 0) return;
    const word = draft;
    draft = "";
    confirmingFinish = false;
    if (refusalFor(state, word) !== null) refusedSinceFind += 1;
    /* A refused word is still dispatched so the engine announces its reason;
       apply refuses it and the state does not change. */
    context.dispatch({ kind: "word", word, refusedBefore: refusedSinceFind });
    paint();
  }

  function backspace(): void {
    if (locked()) return;
    draft = draft.slice(0, -1);
    paint();
  }

  const disposeKeys = on(keys, "click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-slot]");
    if (target) typeLetter(letterAt(Number(target.dataset["slot"])));
  });
  const disposeDelete = on(deleteButton, "click", () => backspace());
  const disposeShuffle = on(shuffleButton, "click", () => {
    if (locked()) return;
    shuffles += 1;
    paint();
  });
  const disposeEnter = on(enterButton, "click", () => submit());
  const disposeFinish = on(finishButton, "click", () => {
    if (locked()) return;
    if (!confirmingFinish) {
      confirmingFinish = true;
      context.announce("Tap Finish again to end today's letters.");
      paint();
      return;
    }
    confirmingFinish = false;
    context.dispatch({ kind: "finish" });
  });
  const disposeKeydown = on(root, "keydown", (event) => {
    if (locked()) return;
    const key = (event as KeyboardEvent).key;
    if (/^[a-zA-Z]$/.test(key)) {
      typeLetter(key.toLowerCase());
      event.preventDefault();
    } else if (key === "Enter") {
      submit();
      event.preventDefault();
    } else if (key === "Backspace") {
      backspace();
      event.preventDefault();
    } else if (key === "Escape") {
      draft = "";
      paint();
      event.preventDefault();
    }
  });

  function paintWords(): void {
    found.replaceChildren();
    const sorted = [...state.found].sort((a, b) => (a.word < b.word ? -1 : 1));
    for (const find of sorted) {
      const item = el("li", {
        class: "pg-found-word",
        text: find.pangram ? `${find.word} (pangram)` : find.word,
        attrs: { "data-pangram": String(find.pangram) },
      });
      found.appendChild(item);
    }
    missed.replaceChildren();
    if (!isTerminal(state)) {
      setText(missedHeading, "");
      return;
    }
    const have = new Set(state.found.map((find) => find.word));
    const left = puzzle.answers.filter((word) => !have.has(word));
    setText(missedHeading, left.length === 0 ? "You found every word." : `Words you missed, ${String(left.length)}:`);
    for (const word of left) {
      const pangram = new Set(word).size === puzzle.letters.length;
      missed.appendChild(
        el("li", {
          class: "pg-missed-word",
          text: pangram ? `${word} (pangram)` : word,
          attrs: { "data-pangram": String(pangram) },
        }),
      );
    }
  }

  function paint(): void {
    setText(status, statusSentence(state));
    const full = meterFor(scoreOfState(state), puzzle.total);
    meterCells.forEach((cell, i) => setAttr(cell, "data-full", String(i < full)));
    setAttr(meter, "aria-label", `Progress to the top rank: ${String(full)} of ${String(METER_CELLS)}`);
    setText(draftLine, draft.length === 0 ? "" : draft.toUpperCase());
    const done = locked();
    keyNodes.forEach((node, slot) => {
      const letter = letterAt(slot);
      const centre = slot === CENTRE_SLOT;
      setText(node, letter.toUpperCase());
      setAttr(node, "data-letter", letter);
      setAttr(node, "data-centre", String(centre));
      setAttr(node, "aria-label", centre ? `${letter.toUpperCase()}, centre letter` : letter.toUpperCase());
      setAttr(node, "disabled", done ? "true" : null);
    });
    for (const button of [deleteButton, shuffleButton, enterButton, finishButton]) {
      setAttr(button, "disabled", done ? "true" : null);
    }
    setText(finishButton, confirmingFinish ? "Tap again to finish" : "Finish");
    paintWords();
  }

  controls.append(deleteButton, shuffleButton, enterButton);
  root.append(status, meter, draftLine, keys, controls, finishButton, found, missedHeading, missed);
  host.appendChild(root);
  paint();

  return {
    update(next: PangramState): void {
      const previous = state;
      state = next;
      if (next.found.length > previous.found.length) {
        const find = next.found[next.found.length - 1];
        if (find !== undefined) {
          const points = `${String(find.points)} ${find.points === 1 ? "point" : "points"}`;
          context.announce(`${find.word.toUpperCase()}${find.pangram ? ", pangram" : ""}, ${points}. ${statusSentence(next)}`);
        }
        refusedSinceFind = 0;
      } else if (isTerminal(next) && !isTerminal(previous)) {
        context.announce(statusSentence(next));
      }
      paint();
    },
    unmount(): void {
      disposeKeys();
      disposeDelete();
      disposeShuffle();
      disposeEnter();
      disposeFinish();
      disposeKeydown();
      root.remove();
    },
  };
}
