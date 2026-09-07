/** Node only. Measures generated opening availability and hand categories. */

import { generatePuzzle } from "../src/games/poker-grid/generator.js";
import { seedFor } from "../src/core/seed.js";
import { enumerateSelections, hasLegalMove } from "../src/games/poker-grid/rules.js";
import { classifyHand } from "../src/games/poker-grid/evaluator.js";
import { HAND_CATEGORIES, type HandCategory } from "../src/shared/poker-hands.js";

const DEFAULT_SAMPLES = 10_000;

export interface CalibrationReport {
  readonly samples: number;
  readonly boardsWithOpeningMove: number;
  readonly openingRate: number;
  readonly categoryCounts: Readonly<Record<HandCategory, number>>;
  readonly averageLegalSelections: number;
}

export function calibrate(samples = DEFAULT_SAMPLES): CalibrationReport {
  if (!Number.isInteger(samples) || samples < 1) throw new RangeError("samples must be positive");
  const categoryCounts = Object.fromEntries(HAND_CATEGORIES.map((category) => [category, 0])) as Record<HandCategory, number>;
  let boardsWithOpeningMove = 0;
  let totalLegalSelections = 0;

  for (let number = 1; number <= samples; number += 1) {
    const board = generatePuzzle(number, seedFor("poker-grid", number)).cells;
    const selections = enumerateSelections(board);
    let legal = 0;
    for (const selection of selections) {
      const category = classifyHand(selection.map((cell) => board[cell] as number));
      categoryCounts[category] += 1;
      if (category !== "high-card") legal += 1;
    }
    if (legal > 0 && hasLegalMove(board)) boardsWithOpeningMove += 1;
    totalLegalSelections += legal;
  }

  return {
    samples,
    boardsWithOpeningMove,
    openingRate: boardsWithOpeningMove / samples,
    categoryCounts,
    averageLegalSelections: totalLegalSelections / samples,
  };
}

if (process.argv[1]?.endsWith("calibrate.ts")) {
  const samples = Number(process.env["POKER_GRID_CALIBRATION_SAMPLES"] ?? DEFAULT_SAMPLES);
  process.stdout.write(`${JSON.stringify(calibrate(samples), null, 2)}\n`);
}

export { DEFAULT_SAMPLES };
