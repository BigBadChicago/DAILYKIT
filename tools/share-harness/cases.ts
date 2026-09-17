/**
 * Sample outcomes for requirement 3.5.7. These are hand written blocks rather
 * than blocks produced by a game module, because the harness exists to eyeball
 * rendering across the whole outcome space including outcomes no current game
 * can produce. Cases the grammar refuses are kept on purpose, so the repaired
 * string engine decision 21 delivers can be eyeballed beside the good ones.
 */

import type { ShareText } from "../../src/engine/share-grammar.js";

export interface HarnessCase {
  readonly id: string;
  readonly note: string;
  readonly block: ShareText;
  /** True when the grammar is expected to refuse the case and repair it. */
  readonly faulted: boolean;
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
    faulted: false,
  },
  {
    id: "strong-result",
    note: "Six hands against a seven hand optimum.",
    block: {
      title: `POKER GRID #251 ${tiers[2]} streak 13`,
      rows: [["strong"], ["partial"], ["weak"], ["partial"], ["weak"], ["weak"]],
    },
    faulted: false,
  },
  {
    id: "poor-result",
    note: "Three hands, no streak.",
    block: {
      title: `POKER GRID #252 ${tiers[4]}`,
      rows: [["weak"], ["weak"], ["partial"]],
    },
    faulted: false,
  },
  {
    id: "unrated",
    note: "Past the manifest horizon. No tier name, never a streak.",
    block: {
      title: "POKER GRID #1120 unrated",
      rows: [["weak"], ["strong"], ["partial"], ["partial"]],
    },
    faulted: false,
  },
  {
    id: "one-hand",
    note: "Minimum non empty block, three lines total.",
    block: { title: `POKER GRID #253 ${tiers[4]}`, rows: [["weak"]] },
    faulted: false,
  },
  {
    id: "zero-hands",
    note: "Pathological board, no rows at all. Title and URL only.",
    block: { title: `POKER GRID #254 ${tiers[4]}`, rows: [] },
    faulted: false,
  },
  {
    id: "uniform-rows",
    note: "Seven identical glyphs. Checks that a monotone block still reads.",
    block: {
      title: `POKER GRID #255 ${tiers[1]} streak 2`,
      rows: [["weak"], ["weak"], ["weak"], ["weak"], ["weak"], ["weak"], ["weak"]],
    },
    faulted: false,
  },
  {
    id: "streak-boundary",
    note: "Streak of two, the lowest value that appears on a title.",
    block: { title: `POKER GRID #256 ${tiers[3]} streak 2`, rows: [["partial"], ["weak"]] },
    faulted: false,
  },
  {
    id: "ragged-bar-block",
    note: "Not POKER GRID. Rows of different widths. v3 has no padding, so the grammar refuses this as ragged and delivers it unchanged with a fault.",
    block: {
      title: "SAMPLE GAME #12 Great",
      rows: [
        ["best"],
        ["strong", "strong"],
        ["barFull", "barFull", "barFull", "barEmpty", "barEmpty", "barEmpty", "barEmpty"],
      ],
    },
    faulted: true,
  },
  {
    id: "max-rows",
    note: "Seven rows, the SHARE_MAX_ROWS ceiling and nine lines in all. Nothing should be truncated.",
    block: {
      title: "SAMPLE GAME #13 Excellent streak 40",
      rows: [
        ["best"], ["best"], ["strong"], ["strong"],
        ["partial"], ["weak"], ["miss"],
      ],
    },
    faulted: false,
  },
  {
    id: "over-max-rows",
    note: "Nine rows. Engine decision 21 truncates with a telemetry fault rather than throwing, so this must render seven rows.",
    block: {
      title: "SAMPLE GAME #14 Rough",
      rows: [
        ["miss"], ["miss"], ["miss"], ["miss"], ["miss"],
        ["miss"], ["miss"], ["miss"], ["miss"],
      ],
    },
    faulted: true,
  },
];
