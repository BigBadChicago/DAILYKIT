// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHeader, titleFit } from "../../src/ui/header.js";
import { installTheme, memoryThemePort } from "../../src/ui/theme.js";
import { readFileSync } from "node:fs";

beforeEach(() => {
  window.matchMedia = ((query: string) => ({
    matches: false,
    media: query,
    addEventListener: () => {},
    removeEventListener: () => {},
  })) as unknown as typeof window.matchMedia;
});

afterEach(() => {
  document.body.innerHTML = "";
});

function build(overrides: Partial<Parameters<typeof createHeader>[0]> = {}) {
  const theme = installTheme(memoryThemePort(), document.documentElement);
  const view = createHeader({
    title: "POKER GRID",
    hubUrl: "/",
    theme,
    onHelp: vi.fn(),
    onStats: vi.fn(),
    ...overrides,
  });
  return { view, theme };
}

describe("header", () => {
  it("carries a hub link as a plain anchor", () => {
    const { view, theme } = build({ hubUrl: "/" });
    const hub = view.element.querySelector("a")!;
    expect(hub.getAttribute("href")).toBe("/");
    expect(hub.getAttribute("aria-label")).toBe("All games");
    view.destroy();
    theme.destroy();
  });

  it("omits the archive button unless a handler is supplied", () => {
    const withoutArchive = build();
    expect(withoutArchive.view.element.querySelector("[aria-label=Archive]")).toBeNull();
    withoutArchive.view.destroy();
    withoutArchive.theme.destroy();

    const onArchive = vi.fn();
    const withArchive = build({ onArchive });
    const button = withArchive.view.element.querySelector<HTMLElement>("[aria-label=Archive]")!;
    button.click();
    expect(onArchive).toHaveBeenCalledTimes(1);
    withArchive.view.destroy();
    withArchive.theme.destroy();
  });

  it("wires help and stats", () => {
    const onHelp = vi.fn();
    const onStats = vi.fn();
    const { view, theme } = build({ onHelp, onStats });
    view.element.querySelector<HTMLElement>("[aria-label='How to play']")!.click();
    view.element.querySelector<HTMLElement>("[aria-label=Statistics]")!.click();
    expect(onHelp).toHaveBeenCalledTimes(1);
    expect(onStats).toHaveBeenCalledTimes(1);
    view.destroy();
    theme.destroy();
  });

  it("cycles the theme and relabels the button each time", () => {
    const { view, theme } = build();
    const button = view.element.querySelector<HTMLElement>("[aria-label^=Theme]")!;
    expect(button.getAttribute("aria-label")).toContain("following system");
    button.click();
    expect(theme.choice).toBe("light");
    expect(button.getAttribute("aria-label")).toContain("light");
    button.click();
    expect(button.getAttribute("aria-label")).toContain("dark");
    view.destroy();
    theme.destroy();
  });

  it("setTitle updates in place and destroy detaches", () => {
    const { view, theme } = build();
    view.setTitle("SAMPLE GAME");
    expect(view.element.querySelector("h1")!.textContent).toBe("SAMPLE GAME");
    view.destroy();
    expect(document.querySelector(".dk-header")).toBeNull();
    theme.destroy();
  });

  // Charter Phase 13 defect 2. Every display name in the suite, present and
  // planned, must be shown whole at 360 pixels.
  it.each([
    ["CIPHER", "base"],
    ["VECTOR", "base"],
    ["POKER GRID", "tight"],
    ["TURN TABLE", "tight"],
    ["ROTATE LOCK", "tighter"],
    ["RING BALANCE", "tighter"],
    ["DIFFERENCE RELAY", "wrap"],
    ["ORDER OF OPERATIONS", "wrap"],
  ])("fits %s at step %s", (name, fit) => {
    expect(titleFit(name)).toBe(fit);
  });

  it("marks the title with its step and restates it on setTitle", () => {
    const { view, theme } = build({ title: "ROTATE LOCK" });
    const heading = view.element.querySelector("h1")!;
    expect(heading.getAttribute("data-fit")).toBe("tighter");
    view.setTitle("ORDER OF OPERATIONS");
    expect(heading.getAttribute("data-fit")).toBe("wrap");
    view.destroy();
    theme.destroy();
  });

  it("lets the header grow when the title wraps", () => {
    const css = readFileSync("src/ui/chrome.css", "utf-8");
    const block = css.slice(css.indexOf(".dk-header {"));
    const body = block.slice(0, block.indexOf("}"));
    expect(body).toContain("min-height:");
    expect(body).not.toContain("\n  height:");
  });

  it("declares a font size for every step but the base", () => {
    const css = readFileSync("src/ui/chrome.css", "utf-8");
    for (const fit of ["tight", "tighter", "wrap"]) {
      const at = css.indexOf(`.dk-header__title[data-fit="${fit}"]`);
      expect(at).toBeGreaterThan(-1);
      expect(css.slice(at, css.indexOf("}", at))).toContain("font-size:");
    }
  });
});
