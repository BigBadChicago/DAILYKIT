/** Shared PANGRAM test fixtures: the committed lists, and a real day solved from
 *  them so every fixture passes through the shipped code path. */

import { readFileSync } from "node:fs";

import { makePuzzle, type PangramPuzzle } from "../../../src/games/pangram/rules.js";
import { indexWords, solveDay } from "../../../src/games/pangram/solver.js";

export function list(path: string): string[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .map((word) => word.trim())
    .filter(Boolean);
}

export const ACCEPTED = list("data/pangram/accepted.txt");
export const FAMILIAR = list("data/pangram/familiar.txt");
export const INDEX = indexWords(ACCEPTED, FAMILIAR);

/** The tutorial set: A B H I N O T, centre H. Every answer is familiar. */
export function tutorialPuzzle(number = 7): PangramPuzzle {
  const solved = solveDay(INDEX, "abhinot", "h");
  const made = makePuzzle(number, "abhinot", "h", solved.answers, ["test"]);
  if (!made.ok) throw new Error(made.error.detail);
  return made.value;
}
