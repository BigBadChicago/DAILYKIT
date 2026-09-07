// @vitest-environment jsdom
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createHeader } from "../../src/ui/header.js";
import { installTheme, memoryThemePort } from "../../src/ui/theme.js";

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
});
