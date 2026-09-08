import { intBelow, shuffled, type Rng } from "../../core/rng.js";
import type { PuzzleNumber, Seed } from "../../core/types.js";
import { rngFromSeed } from "../../core/seed.js";
import { BOARD_CELLS, BOARD_COLS, BOARD_ROWS } from "./rules.js";
import { HAND_SIZE } from "./evaluator.js";

export interface PokerBest {
  readonly score: number;
  readonly hands: number;
  readonly method: "exact" | "beam";
  readonly width?: number;
}

/* Requirement 6.3.6. Card selection is a difficulty and flavor lever, and
   every lever applied to a board is recorded so difficulty can be audited
   later without rerunning the generator. */
/* The vocabulary is fixed by POKER-GRID.md Section 12. Three of the six are
   scheduled below; rank-clump and corner-isolate are named but unused, and
   stay named so a later difficulty pass adds a value rather than a word. */
export const LEVERS = ["none", "suit-bias", "rank-clump", "guaranteed-straight-flush", "sparse-pairs", "corner-isolate"] as const;
export type Lever = (typeof LEVERS)[number];

export interface PokerPuzzle {
  readonly number: PuzzleNumber;
  readonly cells: readonly number[];
  readonly best: PokerBest | null;
  readonly levers: readonly Lever[];
}

const DECK = Array.from({ length: 52 }, (_, card) => card);
const SUIT_COUNT = 4;
const RANK_COUNT = 13;
const BIASED_SUIT_SHARE = 3;

/* Charter decision 5. The epoch 2026-01-01 is a Thursday, so puzzle 1 sits at
   index 4 of a week that starts on Sunday. */
export const WEEKDAY_OFFSET = 4;

export function weekdayFor(puzzleNumber: PuzzleNumber): number {
  return (puzzleNumber - 1 + WEEKDAY_OFFSET) % 7;
}

/* Requirement 6.3.4. Monday is the gentlest day and Saturday the hardest,
   which is the shape players already read from other daily games. */
const LEVERS_BY_WEEKDAY: readonly (readonly Lever[])[] = [
  ["suit-bias"],                                  /* Sunday */
  ["none"],                                       /* Monday */
  ["none"],                                       /* Tuesday */
  ["suit-bias"],                                  /* Wednesday */
  ["sparse-pairs"],                               /* Thursday */
  ["suit-bias", "sparse-pairs"],                  /* Friday */
  ["sparse-pairs", "guaranteed-straight-flush"],  /* Saturday */
];

export function leversFor(puzzleNumber: PuzzleNumber): readonly Lever[] {
  return LEVERS_BY_WEEKDAY[weekdayFor(puzzleNumber)] as readonly Lever[];
}

function cardRank(card: number): number {
  return Math.floor(card / SUIT_COUNT);
}

function cardSuit(card: number): number {
  return card % SUIT_COUNT;
}

/* Two suits are drawn three times as often as the other two, which thins the
   flush and straight flush supply without ever duplicating a card. */
function suitBiasOrder(rng: Rng, deck: readonly number[]): readonly number[] {
  const first = intBelow(rng, SUIT_COUNT);
  let second = intBelow(rng, SUIT_COUNT - 1);
  if (second >= first) second += 1;
  const weighted: number[] = [];
  for (const card of deck) {
    const copies = cardSuit(card) === first || cardSuit(card) === second ? BIASED_SUIT_SHARE : 1;
    for (let i = 0; i < copies; i += 1) weighted.push(card);
  }
  const order: number[] = [];
  const taken = new Set<number>();
  for (const card of shuffled(rng, weighted)) {
    if (taken.has(card)) continue;
    taken.add(card);
    order.push(card);
  }
  return order;
}

/* Cards are ordered by how many of their rank came before them, so the board
   takes every rank once, then a second of each, and only then a third. With
   35 cells over 13 ranks no board can hold fewer than three of some rank, so
   this hits that floor exactly: nine ranks appear three times, four appear
   twice, and no rank ever appears four times. Trips stay available and quads
   become impossible, which is the difficulty this lever is for. */
function sparsePairsOrder(order: readonly number[]): readonly number[] {
  const buckets: number[][] = [[], [], [], []];
  const seen = new Map<number, number>();
  for (const card of order) {
    const rank = cardRank(card);
    const occurrence = seen.get(rank) ?? 0;
    seen.set(rank, occurrence + 1);
    (buckets[occurrence] as number[]).push(card);
  }
  return buckets.flat();
}

/* A vertical run of five in one column is connected under four way adjacency,
   so this guarantees the board contains at least one straight flush. */
function placeStraightFlush(rng: Rng, cells: number[]): void {
  const suit = intBelow(rng, SUIT_COUNT);
  const low = intBelow(rng, RANK_COUNT - HAND_SIZE + 1);
  const run = Array.from({ length: HAND_SIZE }, (_, step) => (low + step) * SUIT_COUNT + suit);
  const column = intBelow(rng, BOARD_COLS);
  const topRow = intBelow(rng, BOARD_ROWS - HAND_SIZE + 1);
  const targets = run.map((_, step) => (topRow + step) * BOARD_COLS + column);

  /* Cards displaced by the run swap into the cells the run cards vacated, so
     the board still holds 35 distinct cards. */
  for (let index = 0; index < run.length; index += 1) {
    const card = run[index] as number;
    const target = targets[index] as number;
    const existing = cells.indexOf(card);
    const displaced = cells[target] as number;
    cells[target] = card;
    if (existing >= 0) cells[existing] = displaced;
  }
}

export function generateBoard(rng: Rng, levers: readonly Lever[]): readonly number[] {
  let order: readonly number[] = levers.includes("suit-bias")
    ? suitBiasOrder(rng, DECK)
    : shuffled(rng, DECK);
  if (levers.includes("sparse-pairs")) order = sparsePairsOrder(order);
  const cells = order.slice(0, BOARD_CELLS);
  if (levers.includes("guaranteed-straight-flush")) placeStraightFlush(rng, cells);
  return cells;
}

export function generatePuzzle(puzzleNumber: PuzzleNumber, seed: Seed): PokerPuzzle {
  const levers = leversFor(puzzleNumber);
  return {
    number: puzzleNumber,
    cells: generateBoard(rngFromSeed(seed), levers),
    best: null,
    levers,
  };
}

export function isValidBoard(cells: readonly number[]): boolean {
  return cells.length === BOARD_CELLS
    && cells.every((card) => Number.isInteger(card) && card >= 0 && card < 52)
    && new Set(cells).size === BOARD_CELLS;
}
