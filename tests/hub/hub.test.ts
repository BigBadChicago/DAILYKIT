// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it } from "vitest";

import { emptyGameRecord } from "../../src/engine/storage.js";
import { LIVE_GAMES, SUITE_GAMES, entryFor } from "../../src/shell/registry.js";
import { openGameStore } from "../../src/shell/suite.js";
import { mountHub } from "../../src/hub/hub.js";

const POKER = entryFor("poker-grid")!;
const DAY = new Date(2026, 0, 3, 12, 0, 0);
const clock = (): Date => new Date(DAY.getTime());

let handle: { destroy(): void } | null = null;

/* jsdom implements no media queries. The hub asks for two, one for the theme
   and one for reduced motion, and neither answer changes what is rendered. */
beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

function mount(): HTMLElement {
  const root = document.createElement("div");
  document.body.appendChild(root);
  handle = mountHub(root, clock);
  return root;
}

afterEach(() => {
  handle?.destroy();
  handle = null;
  document.body.innerHTML = "";
  localStorage.clear();
});

describe("the hub", () => {
  it("lists every game in the suite, whether or not it is built", () => {
    const root = mount();
    const cards = root.querySelectorAll(".hub-card");
    expect(cards).toHaveLength(SUITE_GAMES.length);
    /* Derived rather than counted, so shipping a game is one registry edit and
       not also a test edit. */
    expect(root.querySelectorAll(".hub-card--planned"))
      .toHaveLength(SUITE_GAMES.length - LIVE_GAMES.length);
  });

  it("links only to built games", () => {
    const root = mount();
    const links = Array.from(root.querySelectorAll("a.hub-card__link"));
    expect(links).toHaveLength(LIVE_GAMES.length);
    expect(links.map((link) => link.getAttribute("href")))
      .toEqual(LIVE_GAMES.map((entry) => entry.path));
  });

  it("states each game's one sentence rule", () => {
    const root = mount();
    expect(root.textContent).toContain(POKER.oneLineRule);
  });

  it("hides the daily card until something is finished", () => {
    const root = mount();
    expect(root.querySelector(".hub-dailycard")!.classList.contains("dk-hidden")).toBe(true);
  });

  it("shows the daily card and a spoiler free block once a game is finished", () => {
    const store = openGameStore(
      { persistent: true, read: (k) => localStorage.getItem(k), write: (k, v) => { localStorage.setItem(k, v); return true; }, remove: (k) => localStorage.removeItem(k) },
      POKER,
    );
    store.save({
      ...emptyGameRecord(POKER.bucketCount),
      watermark: 3,
      history: [
        { puzzleNumber: 3, result: { score: 5000, won: null, bucket: 0, detail: "0 left", tier: 0 } },
      ],
    });

    const root = mount();
    const section = root.querySelector(".hub-dailycard")!;
    expect(section.classList.contains("dk-hidden")).toBe(false);
    const block = section.querySelector(".hub-dailycard__block")!.textContent ?? "";
    expect(block.split("\n")).toHaveLength(3);
    expect(block).toContain("DAILYKIT 2026-01-03 1/5");
    expect(block.endsWith("dailykit.providentia.games")).toBe(true);
    /* The block is decorative; the text equivalent is what a screen reader
       reads. Requirement 8.1. */
    expect(section.querySelector(".hub-dailycard__block")!.getAttribute("aria-hidden")).toBe("true");
    expect(root.textContent).toContain("1 of 5 finished");
  });

  it("marks a finished game with its tier name and not with color alone", () => {
    localStorage.setItem(
      "dailykit:poker-grid",
      JSON.stringify({
        ev: 1,
        gv: 1,
        data: {
          ...emptyGameRecord(POKER.bucketCount),
          watermark: 3,
          history: [
            { puzzleNumber: 3, result: { score: 1, won: null, bucket: 4, detail: "", tier: 2 } },
          ],
        },
      }),
    );
    const root = mount();
    const badge = root.querySelector(".hub-card--finished .hub-card__badge");
    expect(badge?.textContent).toBe("Good");
  });

  it("gives every card an accessible name carrying its status", () => {
    const root = mount();
    const labels = Array.from(root.querySelectorAll(".hub-card__link")).map((node) =>
      node.getAttribute("aria-label"),
    );
    expect(labels[0]).toContain("POKER GRID");
    expect(labels[0]).toContain("Not started");
    expect(labels[1]).toContain("Coming soon");
  });
});
