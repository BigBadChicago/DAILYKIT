import type { HelpContent } from "../../core/types.js";

export const CIPHER_HELP: HelpContent = {
  headline: "Break a four symbol code in six guesses from two numbers.",
  steps: [
    "Tap a shape to fill the next slot. Tap a filled slot to empty it.",
    "Fill all four slots, then submit. Filling the fourth slot does not submit for you.",
    "You are told how many shapes are in the right place, and how many are the right shape in the wrong place.",
    "You are never told which slot either number is about.",
    "A shape can appear more than once in the code, and any shape can be missing.",
  ],
  example: {
    caption: "code ●●▲■, guess ●▲●●, one in place and two misplaced",
    lines: ["guess  ● ▲ ● ●", "result 1 in place, 2 misplaced"],
  },
};
