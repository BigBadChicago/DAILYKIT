/**
 * Sample outcomes for requirement 3.5.7. These are hand written blocks rather
 * than blocks produced by a game module, because the harness exists to eyeball
 * rendering across the whole outcome space including outcomes no current game
 * can produce, for example an eight row block using bar tokens.
 */

import type { ShareBlock } from "../../src/core/types.js";

export interface HarnessCase {
  readonly id: string;
  readonly note: string;
  readonly block: ShareBlock;
}

const tiers = ["Excellent", "Great", "Good", "Fair", "Rough"] as const;

export const HARNESS_CASES: readonly HarnessCase[] = [
  {
    id: "perfect-clear",
    note: "Seven hands, tier 0, long streak. The tallest POKER GRID block.",
    block: {
      title: `POKER GRID #250 ${tiers[0]} streak 12`,
      rows: [["best"], ["strong"], ["partial"], ["partial"], ["weak"], ["weak"], ["strong"]],
    },
  },
  {
    id: "strong-result",
    note: "Six hands against a seven hand optimum.",
    block: {
      title: `POKER GRID #251 ${tiers[2]} streak 13`,
      rows: [["strong"], ["partial"], ["weak"], ["partial"], ["weak"], ["weak"]],
    },
  },
  {
    id: "poor-result",
    note: "Three hands, no streak.",
    block: {
      title: `POKER GRID #252 ${tiers[4]}`,
      rows: [["weak"], ["weak"], ["partial"]],
    },
  },
  {
    id: "unrated",
    note: "Past the manifest horizon. No tier name, never a streak.",
    block: {
      title: "POKER GRID #1120 unrated",
      rows: [["weak"], ["strong"], ["partial"], ["partial"]],
    },
  },
  {
    id: "one-hand",
    note: "Minimum non empty block, three lines total.",
    block: { title: `POKER GRID #253 ${tiers[4]}`, rows: [["weak"]] },
  },
  {
    id: "zero-hands",
    note: "Pathological board, no rows at all. Title and URL only.",
    block: { title: `POKER GRID #254 ${tiers[4]}`, rows: [] },
  },
  {
    id: "uniform-rows",
    note: "Seven identical glyphs. Checks that a monotone block still reads.",
    block: {
      title: `POKER GRID #255 ${tiers[1]} streak 2`,
      rows: [["weak"], ["weak"], ["weak"], ["weak"], ["weak"], ["weak"], ["weak"]],
    },
  },
  {
    id: "streak-boundary",
    note: "Streak of two, the lowest value that appears on a title.",
    block: { title: `POKER GRID #256 ${tiers[3]} streak 2`, rows: [["partial"], ["weak"]] },
  },
  {
    id: "ragged-bar-block",
    note: "Not POKER GRID. A future game mixing one glyph rows with a wide bar, which is what the engine's per block padding exists for.",
    block: {
      title: "SAMPLE GAME #12 Great",
      rows: [
        ["best"],
        ["strong", "strong"],
        ["barFull", "barFull", "barFull", "barEmpty", "barEmpty", "barEmpty", "barEmpty"],
      ],
    },
  },
  {
    id: "max-rows",
    note: "Eight rows, the SHARE_MAX_ROWS ceiling. Nothing should be truncated.",
    block: {
      title: "SAMPLE GAME #13 Excellent streak 40",
      rows: [
        ["best"], ["best"], ["strong"], ["strong"],
        ["partial"], ["partial"], ["weak"], ["miss"],
      ],
    },
  },
  {
    id: "over-max-rows",
    note: "Nine rows. Engine decision 21 truncates with a telemetry fault rather than throwing, so this must render eight rows.",
    block: {
      title: "SAMPLE GAME #14 Rough",
      rows: [
        ["miss"], ["miss"], ["miss"], ["miss"], ["miss"],
        ["miss"], ["miss"], ["miss"], ["miss"],
      ],
    },
  },
];
