/**
 * Layer 2. The how to play body. Requirement 3.7.
 *
 * HelpContent lives in core/types.ts so Layer 2 can consume the shared shape
 * without importing upward into the contract.
 */

import type { HelpContent } from "../core/types.js";
import { el } from "./dom.js";

export type HelpView = HelpContent;

export interface HelpPanelHandle {
  destroy(): void;
}

export function renderHelpPanel(host: HTMLElement, content: HelpView): HelpPanelHandle {
  const headline = el("p", { class: "dk-help__headline", text: content.headline });
  const steps = el(
    "ol",
    { class: "dk-help__steps" },
    content.steps.map((step) => el("li", { text: step })),
  );

  const exampleBody = el("div", { class: "dk-help__example-body" });
  if (content.example.draw) {
    // A drawn example is decorative. The lines below carry the same content as
    // text, so the caption plus lines remain the accessible version.
    exampleBody.setAttribute("aria-hidden", "true");
    content.example.draw(exampleBody);
  } else {
    for (const line of content.example.lines) {
      exampleBody.appendChild(el("p", { class: "dk-help__line", text: line }));
    }
  }

  const example = el("figure", { class: "dk-help__example" }, [
    exampleBody,
    el("figcaption", { class: "dk-help__caption", text: content.example.caption }),
    content.example.draw
      ? el(
          "div",
          { class: "dk-visually-hidden" },
          content.example.lines.map((line) => el("p", { text: line })),
        )
      : null,
  ]);

  const root = el("div", { class: "dk-help" }, [headline, steps, example]);
  host.appendChild(root);

  return {
    destroy(): void {
      root.remove();
    },
  };
}
