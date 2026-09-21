/** Shared FIVE LETTERS test fixtures: puzzles built through the shipped list. */

import { readFileSync } from "node:fs";

import { candidatesAfterOpening } from "../../../src/games/five-letters/difficulty.js";
import { makePuzzle, type FiveLettersPuzzle } from "../../../src/games/five-letters/rules.js";
import { ACCEPTED_WORDS } from "../../../src/games/five-letters/words.js";

export function list(path: string): string[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .map((word) => word.trim())
    .filter(Boolean);
}

export const ACCEPTED = new Set(ACCEPTED_WORDS);

export function puzzleFor(answer: string, number = 7): FiveLettersPuzzle {
  const made = makePuzzle(number, answer, ACCEPTED, candidatesAfterOpening(answer, ACCEPTED_WORDS), ["test"]);
  if (!made.ok) throw new Error(made.error.detail);
  return made.value;
}
