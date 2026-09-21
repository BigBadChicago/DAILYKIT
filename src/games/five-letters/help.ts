/** Layer 4. FIVE LETTERS help. One screen, a worked example whose lines are
 *  their own text equivalent. FIVE-LETTERS.md 1 and 31. */

import type { HelpContent } from "../../core/types.js";

export const HELP: HelpContent = {
  headline: "Find the five letter word in six guesses, each letter marked right, present or absent.",
  steps: [
    "Type a five letter word, or tap the letter keys, then press Enter.",
    "Right means the letter is in that position. Present means the word has it elsewhere. Absent means no more copies.",
    "A letter is marked right or present only as many times as the word holds it, and exact matches are marked first.",
    "The keyboard remembers the best mark each letter has earned.",
  ],
  example: {
    caption: "The word is HEART. Guessing TREAT: the last T is right, so the first T is absent; R, E and A are present.",
    lines: ["T absent", "R present", "E present", "A present", "T right"],
  },
};
