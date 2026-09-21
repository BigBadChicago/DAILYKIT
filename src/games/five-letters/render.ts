/**
 * Layer 4. FIVE LETTERS play area. FIVE-LETTERS.md sections 5 and 17.
 *
 * `custom` input: six rows of five tiles and a 26 key keyboard. The keyboard is
 * alphabetical, seven across, WORD LADDER's layout, with Delete and Enter closing
 * the last row, so every key clears the 44 pixel floor at 360 pixels
 * (FIVE-LETTERS.md 5, measured in section 30). QWERTY ten across would not. Every
 * mark is a shape and a word as well as a colour: right is a filled tile with a
 * filled dot, present a dashed tile with a hollow dot, absent a plain tile with a
 * cross, and each row is announced in words.
 */

import type { GameView, MountContext } from "../../contract/types.js";
import { el, on, setAttr, setText } from "../../ui/dom.js";

import { MAX_GUESSES, WORD_LENGTH, type Mark } from "./feedback.js";
import {
  finishedOutcomeFor,
  isTerminal,
  letterMarks,
  refusalFor,
  type FiveLettersAction,
  type FiveLettersPuzzle,
  type FiveLettersState,
  type GuessRecord,
} from "./rules.js";
import "./style.css";

export const KEY_ROWS: readonly string[] = ["abcdefg", "hijklmn", "opqrstu", "vwxyz"];
export const MARK_WORD: readonly string[] = ["absent", "present", "right"];
/** Text glyphs, never emoji: U+00D7, U+25CB, U+25CF. */
export const MARK_GLYPH: readonly string[] = ["\u00D7", "\u25CB", "\u25CF"];

export function rowSentence(record: GuessRecord): string {
  const parts = record.word.split("").map((letter, i) => `${letter.toUpperCase()} ${MARK_WORD[record.marks[i] as Mark] as string}`);
  return `${record.word.toUpperCase()}: ${parts.join(", ")}.`;
}

export function statusSentence(state: FiveLettersState): string {
  if (isTerminal(state)) return `${finishedOutcomeFor(state).detail}.`;
  const used = state.guesses.length;
  return `${String(used)} of ${String(MAX_GUESSES)} guesses used.`;
}

export function mountFiveLetters(
  host: HTMLElement,
  context: MountContext<FiveLettersState, FiveLettersAction, FiveLettersPuzzle>,
): GameView<FiveLettersState> {
  let state = context.initial;
  /* Selection, not game state: the letters typed so far, and words refused since
     the last accepted guess, which that guess carries as friction (FIVE-LETTERS.md 19). */
  let draft = "";
  let refusedSinceGuess = 0;

  const root = el("div", { class: "fl-game", attrs: { "data-reduced-motion": String(context.reducedMotion) } });
  const status = el("p", { class: "fl-status", attrs: { role: "status", "aria-live": "polite" } });
  const board = el("div", { class: "fl-board", attrs: { role: "group", "aria-label": "Guesses" } });
  const keyboard = el("div", { class: "fl-keys", attrs: { role: "group", "aria-label": "Letter keys" } });

  const rowNodes: HTMLElement[] = [];
  const tileNodes: HTMLElement[][] = [];
  for (let r = 0; r < MAX_GUESSES; r += 1) {
    const row = el("div", { class: "fl-row", attrs: { role: "group" } });
    const tiles: HTMLElement[] = [];
    for (let c = 0; c < WORD_LENGTH; c += 1) {
      const tile = el("div", { class: "fl-tile" });
      tiles.push(tile);
      row.appendChild(tile);
    }
    rowNodes.push(row);
    tileNodes.push(tiles);
    board.appendChild(row);
  }

  const keyNodes = new Map<string, HTMLButtonElement>();
  KEY_ROWS.forEach((letters, at) => {
    const keyRow = el("div", { class: "fl-key-row" });
    for (const letter of letters) {
      const key = el("button", { class: "fl-key", text: letter.toUpperCase(), attrs: { type: "button", "data-letter": letter } });
      keyNodes.set(letter, key);
      keyRow.appendChild(key);
    }
    if (at === KEY_ROWS.length - 1) {
      keyRow.appendChild(
        el("button", { class: "fl-key fl-key-wide", text: "Del", attrs: { type: "button", "data-action": "delete", "aria-label": "Delete" } }),
      );
      keyRow.appendChild(el("button", { class: "fl-key fl-key-wide", text: "Enter", attrs: { type: "button", "data-action": "enter" } }));
    }
    keyboard.appendChild(keyRow);
  });

  const locked = (): boolean => context.readOnly || isTerminal(state);

  function typeLetter(letter: string): void {
    if (locked() || draft.length >= WORD_LENGTH) return;
    draft += letter;
    paint();
  }

  function deleteLetter(): void {
    if (locked() || draft.length === 0) return;
    draft = draft.slice(0, -1);
    paint();
  }

  function submit(): void {
    if (locked()) return;
    if (refusalFor(state, draft) !== null) refusedSinceGuess += 1;
    /* A refused word is still dispatched so the engine announces its reason;
       the rules are the authority, this count is only friction. */
    context.dispatch({ kind: "guess", word: draft, refusedBefore: refusedSinceGuess });
  }

  const disposeKeys = on(keyboard, "click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("button");
    if (target === null) return;
    const letter = target.dataset["letter"];
    if (letter !== undefined) typeLetter(letter);
    else if (target.dataset["action"] === "delete") deleteLetter();
    else if (target.dataset["action"] === "enter") submit();
  });
  const disposeKeydown = on(root, "keydown", (event) => {
    const keyEvent = event as KeyboardEvent;
    if (locked() || keyEvent.ctrlKey || keyEvent.metaKey || keyEvent.altKey) return;
    if (/^[a-zA-Z]$/.test(keyEvent.key)) typeLetter(keyEvent.key.toLowerCase());
    else if (keyEvent.key === "Backspace") deleteLetter();
    else if (keyEvent.key === "Enter") submit();
    else return;
    event.preventDefault();
  });

  function paintTile(tile: HTMLElement, letter: string, mark: Mark | null): void {
    const glyph = mark === null ? "" : (MARK_GLYPH[mark] as string);
    tile.replaceChildren(el("span", { class: "fl-letter", text: letter.toUpperCase() }), el("span", { class: "fl-mark", text: glyph, attrs: { "aria-hidden": "true" } }));
    setAttr(tile, "data-mark", mark === null ? null : String(mark));
    setAttr(tile, "data-filled", letter === "" ? null : "true");
  }

  function paint(): void {
    setText(status, statusSentence(state));
    const done = locked();
    for (let r = 0; r < MAX_GUESSES; r += 1) {
      const record = state.guesses[r];
      const tiles = tileNodes[r] as HTMLElement[];
      const row = rowNodes[r] as HTMLElement;
      if (record !== undefined) {
        tiles.forEach((tile, c) => paintTile(tile, record.word[c] as string, record.marks[c] as Mark));
        setAttr(row, "aria-label", `Guess ${String(r + 1)}. ${rowSentence(record)}`);
      } else if (r === state.guesses.length && !done) {
        tiles.forEach((tile, c) => paintTile(tile, draft[c] ?? "", null));
        setAttr(row, "aria-label", `Guess ${String(r + 1)}, typing: ${draft.toUpperCase() || "empty"}`);
      } else {
        tiles.forEach((tile) => paintTile(tile, "", null));
        setAttr(row, "aria-label", `Guess ${String(r + 1)}, not used`);
      }
    }
    const known = letterMarks(state);
    for (const [letter, key] of keyNodes) {
      const mark = known.get(letter);
      setAttr(key, "data-mark", mark === undefined ? null : String(mark));
      setAttr(key, "aria-label", mark === undefined ? letter.toUpperCase() : `${letter.toUpperCase()}, ${MARK_WORD[mark] as string}`);
      setAttr(key, "disabled", done ? "true" : null);
    }
    for (const button of keyboard.querySelectorAll<HTMLButtonElement>("[data-action]")) setAttr(button, "disabled", done ? "true" : null);
  }

  root.append(status, board, keyboard);
  host.appendChild(root);
  paint();

  return {
    update(next: FiveLettersState): void {
      const previous = state;
      state = next;
      if (next.guesses.length > previous.guesses.length) {
        const record = next.guesses[next.guesses.length - 1] as GuessRecord;
        draft = "";
        refusedSinceGuess = 0;
        context.announce(`${rowSentence(record)} ${statusSentence(next)}`);
      }
      paint();
    },
    unmount(): void {
      disposeKeys();
      disposeKeydown();
      root.remove();
    },
  };
}
