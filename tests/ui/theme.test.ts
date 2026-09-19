// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyAccent, contrastMode, installTheme, memoryThemePort } from "../../src/ui/theme.js";
import { el } from "../../src/ui/dom.js";
import { readFileSync } from "node:fs";

const listeners = new Map<string, Set<(e: MediaQueryListEvent) => void>>();
let media: Record<string, boolean> = {};

function install(): void {
  listeners.clear();
  window.matchMedia = ((query: string) => ({
    matches: media[query] ?? false,
    media: query,
    addEventListener: (_t: string, fn: (e: MediaQueryListEvent) => void) => {
      if (!listeners.has(query)) listeners.set(query, new Set());
      listeners.get(query)!.add(fn);
    },
    removeEventListener: (_t: string, fn: (e: MediaQueryListEvent) => void) => {
      listeners.get(query)?.delete(fn);
    },
  })) as unknown as typeof window.matchMedia;
}

function fire(query: string, value: boolean): void {
  media[query] = value;
  for (const fn of listeners.get(query) ?? []) fn({ matches: value } as MediaQueryListEvent);
}

beforeEach(() => {
  media = {};
  install();
});

describe("installTheme", () => {
  it("follows the system when the choice is system", () => {
    media["(prefers-color-scheme: dark)"] = true;
    const root = el("html");
    const controller = installTheme(memoryThemePort(), root);
    expect(controller.resolved).toBe("dark");
    expect(root.getAttribute("data-theme")).toBe("dark");
    fire("(prefers-color-scheme: dark)", false);
    expect(controller.resolved).toBe("light");
    controller.destroy();
  });

  it("ignores the system once an explicit choice is set", () => {
    const root = el("html");
    const controller = installTheme(memoryThemePort(), root);
    controller.set("dark");
    fire("(prefers-color-scheme: dark)", false);
    expect(controller.resolved).toBe("dark");
    expect(root.getAttribute("data-theme-choice")).toBe("dark");
    controller.destroy();
  });

  it("cycles system then light then dark then back", () => {
    const controller = installTheme(memoryThemePort(), el("html"));
    expect(controller.choice).toBe("system");
    expect(controller.cycle()).toBe("light");
    expect(controller.cycle()).toBe("dark");
    expect(controller.cycle()).toBe("system");
    controller.destroy();
  });

  it("persists through the port and restores a stored choice", () => {
    const port = memoryThemePort();
    const first = installTheme(port, el("html"));
    first.set("dark");
    first.destroy();
    const second = installTheme(port, el("html"));
    expect(second.choice).toBe("dark");
    second.destroy();
  });

  it("treats an unrecognised stored value as system", () => {
    const port = { read: () => "purple" as never, write: vi.fn() };
    const controller = installTheme(port, el("html"));
    expect(controller.choice).toBe("system");
    controller.destroy();
  });

  it("notifies subscribers and stops after unsubscribe", () => {
    const controller = installTheme(memoryThemePort(), el("html"));
    const handler = vi.fn();
    const off = controller.subscribe(handler);
    controller.set("dark");
    expect(handler).toHaveBeenCalledWith("dark", "dark");
    off();
    controller.set("light");
    expect(handler).toHaveBeenCalledTimes(1);
    controller.destroy();
  });

  it("stops listening to the system after destroy", () => {
    const controller = installTheme(memoryThemePort(), el("html"));
    controller.destroy();
    fire("(prefers-color-scheme: dark)", true);
    expect(controller.resolved).toBe("light");
  });
});

describe("contrastMode", () => {
  it("prefers forced colors over more contrast", () => {
    media["(forced-colors: active)"] = true;
    media["(prefers-contrast: more)"] = true;
    expect(contrastMode()).toBe("forced");
  });

  it("reports more and normal", () => {
    media["(prefers-contrast: more)"] = true;
    expect(contrastMode()).toBe("more");
    media["(prefers-contrast: more)"] = false;
    expect(contrastMode()).toBe("normal");
  });
});

describe("applyAccent", () => {
  it("writes to the supplied host and never to the document root", () => {
    const host = el("div");
    applyAccent(host, { hue: "12", boardFontStack: "monospace" });
    expect(host.style.getPropertyValue("--dk-accent-hue")).toBe("12");
    expect(host.style.getPropertyValue("--dk-board-font")).toBe("monospace");
    expect(document.documentElement.style.getPropertyValue("--dk-accent-hue")).toBe("");
  });

  it("marks the host so the accent derived colours resolve against its hue", () => {
    const host = el("div");
    applyAccent(host, { hue: "308", boardFontStack: "monospace" });
    expect(host.hasAttribute("data-dk-accent")).toBe(true);
  });
});

describe("chrome.css accent carrier", () => {
  const css = readFileSync("src/ui/chrome.css", "utf-8");

  // Charter Phase 13 defect 1: a var() in a :root declaration resolves against
  // :root's hue, so every accent derived colour must be redeclared on the
  // element applyAccent marks, in every layer that declares it on :root.
  const layers = [
    ':root[data-theme="light"] [data-dk-accent]',
    ':root[data-theme="dark"] [data-dk-accent]',
  ];

  it.each(layers)("declares the accent colours for %s", (selector) => {
    const block = css.slice(css.indexOf(selector));
    const body = block.slice(block.indexOf("{"), block.indexOf("}"));
    expect(body).toContain("--dk-accent:");
    expect(body).toContain("--dk-focus:");
  });

  it("redeclares the accent inside the increased contrast layer", () => {
    const more = css.slice(css.indexOf("@media (prefers-contrast: more)"));
    const scoped = more.slice(0, more.indexOf("@media (forced-colors"));
    expect(scoped).toContain(':root[data-theme="light"] [data-dk-accent]');
    expect(scoped).toContain(':root[data-theme="dark"] [data-dk-accent]');
  });

  it("resets the accent carrier under forced colours", () => {
    const forced = css.slice(css.indexOf("@media (forced-colors: active)"));
    const carrier = forced.slice(forced.indexOf("[data-dk-accent]"));
    expect(carrier.slice(0, carrier.indexOf("}"))).toContain("--dk-accent: Highlight");
  });
});
