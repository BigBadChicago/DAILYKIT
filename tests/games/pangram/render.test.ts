// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";

import type { MountContext } from "../../../src/contract/types.js";
import {
  CENTRE_SLOT,
  KEY_COUNT,
  OUTER_SLOTS,
  TOP_ROW,
  mountPangram,
  outerOrder,
  statusSentence,
} from "../../../src/games/pangram/render.js";
import {
  applyAction,
  initialState,
  type PangramAction,
  type PangramPuzzle,
  type PangramState,
} from "../../../src/games/pangram/rules.js";
import { tutorialPuzzle } from "./fixtures.js";

let hosts: HTMLElement[] = [];

function mount(readOnly = false) {
  const p: PangramPuzzle = tutorialPuzzle();
  const host = document.createElement("div");
  document.body.appendChild(host);
  hosts.push(host);
  const announce = vi.fn();
  const dispatched: PangramAction[] = [];
  let current = initialState(p);
  const context: MountContext<PangramState, PangramAction, PangramPuzzle> = {
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
  const view = mountPangram(host, context);
  const keys = () => [...host.querySelectorAll<HTMLButtonElement>(".pg-key")];
  const button = (cls: string) => host.querySelector<HTMLButtonElement>(`.${cls}`) as HTMLButtonElement;
  function type(word: string): void {
    for (const letter of word) keys().find((key) => key.dataset["letter"] === letter)?.click();
    button("pg-enter").click();
  }
  return { host, keys, button, type, announce, dispatched, state: () => current };
}

afterEach(() => {
  for (const host of hosts) host.remove();
  hosts = [];
});

describe("PANGRAM renderer", () => {
  it("renders seven keys four over three with the centre in the lower middle, not a honeycomb", () => {
    const m = mount();
    expect(m.keys()).toHaveLength(KEY_COUNT);
    expect(m.host.querySelectorAll(".pg-key-row-top .pg-key")).toHaveLength(TOP_ROW);
    expect(m.host.querySelectorAll(".pg-key-row-bottom .pg-key")).toHaveLength(KEY_COUNT - TOP_ROW);
    const centre = m.keys()[CENTRE_SLOT];
    expect(centre?.dataset["letter"]).toBe("h");
    expect(centre?.dataset["centre"]).toBe("true");
    expect(centre?.getAttribute("aria-label")).toMatch(/centre letter/);
    expect(m.host.querySelector("svg, polygon, [class*='hex']")).toBeNull();
  });

  it("puts every set letter on exactly one key", () => {
    const m = mount();
    const letters = m.keys().map((key) => key.dataset["letter"]).sort().join("");
    expect(letters).toBe("abhinot");
  });

  it("shuffle moves the outer letters and never the centre", () => {
    const p = tutorialPuzzle();
    expect(outerOrder(p, 1)).not.toEqual(outerOrder(p, 0));
    expect(outerOrder(p, 6)).toEqual(outerOrder(p, 0));
    const m = mount();
    const before = m.keys().map((key) => key.dataset["letter"]);
    m.button("pg-shuffle").click();
    const after = m.keys().map((key) => key.dataset["letter"]);
    expect(after).not.toEqual(before);
    expect(after[CENTRE_SLOT]).toBe("h");
    expect(OUTER_SLOTS).not.toContain(CENTRE_SLOT);
  });

  it("finds a word typed on the keys and announces its points", () => {
    const m = mount();
    m.type("habit");
    expect(m.state().found.map((f) => f.word)).toEqual(["habit"]);
    expect(m.announce).toHaveBeenCalledWith(expect.stringMatching(/^HABIT, 2 points\./));
    expect(m.host.querySelector(".pg-found")?.textContent).toMatch(/habit/);
  });

  it("carries refusal friction onto the next find", () => {
    const m = mount();
    m.type("tint");
    m.type("hath");
    m.type("bath");
    expect(m.state().found[0]).toMatchObject({ word: "bath", refusedBefore: 2 });
    expect(m.announce).toHaveBeenCalledWith("Every word must use the centre letter.");
  });

  it("types from a physical keyboard with Enter, Backspace and Escape", () => {
    const m = mount();
    const root = m.host.querySelector(".pg-game") as HTMLElement;
    const press = (key: string) => root.dispatchEvent(new KeyboardEvent("keydown", { key, bubbles: true }));
    for (const key of ["b", "a", "t", "x", "Backspace", "h", "Enter"]) press(key);
    expect(m.state().found.map((f) => f.word)).toEqual(["bath"]);
    for (const key of ["b", "o", "Escape", "Enter"]) press(key);
    expect(m.dispatched).toHaveLength(1);
  });

  it("finish needs a second tap, then locks and lists the missed words", () => {
    const m = mount();
    m.type("bath");
    m.button("pg-finish").click();
    expect(m.state().finished).toBe(false);
    expect(m.button("pg-finish").textContent).toMatch(/again/);
    m.button("pg-finish").click();
    expect(m.state().finished).toBe(true);
    for (const key of m.keys()) expect(key.disabled).toBe(true);
    const missed = [...m.host.querySelectorAll(".pg-missed-word")].map((node) => node.textContent);
    expect(missed).toHaveLength(20);
    expect(missed).toContain("habitation (pangram)");
    expect(missed).not.toContain("bath");
  });

  it("a read only mount never dispatches", () => {
    const m = mount(true);
    m.type("bath");
    m.button("pg-finish").click();
    m.button("pg-finish").click();
    expect(m.dispatched).toHaveLength(0);
  });

  it("reports score and rank in words, never colour alone", () => {
    const m = mount();
    expect(statusSentence(m.state())).toMatch(/^Score 0, Rough\. 0 words found\.$/);
    expect(m.host.querySelector(".pg-meter")?.getAttribute("aria-label")).toMatch(/0 of 8/);
  });
});
