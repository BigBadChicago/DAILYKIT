/**
 * Node only. Rewrites tests/core/rng.vectors.ts.
 *
 * The regeneration path is deliberate and manual. Running this is a statement
 * that the stream was meant to change.
 */

import { writeFileSync } from "node:fs";
import { shuffled } from "../src/core/rng.js";
import { rngFor, seedFor } from "../src/core/seed.js";

interface VectorCase {
  readonly gameId: string;
  readonly puzzleNumber: number;
  readonly salt?: string;
}

const CASES: readonly VectorCase[] = [
  { gameId: "poker-grid", puzzleNumber: 1 },
  { gameId: "poker-grid", puzzleNumber: 2 },
  { gameId: "poker-grid", puzzleNumber: 250 },
  { gameId: "poker-grid", puzzleNumber: 250, salt: "retry-1" },
  { gameId: "toy-tap", puzzleNumber: 1 },
];

const DRAW_COUNT = 8;
const OUTPUT_PATH = "tests/core/rng.vectors.ts";

const header = `/**
 * Committed determinism vectors. Requirement 10.2.
 *
 * These are compared against, never recomputed by the test. Changing the
 * generator, the seed hash, or the warmup count changes every board the project
 * has ever produced, so it must appear in a commit diff as an explicit table
 * change and never as a silently passing refactor. Regenerate with
 * \`npm run rng:vectors\`, which writes this file.
 */

export interface RngVector {
  readonly gameId: string;
  readonly puzzleNumber: number;
  readonly salt: string | null;
  readonly seed: number;
  readonly draws: readonly number[];
}
`;

const entries = CASES.map((testCase) => {
  const seed = seedFor(testCase.gameId, testCase.puzzleNumber, testCase.salt);
  const rng = rngFor(testCase.gameId, testCase.puzzleNumber, testCase.salt);
  const draws: number[] = [];
  for (let i = 0; i < DRAW_COUNT; i += 1) draws.push(rng.nextUint32());
  const salt = testCase.salt === undefined ? "null" : JSON.stringify(testCase.salt);
  return [
    "  {",
    `    gameId: ${JSON.stringify(testCase.gameId)},`,
    `    puzzleNumber: ${testCase.puzzleNumber},`,
    `    salt: ${salt},`,
    `    seed: ${seed},`,
    `    draws: [${draws.join(", ")}],`,
    "  },",
  ].join("\n");
}).join("\n");

const deckRng = rngFor("poker-grid", 1);
const deck = shuffled(deckRng, Array.from({ length: 52 }, (_unused, i) => i)).slice(0, 35);

const body = `
export const RNG_VECTORS: readonly RngVector[] = [
${entries}
];

/** First 35 cards of a full deck shuffle under poker-grid puzzle 1. Guards the
 *  shuffle helper as well as the generator, because a change to the Fisher
 *  Yates direction would leave the raw draws above untouched. */
export const DECK_VECTOR_PUZZLE_1: readonly number[] = [
  ${deck.join(", ")},
];
`;

writeFileSync(OUTPUT_PATH, `${header}${body}`, "utf8");
process.stdout.write(`wrote ${OUTPUT_PATH}\n`);
