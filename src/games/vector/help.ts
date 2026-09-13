/**
 * Layer 4. The VECTOR onboarding panel. One screen, a worked micro example, and
 * almost no prose. Requirement 3.7.1.
 *
 * The example is a five cell strip rather than a board, because the smallest
 * thing that teaches the rule is one row with a zero at the end of it. It is an
 * illustration and does not satisfy the board invariants of VECTOR.md 3.4, which
 * is fine and is stated in the design document.
 */

import type { HelpContent } from "../../contract/types.js";
import { arrowSvg } from "./render.js";
import { LEFT } from "./propagate.js";

export function helpContent(): HelpContent {
  return {
    headline: "Point every arrow at a number.",
    steps: [
      "Tap a blank cell to turn its arrow. Each tap turns it to the next direction that reaches a number.",
      "An arrow travels in a straight line and stops at the first number it meets. Other arrows never block it.",
      "Every number must be reached by exactly that many arrows. A zero means no arrow may reach it.",
      "Fill every blank cell, then submit. You have three submissions, and a wrong one tells you only that it was wrong.",
    ],
    example: {
      caption: "Nothing may reach the zero, so all three arrows point left, and the three is reached three times.",
      lines: [
        "A three, then three blank cells, then a zero.",
        "Every blank can only point left or right.",
        "The zero refuses every arrow, so all three point left.",
        "The three is now reached exactly three times.",
      ],
      draw(host: HTMLElement): void {
        host.replaceChildren();
        const strip = document.createElement("div");
        strip.className = "vec-game vec-help-strip";
        strip.setAttribute("aria-hidden", "true");

        const row = document.createElement("div");
        row.className = "vec-row";
        row.style.setProperty("grid-template-columns", "repeat(5, 1fr)");

        const three = document.createElement("div");
        three.className = "vec-cell vec-cell--clue";
        three.textContent = "3";
        row.append(three);

        for (let at = 0; at < 3; at += 1) {
          const cell = document.createElement("div");
          cell.className = "vec-cell vec-cell--blank vec-cell--filled";
          cell.append(arrowSvg(LEFT));
          row.append(cell);
        }

        const zero = document.createElement("div");
        zero.className = "vec-cell vec-cell--clue";
        zero.textContent = "0";
        row.append(zero);

        strip.append(row);
        host.append(strip);
      },
    },
  };
}
