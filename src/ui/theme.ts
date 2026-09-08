/**
 * Layer 2. Theme resolution and per game accent application.
 * Section 4, Layer 2.3, and requirement 7.3.8.
 *
 * High contrast is not a fourth choice. prefers-contrast and forced-colors are
 * layered over light and dark in chrome.css, which means the player never has
 * to find a setting their platform already knows about, and the number of
 * states this module tracks stays at three.
 */

export type ThemeChoice = "system" | "light" | "dark";
export type ResolvedTheme = "light" | "dark";
export type ContrastMode = "normal" | "more" | "forced";

/**
 * Persistence is injected. Layer 1 storage owns the suite record, and having
 * Layer 2 reach into it would put a storage key name in the presentation kit.
 */
export interface ThemePort {
  read(): ThemeChoice | null;
  write(choice: ThemeChoice): void;
}

export interface ThemeController {
  readonly choice: ThemeChoice;
  readonly resolved: ResolvedTheme;
  set(choice: ThemeChoice): void;
  /** system, then light, then dark, then back. */
  cycle(): ThemeChoice;
  subscribe(handler: (resolved: ResolvedTheme, choice: ThemeChoice) => void): () => void;
  destroy(): void;
}

const CYCLE: readonly ThemeChoice[] = ["system", "light", "dark"];

export const memoryThemePort = (): ThemePort => {
  let held: ThemeChoice | null = null;
  return { read: () => held, write: (choice) => { held = choice; } };
};

export function installTheme(
  port: ThemePort,
  root: HTMLElement = document.documentElement,
): ThemeController {
  const query = window.matchMedia("(prefers-color-scheme: dark)");
  const stored = port.read();
  let choice: ThemeChoice = stored === "light" || stored === "dark" ? stored : "system";
  let resolved: ResolvedTheme = "light";
  const handlers = new Set<(r: ResolvedTheme, c: ThemeChoice) => void>();

  const resolve = (systemMatches = query.matches): ResolvedTheme =>
    choice === "system" ? (systemMatches ? "dark" : "light") : choice;

  // Subscribers are notified on every apply, not only when resolved changes:
  // system to light while already light changes choice, and the header's glyph
  // reads choice rather than resolved.
  const apply = (systemMatches = query.matches): void => {
    resolved = resolve(systemMatches);
    root.setAttribute("data-theme", resolved);
    root.setAttribute("data-theme-choice", choice);
    // color-scheme drives form controls and the scrollbar, which no custom
    // property reaches.
    root.style.setProperty("color-scheme", resolved);
    for (const handler of handlers) handler(resolved, choice);
  };

  const onSystemChange = (event: Event): void => {
    if (choice === "system") apply((event as MediaQueryListEvent).matches);
  };
  query.addEventListener("change", onSystemChange);
  apply();

  return {
    get choice(): ThemeChoice { return choice; },
    get resolved(): ResolvedTheme { return resolved; },
    set(next: ThemeChoice): void {
      choice = next;
      port.write(next);
      apply();
    },
    cycle(): ThemeChoice {
      const index = CYCLE.indexOf(choice);
      const next = CYCLE[(index + 1) % CYCLE.length]!;
      this.set(next);
      return next;
    },
    subscribe(handler): () => void {
      handlers.add(handler);
      return () => handlers.delete(handler);
    },
    destroy(): void {
      query.removeEventListener("change", onSystemChange);
      handlers.clear();
    },
  };
}

export function contrastMode(): ContrastMode {
  if (window.matchMedia("(forced-colors: active)").matches) return "forced";
  if (window.matchMedia("(prefers-contrast: more)").matches) return "more";
  return "normal";
}

export interface Accent {
  readonly hue: string;
  readonly boardFontStack: string;
}

/**
 * Scoped to the game root, never to documentElement. Requirement 7.3.8 gives a
 * game its identity here and nowhere else, and a suite hub showing five accents
 * at once cannot have any of them set globally.
 */
export function applyAccent(host: HTMLElement, accent: Accent): void {
  host.style.setProperty("--dk-accent-hue", accent.hue);
  host.style.setProperty("--dk-board-font", accent.boardFontStack);
}
