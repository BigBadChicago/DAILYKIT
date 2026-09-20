/** Layer 4. WORD LADDER help. One screen, a worked example whose lines are their
 *  own text equivalent. WORD-LADDER.md 1 and 31. */

import type { HelpContent } from "../../core/types.js";

export const HELP: HelpContent = {
  headline: "Change one letter at a time to climb from the start word to the goal word in as few steps as you can.",
  steps: [
    "You start on the top word and climb toward the goal word shown below it.",
    "Each step changes exactly one letter, and every step must be a real four letter word.",
    "The shortest possible climb is par. Match it for the best result.",
    "Tap a letter tile then a key to change it, or type the whole word and press Enter.",
    "Stuck? Reveal shows one shortest climb and ends today's ladder.",
  ],
  example: {
    caption: "COLD to WARM in four steps: COLD, CORD, WORD, WARD, WARM. Each step changes one letter into a real word.",
    lines: ["cold, then cord, then word, then ward, then warm", "four steps, one letter changed each time"],
  },
};
