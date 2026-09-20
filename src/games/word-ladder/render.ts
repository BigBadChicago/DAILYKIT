/**
 * Layer 4. WORD LADDER play area. WORD-LADDER.md sections 5 and 17.
 *
 * `custom` input, because the board is a current word plus a keyboard and neither
 * ui/gridCursor (a lattice) nor ui/listCursor (identity swap) fits. The keyboard
 * is alphabetical, seven across, so every key clears the 44 pixel floor at 360
 * pixels (WORD-LADDER.md 5, F5). Every meaning is a glyph or a word, never a
 * colour alone, and the climb is announced in words.
 */

import type { GameView, MountContext } from "../../contract/types.js";
import { el, on, setAttr, setText } from "../../ui/dom.js";

import { WORD_LENGTH, isOneChange } from "./ladder.js";
import {
  currentWord,
  isTerminal,
  type WordLadderAction,
  type WordLadderPuzzle,
  type WordLadderState,
} from "./rules.js";
import "./style.css";

export const KEY_ROWS: readonly string[] = ["abcdefg", "hijklmn", "opqrstu", "vwxyz"];

export function climbSentence(state: WordLadderState): string {
  if (state.won) return `Reached the goal in ${String(state.rungs.length)} rungs.`;
  if (state.revealed) return "Revealed. Today's ladder is finished.";
  const current = currentWord(state);
  return `On ${current.toUpperCase()}, climbing to ${state.puzzle.goal.toUpperCase()}. ${String(state.rungs.length)} rungs so far.`;
}

export function boardDescription(puzzle: WordLadderPuzzle): string {
  return `Climb from ${puzzle.start.toUpperCase()} to ${puzzle.goal.toUpperCase()}, one letter a step.`;
}

export function mountWordLadder(
  host: HTMLElement,
  context: MountContext<WordLadderState, WordLadderAction, WordLadderPuzzle>,
): GameView<WordLadderState> {
  const puzzle = context.puzzle;
  let state = context.initial;
  /* The letters being assembled for the next rung, seeded from the current word.
     A cell is armed, then a key overwrites it, and the word submits when it forms
     a rung. Held here because it is selection, not game state. */
  let draft = currentWord(state).split("");
  let armed = 0;
  /* Rungs refused since the last accepted one. The renderer counts them because a
     refusal returns a Rejection and never reaches the shell as state, so the
     accepted rung carries the friction (WORD-LADDER.md 19). Reset on any state
     change in update(). */
  let refusedSinceRung = 0;

  const root = el("div", { class: "wl-game", attrs: { "data-reduced-motion": String(context.reducedMotion) } });
  const status = el("p", { class: "wl-status", attrs: { role: "status", "aria-live": "polite" } });
  const goalLine = el("p", { class: "wl-goal" });
  const wordRow = el("div", { class: "wl-word", attrs: { role: "group", "aria-label": boardDescription(puzzle) } });
  const ladder = el("ol", { class: "wl-ladder", attrs: { "aria-label": "Rungs climbed" } });
  const keyboard = el("div", { class: "wl-keys", attrs: { role: "group", "aria-label": "Letter keys" } });
  const controls = el("div", { class: "wl-controls" });
  const runButton = el("button", { class: "wl-run", text: "Add rung", attrs: { type: "button" } });
  const undoButton = el("button", { class: "wl-undo", text: "Undo", attrs: { type: "button" } });
  const revealButton = el("button", { class: "wl-reveal", text: "Reveal", attrs: { type: "button" } });

  const cellNodes: HTMLButtonElement[] = [];
  for (let i = 0; i < WORD_LENGTH; i += 1) {
    const cell = el("button", { class: "wl-cell", attrs: { type: "button", "data-cell": i } });
    cellNodes.push(cell);
    wordRow.appendChild(cell);
  }

  const keyNodes: HTMLButtonElement[] = [];
  for (const rowLetters of KEY_ROWS) {
    const keyRow = el("div", { class: "wl-key-row" });
    for (const letter of rowLetters) {
      const key = el("button", {
        class: "wl-key",
        text: letter.toUpperCase(),
        attrs: { type: "button", "data-letter": letter },
      });
      keyNodes.push(key);
      keyRow.appendChild(key);
    }
    keyboard.appendChild(keyRow);
  }

  const locked = (): boolean => context.readOnly || isTerminal(state);

  function resetDraft(): void {
    draft = currentWord(state).split("");
    armed = 0;
  }

  /* Classifies the draft the same way the rules will, so a refusal can be counted
     for the friction telemetry and a valid rung dispatched with that count. The
     rules re-validate on dispatch, so this is a mirror for counting, not the
     authority. */
  function draftIsValidRung(word: string): boolean {
    const previous = currentWord(state);
    if (!isOneChange(previous, word)) return false;
    if (!puzzle.accepted.has(word)) return false;
    if (word === puzzle.start || state.rungs.some((rung) => rung.word === word)) return false;
    return true;
  }

  function submitDraft(): void {
    if (locked()) return;
    const word = draft.join("");
    if (draftIsValidRung(word)) {
      context.dispatch({ kind: "rung", word, refusedBefore: refusedSinceRung });
    } else {
      refusedSinceRung += 1;
      /* Still dispatch so the engine announces the specific refusal reason. */
      context.dispatch({ kind: "rung", word, refusedBefore: refusedSinceRung });
    }
  }

  function typeLetter(letter: string): void {
    if (locked()) return;
    draft[armed] = letter;
    /* Advance the armed cell; wrap so a player can keep correcting. */
    armed = (armed + 1) % WORD_LENGTH;
    paint();
  }

  const disposeWord = on(wordRow, "click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-cell]");
    if (target) {
      armed = Number(target.dataset["cell"]);
      paint();
    }
  });
  const disposeKeys = on(keyboard, "click", (event) => {
    const target = (event.target as HTMLElement).closest<HTMLElement>("[data-letter]");
    if (target) typeLetter(target.dataset["letter"] as string);
  });
  const disposeRun = on(runButton, "click", () => submitDraft());
  const disposeUndo = on(undoButton, "click", () => {
    if (locked()) return;
    context.dispatch({ kind: "undo" });
  });
  const disposeReveal = on(revealButton, "click", () => {
    if (locked()) return;
    context.dispatch({ kind: "reveal" });
  });
  const disposeKeydown = on(root, "keydown", (event) => {
    if (locked()) return;
    const key = (event as KeyboardEvent).key;
    if (/^[a-zA-Z]$/.test(key)) {
      typeLetter(key.toLowerCase());
      event.preventDefault();
    } else if (key === "Enter") {
      submitDraft();
      event.preventDefault();
    } else if (key === "Backspace") {
      armed = (armed - 1 + WORD_LENGTH) % WORD_LENGTH;
      draft[armed] = currentWord(state)[armed] as string;
      paint();
      event.preventDefault();
    }
  });

  function paintLadder(): void {
    ladder.replaceChildren();
    const start = el("li", { class: "wl-rung wl-rung-start", text: puzzle.start.toUpperCase() });
    ladder.appendChild(start);
    for (const rung of state.rungs) {
      const item = el("li", { class: "wl-rung", text: rung.word.toUpperCase() });
      setAttr(item, "data-progress", String(rung.progress));
      ladder.appendChild(item);
    }
  }

  function paint(): void {
    setText(status, climbSentence(state));
    setText(goalLine, `Goal: ${puzzle.goal.toUpperCase()} — par ${String(puzzle.par)}`);
    const done = locked();
    const current = currentWord(state);
    cellNodes.forEach((node, i) => {
      const letter = (draft[i] ?? current[i] ?? "") as string;
      setText(node, letter.toUpperCase());
      setAttr(node, "aria-label", `Letter ${String(i + 1)}: ${letter.toUpperCase()}${i === armed ? ", armed" : ""}`);
      setAttr(node, "aria-pressed", String(i === armed));
      setAttr(node, "disabled", done ? "true" : null);
    });
    keyNodes.forEach((node) => setAttr(node, "disabled", done ? "true" : null));
    setAttr(runButton, "disabled", done ? "true" : null);
    setAttr(undoButton, "disabled", done || state.rungs.length === 0 ? "true" : null);
    setAttr(revealButton, "disabled", done ? "true" : null);
    paintLadder();
  }

  controls.append(runButton, undoButton, revealButton);
  root.append(status, goalLine, wordRow, keyboard, controls, ladder);
  host.appendChild(root);
  paint();

  return {
    update(next: WordLadderState): void {
      const previous = state;
      state = next;
      if (next.rungs.length > previous.rungs.length) {
        const rung = next.rungs[next.rungs.length - 1];
        context.announce(rung ? `${rung.word.toUpperCase()} added. ${climbSentence(next)}` : climbSentence(next));
        refusedSinceRung = 0;
        resetDraft();
      } else if (next.rungs.length < previous.rungs.length) {
        context.announce(`Removed. ${climbSentence(next)}`);
        refusedSinceRung = 0;
        resetDraft();
      } else if (next.revealed && !previous.revealed) {
        context.announce(climbSentence(next));
      }
      paint();
    },
    unmount(): void {
      disposeWord();
      disposeKeys();
      disposeRun();
      disposeUndo();
      disposeReveal();
      disposeKeydown();
      root.remove();
    },
  };
}
