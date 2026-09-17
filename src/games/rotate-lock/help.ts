/** Layer 4. ROTATE LOCK help. One screen, and a worked example whose lines are
 *  their own text equivalent. ROTATE-LOCK.md 1 and 19. */

import type { HelpContent } from "../../core/types.js";

export const HELP: HelpContent = {
  headline: "Order and rotate the route pieces so the path takes every marked turn and ends at the lock.",
  steps: [
    "The route leaves S and follows the tray in order, each piece moving its length in the direction it points.",
    "Tap two pieces to swap them. Select a piece and press Rotate to turn it a quarter clockwise. Each is one move.",
    "The route must stay on the board, never cross itself, turn at every + and finish on L. It may also turn where nothing is marked.",
    "Open the lock in as few moves as you can. After 56 moves it jams.",
  ],
  example: {
    caption: "Tray: right 3, down 1, right 2. The route turns at the + and ends on L.",
    lines: ["S > > + . .", ". . . v > L"],
  },
};
