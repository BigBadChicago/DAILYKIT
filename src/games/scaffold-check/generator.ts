import { intBelow } from "../../core/rng.js";
import { rngFromSeed } from "../../core/seed.js";
import type { PuzzleNumber, Seed } from "../../core/types.js";

import { GRID_SIZE, type Puzzle } from "./rules.js";

export function generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): Puzzle {
  const rng = rngFromSeed(seed);
  const target = intBelow(rng, GRID_SIZE);
  return { number: puzzleNumber, target };
}
