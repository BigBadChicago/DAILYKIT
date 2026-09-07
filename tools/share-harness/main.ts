/**
 * Requirement 3.5.7. Renders every sample block at once so alignment, height,
 * and glyph rendering can be checked by eye in one screen.
 *
 * Never bundled into a production build. Selected by GAME=harness and excluded
 * by the same allow list that excludes toy-tap.
 */

import { el, on, setText } from "../../src/ui/dom.js";
import { installTheme, memoryThemePort } from "../../src/ui/theme.js";
import { HARNESS_CASES, type HarnessCase } from "./cases.js";
import { assembleShareString } from "./bind.js";

const SHARE_URL = "dailykit.providentia.games";

/** Grapheme count, not code unit length. Every share glyph outside the basic
 *  plane is a surrogate pair, so String.length reports double for them and a
 *  width check written against it would pass on a misaligned block. */
export function graphemeWidth(line: string): number {
  return Array.from(line).length;
}

export function widthReport(shareString: string): { widths: number[]; uniform: boolean } {
  const lines = shareString.split("\n");
  // First line is the title and last is the URL. Neither is part of the block.
  const rows = lines.slice(1, -1);
  const widths = rows.map(graphemeWidth);
  const uniform = widths.every((width) => width === widths[0]);
  return { widths, uniform };
}

function renderCase(sample: HarnessCase): HTMLElement {
  let text: string;
  let failed = false;
  try {
    text = assembleShareString(sample.block, { url: SHARE_URL });
  } catch (error) {
    failed = true;
    text = `assembly threw: ${String(error)}`;
  }
  const report = failed ? { widths: [], uniform: true } : widthReport(text);
  const lineCount = text.split("\n").length;

  const meta = el("p", { class: "hz-meta" });
  setText(
    meta,
    `${lineCount} lines, row widths ${report.widths.join(",") || "none"}, ${
      report.uniform ? "uniform" : "RAGGED"
    }`,
  );

  return el("section", { class: "hz-card" }, [
    el("h2", { class: "hz-card__id", text: sample.id }),
    el("p", { class: "hz-card__note", text: sample.note }),
    el("pre", { class: "hz-block", text }),
    meta,
    el("button", {
      class: "dk-iconbutton hz-copy",
      text: "Copy",
      attrs: { type: "button" },
      on: {
        click: () => {
          void navigator.clipboard?.writeText(text);
        },
      },
    }),
  ]);
}

export function mountHarness(root: HTMLElement): void {
  const theme = installTheme(memoryThemePort());
  const scaleValue = el("output", { class: "hz-scale__value", text: "1.0" });
  const scale = el("input", {
    attrs: { type: "range", min: "0.8", max: "3", step: "0.1", value: "1", "aria-label": "Glyph scale" },
  });
  const grid = el("div", { class: "hz-grid" }, HARNESS_CASES.map(renderCase));

  on(scale, "input", () => {
    const value = (scale as HTMLInputElement).value;
    setText(scaleValue, value);
    grid.style.setProperty("--hz-scale", value);
  });

  root.appendChild(
    el("div", { class: "hz-bar" }, [
      el("h1", { class: "hz-title", text: "Share harness" }),
      el("button", {
        class: "dk-iconbutton",
        text: "Theme",
        attrs: { type: "button" },
        on: { click: () => theme.cycle() },
      }),
      scale,
      scaleValue,
    ]),
  );
  root.appendChild(grid);
}

const host = document.getElementById("harness");
if (host) mountHarness(host);
