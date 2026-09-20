/** Layer 4. PANGRAM help. One screen, a worked example whose lines are their
 *  own text equivalent. PANGRAM.md 1 and 31. */

import type { HelpContent } from "../../core/types.js";

export const HELP: HelpContent = {
  headline:
    "Make words of four or more letters from the seven, always using the centre letter, and find the word that uses all seven.",
  steps: [
    "Tap letters to spell a word, or type it, then press Enter. Letters may repeat.",
    "Every word needs at least four letters and must include the centre letter.",
    "A word scores one point for each letter past three. A word using all seven letters is a pangram and scores seven more.",
    "Your rank rises as your score grows. The top rank needs a pangram.",
    "Finish whenever you like to end the day and see every word you missed.",
  ],
  example: {
    caption:
      "Letters A B I N O T with H in the centre: BATH scores 1, HABIT scores 2, and HABITATION uses all seven, scoring 7 plus 7.",
    lines: ["bath, 1 point", "habit, 2 points", "habitation, a pangram, 14 points", "tint is refused: no centre letter"],
  },
};
