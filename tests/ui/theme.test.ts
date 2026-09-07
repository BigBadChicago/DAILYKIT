// @vitest-environment jsdom
import { beforeEach, describe, expect, it, vi } from "vitest";
import { applyAccent, contrastMode, installTheme, memoryThemePort } from "../../src/ui/theme.js";
import { el } from "../../src/ui/dom.js";

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
});
