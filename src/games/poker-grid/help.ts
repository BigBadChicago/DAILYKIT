import type { HelpContent } from "../../core/types.js";

export const POKER_GRID_HELP: HelpContent = {
  headline: "Clear the board by selecting five connected cards that make a poker hand.",
  steps: [
    "Drag across five cards that touch edge to edge. Diagonals do not count.",
    "Tap a card to add it. Tap a card already in your path to take back that card and everything after it.",
    "The five must make a pair or better. High card is not a hand.",
    "Cleared cards vanish, the columns fall, and no new cards arrive.",
    "Play until no five connected cards make a hand. There is no losing.",
  ],
  example: {
    caption: "two nines and three others, a pair, legal",
    lines: ["..x", "xxx", "..x"],
  },
};
