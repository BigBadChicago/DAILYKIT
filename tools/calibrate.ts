/** Node only. The Locked decision 5 availability study. */

import { mkdirSync, writeFileSync } from "node:fs";
import { generateBoard, generatePuzzle } from "../src/games/poker-grid/generator.js";
import { rngFromSeed, seedFor } from "../src/core/seed.js";
import { visitSelections } from "../src/games/poker-grid/rules.js";
import { playGreedy } from "../src/games/poker-grid/greedy.js";
import { classifyHand } from "../src/games/poker-grid/evaluator.js";
import { HAND_CATEGORIES, type HandCategory } from "../src/shared/poker-hands.js";
import { HAND_POINTS, HAND_POINTS_CEILING, HAND_POINTS_FLOOR, type ScoringCategory } from "../src/games/poker-grid/scoring.js";

const DEFAULT_SAMPLES = 10_000;
const OUTPUT = "data/poker-grid/calibration.json";

export interface CalibrationReport {
  readonly samples: number;
  readonly selections: number;
  readonly boardsWithOpeningMove: number;
  readonly categoryCounts: Readonly<Record<HandCategory, number>>;
  /* Measured on unlevered deals. See the note on calibrate below. */
  readonly shareOfLegal: Readonly<Record<ScoringCategory, number>>;
  readonly compressionExponent: number;
  /* What the compression curve says the table should be, against what the
     table actually holds after rounding for feel. A drift here is the signal
     to retune, not an automatic failure. */
  readonly derivedPoints: Readonly<Record<ScoringCategory, number>>;
  readonly currentPoints: Readonly<Record<ScoringCategory, number>>;
  /* Measured on the scheduled boards, levers included. Tiers 2, 3 and 4 are
     decided by hand count alone, so this is what the tier ladder will show.
     Index is hands played. */
  readonly greedyHandCounts: readonly number[];
}

const SCORING_CATEGORIES = HAND_CATEGORIES.filter((category): category is ScoringCategory => category !== "high-card");

/* Two measures, deliberately taken on different boards.

   Availability is measured on unlevered deals. Levers move supply around by
   design: sparse-pairs caps a rank at three cards and so removes four of a
   kind entirely, while guaranteed-straight-flush plants one. Calibrating the
   table on levered boards therefore prices four of a kind above a straight
   flush, which inverts the shared hand ordering and would be indefensible to
   a player on any day of the week. The table is a property of the game, so it
   is measured on the game's base deal, and levers shift what a given day
   offers against that fixed table.

   The greedy hand count distribution is measured on the scheduled boards,
   levers and all, because POKER-GRID.md Section 15 wants it as a read on what
   the tier ladder will actually show, and that is a fact about real days.

   Every selection on every sampled board is counted. Sampling a prefix of the
   walk would bias the count toward whichever corner the walk starts in. */
export function calibrate(samples = DEFAULT_SAMPLES): CalibrationReport {
  if (!Number.isInteger(samples) || samples < 1) throw new RangeError("samples must be positive");
  const categoryCounts = Object.fromEntries(HAND_CATEGORIES.map((category) => [category, 0])) as Record<HandCategory, number>;
  let boardsWithOpeningMove = 0;
  let selections = 0;
  const greedyHandCounts = Array<number>(8).fill(0);

  for (let number = 1; number <= samples; number += 1) {
    const seed = seedFor("poker-grid", number);
    const unlevered = generateBoard(rngFromSeed(seed), ["none"]);
    let opening = false;
    visitSelections(unlevered, (selection) => {
      const category = classifyHand(selection.map((cell) => unlevered[cell] as number));
      categoryCounts[category] += 1;
      selections += 1;
      if (category !== "high-card") opening = true;
      return false;
    });
    if (opening) boardsWithOpeningMove += 1;
    const scheduled = generatePuzzle(number, seed).cells;
    const greedy = playGreedy(scheduled, rngFromSeed(seedFor("poker-grid", number, "calibration")));
    const bucket = Math.min(greedy.hands, greedyHandCounts.length - 1);
    greedyHandCounts[bucket] = (greedyHandCounts[bucket] as number) + 1;
  }

  const legal = selections - categoryCounts["high-card"];
  const shareOfLegal = Object.fromEntries(
    SCORING_CATEGORIES.map((category) => [category, categoryCounts[category] / legal]),
  ) as Record<ScoringCategory, number>;

  /* Anchor the floor at a bare pair and solve the exponent that puts the
     rarest measured category exactly on the ceiling. */
  const rarest = Math.min(...SCORING_CATEGORIES.map((category) => shareOfLegal[category]));
  const widestRatio = shareOfLegal["one-pair"] / rarest;
  const compressionExponent = Math.log(HAND_POINTS_CEILING / HAND_POINTS_FLOOR) / Math.log(widestRatio);
  const derivedPoints = Object.fromEntries(
    SCORING_CATEGORIES.map((category) => [
      category,
      Math.round(HAND_POINTS_FLOOR * (shareOfLegal["one-pair"] / shareOfLegal[category]) ** compressionExponent),
    ]),
  ) as Record<ScoringCategory, number>;

  return {
    samples,
    selections,
    boardsWithOpeningMove,
    categoryCounts,
    shareOfLegal,
    compressionExponent,
    derivedPoints,
    currentPoints: HAND_POINTS,
    greedyHandCounts,
  };
}

if (process.argv[1]?.endsWith("calibrate.ts")) {
  const samples = Number(process.env["POKER_GRID_CALIBRATION_SAMPLES"] ?? DEFAULT_SAMPLES);
  const report = calibrate(samples);
  mkdirSync("data/poker-grid", { recursive: true });
  writeFileSync(OUTPUT, `${JSON.stringify(report, null, 2)}\n`, "utf8");
  process.stdout.write(`${JSON.stringify({ samples: report.samples, selections: report.selections, derivedPoints: report.derivedPoints, currentPoints: report.currentPoints }, null, 2)}\n`);
}

export { DEFAULT_SAMPLES, OUTPUT };
