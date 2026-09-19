/** Layer 4. DIFFERENCE RELAY help. One screen, and a worked example whose lines
 *  are their own text equivalent. DIFFERENCE-RELAY.md 1 and 19. */

import type { HelpContent } from "../../core/types.js";

export const HELP: HelpContent = {
  headline: "Order the numbers so every neighbouring pair differs by the amount marked between them.",
  steps: [
    "Six numbers sit in a row. Between each pair is a gap marked with a difference, or a question mark for a hidden one.",
    "Tap two numbers to swap them. Reordering is free.",
    "Run the relay to test the order. The baton crosses each gap while the two neighbours differ by that amount, and stops at the first that they do not.",
    "It tells you which station the baton reached. Reading where it stops is how you learn the hidden gaps.",
    "Cross every gap to win. You have six runs.",
  ],
  example: {
    caption: "Four numbers with gaps 1, hidden, 2. Running the order 3 1 2 4 stops the baton at station 2, so that first pair is wrong.",
    lines: ["numbers 3 1 2 4, gaps 1 then hidden then 2", "the baton reaches station 2 of 4"],
  },
};
