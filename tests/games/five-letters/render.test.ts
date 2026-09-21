// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MountContext } from "../../../src/contract/types.js";
import { KEY_ROWS, MARK_GLYPH, mountFiveLetters, rowSentence, statusSentence } from "../../../src/games/five-letters/render.js";
import {
  applyAction,
  initialState,
  type FiveLettersAction,
  type FiveLettersPuzzle,
  type FiveLettersState,
} from "../../../src/games/five-letters/rules.js";
import { puzzleFor } from "./fixtures.js";

let hosts: HTMLElement[] = [];

function mount(readOnly = false) {
  const p: FiveLettersPuzzle = puzzleFor("heart");
  const host = document.createElement("div");
  document.body.appendChild(host);
  hosts.push(host);
  const announce = vi.fn();
  const dispatched: FiveLettersAction[] = [];
  let current = initialState(p);
  const context: MountContext<FiveLettersState, FiveLettersAction, FiveLettersPuzzle> = {
    puzzle: p,
    initial: current,
    dispatch(action) {
      dispatched.push(action);
      const next = applyAction(current, action);
      if (next.ok) {
        current = next.value;
        view.update(current);
      } else {
        announce(next.error.announce);
      }
    },
    announce,
    reducedMotion: true,
    readOnly,
  };
  const view = mountFiveLetters(host, context);
  const key = (name: string) =>
    host.querySelector<HTMLButtonElement>(`[data-letter="${name}"], [data-action="${name}"]`) as HTMLButtonElement;
  function type(word: string): void {
    for (const letter of word) key(letter).click();
    key("enter").click();
  }
  return { host, key, type, announce, dispatched, state: () => current, view };
}

afterEach(() => {
  for (const host of hosts) host.remove();
  hosts = [];
});

describe("FIVE LETTERS renderer", () => {
  it("renders an alphabetical keyboard seven across with Delete and Enter closing the last row", () => {
    const m = mount();
    const rows = [...m.host.querySelectorAll(".fl-key-row")];
    expect(rows).toHaveLength(4);
    for (const row of rows) expect(row.querySelectorAll("button")).toHaveLength(7);
    expect(KEY_ROWS.join("")).toBe("abcdefghijklmnopqrstuvwxyz");
    expect(m.host.querySelectorAll("[data-letter]")).toHaveLength(26);
    expect(m.key("delete").getAttribute("aria-label")).toBe("Delete");
    expect(m.host.querySelectorAll(".fl-row")).toHaveLength(6);
    expect(m.host.querySelectorAll(".fl-tile")).toHaveLength(30);
  });

  it("marks a guess with shapes and words, never colour alone", () => {
    const m = mount();
    m.type("treat");
    const tiles = [...m.host.querySelectorAll<HTMLElement>(".fl-row")[0]!.querySelectorAll<HTMLElement>(".fl-tile")];
    expect(tiles.map((t) => t.dataset["mark"])).toEqual(["0", "1", "1", "1", "2"]);
    expect(tiles.map((t) => t.querySelector(".fl-mark")?.textContent)).toEqual([
      MARK_GLYPH[0], MARK_GLYPH[1], MARK_GLYPH[1], MARK_GLYPH[1], MARK_GLYPH[2],
    ]);
    expect(m.announce).toHaveBeenCalledWith("TREAT: T absent, R present, E present, A present, T right. 1 of 6 guesses used.");
    expect(m.key("t").getAttribute("aria-label")).toBe("T, right");
    expect(m.key("t").dataset["mark"]).toBe("2");
  });

  it("carries refusal friction onto the next accepted guess", () => {
    const m = mount();
    /* A refused word stays on the row to be edited, as the genre does it. */
    m.type("qxzvb");
    for (let i = 0; i < 5; i += 1) m.key("delete").click();
    m.type("hea");
    for (let i = 0; i < 3; i += 1) m.key("delete").click();
    m.type("crane");
    expect(m.state().guesses[0]).toMatchObject({ word: "crane", refusedBefore: 2 });
    expect(m.announce).toHaveBeenCalledWith("Not in the word list.");
    expect(m.announce).toHaveBeenCalledWith("Guesses need five letters.");
  });

  it("types from a physical keyboard, caps the draft at five and deletes", () => {
    const m = mount();
    const root = m.host.querySelector(".fl-game") as HTMLElement;
    const press = (key: string) => root.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    for (const key of ["c", "r", "a", "n", "x", "Backspace", "e", "q", "Enter"]) press(key);
    expect(m.state().guesses.map((g) => g.word)).toEqual(["crane"]);
    m.key("h").click();
    m.key("delete").click();
    m.key("enter").click();
    expect(m.announce).toHaveBeenLastCalledWith("Guesses need five letters.");
  });

  it("locks after a solve and a read only mount never dispatches", () => {
    const m = mount();
    m.type("heart");
    expect(statusSentence(m.state())).toBe("Solved in 1.");
    for (const button of m.host.querySelectorAll<HTMLButtonElement>(".fl-key")) expect(button.disabled).toBe(true);
    const r = mount(true);
    r.type("heart");
    expect(r.dispatched).toHaveLength(0);
  });

  it("describes rows in words", () => {
    const m = mount();
    m.type("crane");
    expect(rowSentence(m.state().guesses[0]!)).toBe("CRANE: C absent, R present, A right, N absent, E present.");
    expect(m.host.querySelectorAll(".fl-row")[0]?.getAttribute("aria-label")).toMatch(/^Guess 1\. CRANE/);
    m.view.unmount();
    expect(m.host.querySelector(".fl-game")).toBeNull();
  });
});
