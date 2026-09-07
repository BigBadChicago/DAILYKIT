// @vitest-environment jsdom
import { afterEach, describe, expect, it, vi } from "vitest";
import { el } from "../../src/ui/dom.js";
import {
  createLiveRegion,
  focusableWithin,
  onReducedMotionChange,
  prefersReducedMotion,
  trapFocus,
} from "../../src/ui/a11y.js";

function stubMatchMedia(matches: Record<string, boolean>): { fire: (q: string, v: boolean) => void } {
  const listeners = new Map<string, Set<(e: MediaQueryListEvent) => void>>();
  window.matchMedia = ((query: string) => ({
    matches: matches[query] ?? false,
    media: query,
    addEventListener: (_t: string, fn: (e: MediaQueryListEvent) => void) => {
      if (!listeners.has(query)) listeners.set(query, new Set());
      listeners.get(query)!.add(fn);
    },
    removeEventListener: (_t: string, fn: (e: MediaQueryListEvent) => void) => {
      listeners.get(query)?.delete(fn);
    },
  })) as unknown as typeof window.matchMedia;
  return {
    fire(query: string, value: boolean): void {
      for (const fn of listeners.get(query) ?? []) fn({ matches: value } as MediaQueryListEvent);
    },
  };
}

afterEach(() => {
  document.body.innerHTML = "";
});

describe("focus trap", () => {
  it("wraps Tab forward and backward and restores focus on release", () => {
    const outside = el("button", { text: "outside" });
    const first = el("button", { text: "first" });
    const last = el("button", { text: "last" });
    const box = el("div", { attrs: { tabindex: "-1" } }, [first, last]);
    document.body.append(outside, box);
    outside.focus();

    // jsdom reports offsetParent as null for everything, so focusableWithin
    // would filter all of them out. Force layout visibility for the test.
    for (const node of [first, last]) {
      Object.defineProperty(node, "offsetParent", { get: () => box, configurable: true });
    }

    const trap = trapFocus(box);
    expect(document.activeElement).toBe(first);

    last.focus();
    box.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true }));
    expect(document.activeElement).toBe(first);

    box.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true }));
    expect(document.activeElement).toBe(last);

    trap.release();
    expect(document.activeElement).toBe(outside);
  });

  it("focuses the container when nothing inside is focusable", () => {
    const box = el("div", { attrs: { tabindex: "-1" } });
    document.body.append(box);
    expect(focusableWithin(box)).toEqual([]);
    const trap = trapFocus(box);
    expect(document.activeElement).toBe(box);
    trap.release();
  });
});

describe("live region", () => {
  it("creates a polite and an assertive region and routes by flag", () => {
    const region = createLiveRegion();
    const nodes = document.querySelectorAll("[aria-live]");
    expect(nodes.length).toBe(2);
    region.announce("polite one");
    region.announce("urgent one", true);
    expect(document.querySelector("[aria-live=polite]")!.textContent).toContain("polite one");
    expect(document.querySelector("[aria-live=assertive]")!.textContent).toContain("urgent one");
    region.destroy();
    expect(document.querySelectorAll("[aria-live]").length).toBe(0);
  });

  it("re announces an identical message by changing the text content", () => {
    const region = createLiveRegion();
    const polite = document.querySelector("[aria-live=polite]")!;
    region.announce("same");
    const first = polite.textContent;
    region.announce("same");
    expect(polite.textContent).not.toBe(first);
    expect(polite.textContent!.trim()).toBe("same");
    region.destroy();
  });
});

describe("reduced motion", () => {
  it("reads the query and reports changes", () => {
    const media = stubMatchMedia({ "(prefers-reduced-motion: reduce)": true });
    expect(prefersReducedMotion()).toBe(true);
    const handler = vi.fn();
    const off = onReducedMotionChange(handler);
    media.fire("(prefers-reduced-motion: reduce)", false);
    expect(handler).toHaveBeenCalledWith(false);
    off();
    media.fire("(prefers-reduced-motion: reduce)", true);
    expect(handler).toHaveBeenCalledTimes(1);
  });
});
