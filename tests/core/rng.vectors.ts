/**
 * Committed determinism vectors. Requirement 10.2.
 *
 * These are compared against, never recomputed by the test. Changing the
 * generator, the seed hash, or the warmup count changes every board the project
 * has ever produced, so it must appear in a commit diff as an explicit table
 * change and never as a silently passing refactor. Regenerate with
 * `npm run rng:vectors`, which writes this file.
 */

export interface RngVector {
  readonly gameId: string;
  readonly puzzleNumber: number;
  readonly salt: string | null;
  readonly seed: number;
  readonly draws: readonly number[];
}

export const RNG_VECTORS: readonly RngVector[] = [
  {
    gameId: "poker-grid",
    puzzleNumber: 1,
    salt: null,
    seed: 3502102382,
    draws: [2580282271, 3003566951, 2944832301, 3794871314, 1563435873, 4215341439, 761029086, 4210401534],
  },
  {
    gameId: "poker-grid",
    puzzleNumber: 2,
    salt: null,
    seed: 1388666841,
    draws: [2756206677, 2787254008, 1990739527, 1704867107, 205097318, 670684113, 1306355013, 1807950246],
  },
  {
    gameId: "poker-grid",
    puzzleNumber: 250,
    salt: null,
    seed: 1491536658,
    draws: [233957647, 2979421409, 3672882188, 2236082451, 4053539820, 4137876425, 4047150513, 2000453726],
  },
  {
    gameId: "poker-grid",
    puzzleNumber: 250,
    salt: "retry-1",
    seed: 3998234066,
    draws: [3403814082, 3064106360, 548260721, 781733955, 4015762084, 3566148307, 1780611706, 3368068490],
  },
  {
    gameId: "toy-tap",
    puzzleNumber: 1,
    salt: null,
    seed: 3564136808,
    draws: [553888365, 3794704988, 2523865214, 308100405, 3651218274, 202160736, 4151290563, 4088950586],
  },
];

/** First 35 cards of a full deck shuffle under poker-grid puzzle 1. Guards the
 *  shuffle helper as well as the generator, because a change to the Fisher
 *  Yates direction would leave the raw draws above untouched. */
export const DECK_VECTOR_PUZZLE_1: readonly number[] = [
  11, 16, 0, 6, 22, 38, 46, 7, 42, 12, 48, 41, 37, 29, 4, 14, 3, 43, 18, 51, 5, 21, 31, 44, 25, 2, 10, 23, 40, 8, 13, 30, 50, 19, 15,
];
