/**
 * Layer 2. The shared header. Requirement 7.3.8: identical chrome across the
 * suite, with identity carried by accent and board typography only.
 *
 * The back to hub link exists from this phase rather than from Phase 10. It is
 * a plain anchor to a URL the shell supplies, so the hub can be a static page
 * that does not exist yet without any of this code changing.
 */

import { el, setAttr, setText, on } from "./dom.js";
import type { ThemeChoice, ThemeController } from "./theme.js";

export interface HeaderOptions {
  readonly title: string;
  /** Absolute path to the hub. Root scope per the build model. */
  readonly hubUrl: string;
  readonly hubLabel?: string;
  readonly theme: ThemeController;
  readonly onHelp: () => void;
  readonly onStats: () => void;
  /** Omitted when the module sets archiveEnabled false. Requirement 3.6.2. */
  readonly onArchive?: () => void;
  readonly mountTo?: HTMLElement;
}

export interface HeaderView {
  readonly element: HTMLElement;
  setTitle(title: string): void;
  destroy(): void;
}

const THEME_GLYPH: Readonly<Record<ThemeChoice, string>> = {
  system: "\u25D0",
  light: "\u2600",
  dark: "\u263D",
};

const THEME_LABEL: Readonly<Record<ThemeChoice, string>> = {
  system: "Theme, following system. Activate to choose light.",
  light: "Theme, light. Activate to choose dark.",
  dark: "Theme, dark. Activate to follow the system.",
};

/**
 * Charter Phase 13 defect 2. At 360 pixels the title shares the row with five
 * 44 pixel icon buttons, so anything past about eleven characters was clipped
 * to an ellipsis: ROTATE LOCK read "ROTATE ...". The size steps down by name
 * length. Measurement, recorded in ARCHITECTURE2.md section 56, then forced a
 * hybrid: the title has 104 pixels there, and no legible size fits a name past
 * twelve characters on one line, so the two longest names wrap to two lines
 * instead of shrinking into illegibility. Stepping down is preferred wherever
 * it works, because a second line pushes the board down.
 */
export type TitleFit = "base" | "tight" | "tighter" | "wrap";

export function titleFit(title: string): TitleFit {
  const length = title.length;
  if (length <= 8) return "base";
  if (length <= 10) return "tight";
  if (length <= 12) return "tighter";
  return "wrap";
}

function applyTitleFit(element: HTMLElement, title: string): void {
  setAttr(element, "data-fit", titleFit(title));
}

export function createHeader(options: HeaderOptions): HeaderView {
  const hub = el("a", {
    class: "dk-iconbutton",
    text: "\u2190",
    attrs: { href: options.hubUrl, "aria-label": options.hubLabel ?? "All games" },
  });
  const title = el("h1", { class: "dk-header__title", text: options.title });
  applyTitleFit(title, options.title);
  const help = el("button", {
    class: "dk-iconbutton",
    text: "?",
    attrs: { type: "button", "aria-label": "How to play" },
  });
  const stats = el("button", {
    class: "dk-iconbutton",
    text: "\u2261",
    attrs: { type: "button", "aria-label": "Statistics" },
  });
  const archive = options.onArchive
    ? el("button", {
        class: "dk-iconbutton",
        text: "\u25F4",
        attrs: { type: "button", "aria-label": "Archive" },
      })
    : null;
  const theme = el("button", {
    class: "dk-iconbutton",
    attrs: { type: "button" },
  });

  const paintTheme = (): void => {
    setText(theme, THEME_GLYPH[options.theme.choice]);
    setAttr(theme, "aria-label", THEME_LABEL[options.theme.choice]);
  };
  paintTheme();

  const element = el("header", { class: "dk-header", attrs: { role: "banner" } }, [
    hub,
    title,
    archive,
    help,
    stats,
    theme,
  ]);

  const disposers = [
    on(help, "click", () => options.onHelp()),
    on(stats, "click", () => options.onStats()),
    on(theme, "click", () => {
      options.theme.cycle();
      paintTheme();
    }),
    options.theme.subscribe(() => paintTheme()),
  ];
  if (archive && options.onArchive) {
    disposers.push(on(archive, "click", () => options.onArchive?.()));
  }

  (options.mountTo ?? document.body).prepend(element);

  return {
    element,
    setTitle(next: string): void {
      setText(title, next);
      applyTitleFit(title, next);
    },
    destroy(): void {
      for (const dispose of disposers) dispose();
      element.remove();
    },
  };
}
