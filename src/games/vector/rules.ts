/**
 * Layer 4. VECTOR rules. VECTOR.md sections 4, 5 and 6.
 *
 * Pure. No DOM, no clock, no randomness. Every routine refusal is a value.
 */

import { err, ok, type Result } from "../../core/result.js";
import type {
  FinishedOutcomeV3,
  OutcomeV3,
  PuzzleNumber,
  Rejection,
  TierOrdinal,
} from "../../core/types.js";
import {
  CELLS,
  buildGeometry,
  candidateList,
  isCandidate,
  isOnBoard,
  intensityOf,
  nextCandidate,
  propagate,
  satisfies,
  type ArrowBoard,
  type ClueLayout,
  type Direction,
  type Geometry,
} from "./propagate.js";

export const MAX_SUBMISSIONS = 3;

/**
 * Player side effort for one submission. Counts actions the player took, never
 * anything about the board or the answer, which is what lets it ride in a
 * shareable artifact under VECTOR.md 6.1. ARCHITECTURE2 section 13.2.
 */
export interface Effort {
  /** Accepted cycle and set actions since the previous submission. */
  readonly cycles: number;
  /** Of those, the ones that landed on a cell already holding an arrow. */
  readonly changes: number;
}

export const NO_EFFORT: Effort = { cycles: 0, changes: 0 };

export interface VectorBest {
  /** The intensity measure. What the manifest stores and the bands are cut on. */
  readonly difficulty: number;
  /** Cells assigned in round one. */
  readonly opening: number;
}

export interface VectorPuzzle {
  readonly number: PuzzleNumber;
  readonly clues: ClueLayout;
  /** Derived once when the puzzle is parsed or generated, never serialized. */
  readonly geometry: Geometry;
  /** Null on a board generated past the horizon. The tier never reads it. */
  readonly best: VectorBest | null;
  readonly levers: readonly string[];
}

/**
 * The puzzle rides on the state because apply takes no puzzle argument and every
 * rule here is a statement about this board's rays. serialize drops it and
 * deserialize puts back the one the engine says the player is on, which is where
 * puzzle identity lives under contract decision 14.
 */
export interface VectorState {
  readonly puzzle: VectorPuzzle;
  readonly arrows: ArrowBoard;
  readonly submissions: number;
  readonly solved: boolean;
  /** One record per spent submission, in order. Length equals submissions. */
  readonly effort: readonly Effort[];
  /** Accumulating for the submission not yet made. */
  readonly pending: Effort;
}

export type VectorAction =
  | { readonly kind: "cycle"; readonly cell: number }
  | { readonly kind: "set"; readonly cell: number; readonly dir: Direction | null }
  | { readonly kind: "submit" };

export const REJECTIONS = {
  /** Developer error. Announced only because the type requires a string. */
  cellRange: { code: "cell-range", announce: "That cell is not on the board." },
  notABlank: { code: "not-a-blank", announce: "That cell holds a number." },
  notACandidate: {
    code: "not-a-candidate",
    announce: "That arrow would leave the board without reaching a number.",
  },
  incomplete: {
    code: "incomplete",
    announce: "Fill every blank cell before you submit.",
  },
  gameOver: { code: "game-over", announce: "This puzzle is finished." },
} as const satisfies Record<string, Rejection>;

export function makePuzzle(
  number: PuzzleNumber,
  clues: ClueLayout,
  best: VectorBest | null,
  levers: readonly string[],
): VectorPuzzle {
  return { number, clues, geometry: buildGeometry(clues), best, levers };
}

export function initialState(puzzle: VectorPuzzle): VectorState {
  return {
    puzzle,
    arrows: new Array<Direction | null>(CELLS).fill(null),
    submissions: 0,
    solved: false,
    effort: [],
    pending: NO_EFFORT,
  };
}

export function isBlank(puzzle: VectorPuzzle, cell: number): boolean {
  return puzzle.clues[cell] === null;
}

export function isFinished(state: VectorState): boolean {
  return state.solved || state.submissions >= MAX_SUBMISSIONS;
}

export function isComplete(state: VectorState): boolean {
  for (const cell of state.puzzle.geometry.blankCells) {
    if (state.arrows[cell] === null) return false;
  }
  return true;
}

export function isSatisfied(state: VectorState): boolean {
  return satisfies(state.puzzle.geometry, state.arrows);
}

export function candidatesFor(
  puzzle: VectorPuzzle,
  cell: number,
): readonly Direction[] {
  return candidateList(puzzle.geometry, cell);
}

function withArrow(
  state: VectorState,
  cell: number,
  dir: Direction | null,
): VectorState {
  const arrows = state.arrows.slice();
  // Read before the write: a cell that already held an arrow makes this a
  // correction rather than a first choice.
  const occupied = (arrows[cell] ?? null) !== null;
  arrows[cell] = dir;
  return {
    ...state,
    arrows,
    pending: {
      cycles: state.pending.cycles + 1,
      changes: state.pending.changes + (occupied ? 1 : 0),
    },
  };
}

export function apply(
  state: VectorState,
  action: VectorAction,
): Result<VectorState, Rejection> {
  if (isFinished(state)) return err(REJECTIONS.gameOver);

  if (action.kind === "submit") {
    if (!isComplete(state)) return err(REJECTIONS.incomplete);
    const solved = isSatisfied(state);
    return ok({
      ...state,
      submissions: state.submissions + 1,
      solved,
      effort: [...state.effort, state.pending],
      pending: NO_EFFORT,
    });
  }

  const { cell } = action;
  if (!isOnBoard(cell)) return err(REJECTIONS.cellRange);
  if (!isBlank(state.puzzle, cell)) return err(REJECTIONS.notABlank);

  if (action.kind === "cycle") {
    return ok(withArrow(state, cell, nextCandidate(state.puzzle.geometry, cell, state.arrows[cell] ?? null)));
  }

  if (action.dir !== null && !isCandidate(state.puzzle.geometry, cell, action.dir)) {
    return err(REJECTIONS.notACandidate);
  }
  return ok(withArrow(state, cell, action.dir));
}

/** Section 6.1. From the submission count alone, so it holds past the horizon. */
export function tierFor(state: VectorState): TierOrdinal {
  if (!state.solved) return 4;
  return (state.submissions - 1) as TierOrdinal;
}

/** Section 6.2. Four buckets, the win buckets in order and then the loss. */
export function bucketFor(state: VectorState): number {
  return state.solved ? state.submissions - 1 : MAX_SUBMISSIONS;
}

/**
 * Section 9.2 as amended by measurement. The intensity, recomputed from the
 * board every time rather than read from the manifest's stored
 * `best.difficulty`. A difficulty a generator asserts is a lever wearing a
 * measurement's name, ARCHITECTURE2 section 52 risk 2, and the two agreeing is
 * asserted by test against the shipped horizon. Zero on a board that does not
 * resolve, which no generated or manifest board is, because both screen for a
 * resolved propagation.
 */
export function difficultyFor(puzzle: VectorPuzzle): number {
  const result = propagate(puzzle.geometry);
  return result.kind === "resolved" ? intensityOf(puzzle.geometry, result.rounds) : 0;
}

/**
 * The v3 terminal result. Built for any state, finished or not, so the artifact
 * mapper has one shape to read; `inspect` is what gates it on being finished.
 */
export function finishedOutcomeFor(state: VectorState): FinishedOutcomeV3 {
  const common = {
    kind: "finished",
    tier: tierFor(state),
    bucket: bucketFor(state),
    difficulty: difficultyFor(state.puzzle),
  } as const;
  return state.solved
    ? {
        ...common,
        score: state.submissions,
        won: true,
        detail: `Solved on submission ${String(state.submissions)}`,
      }
    : { ...common, score: 0, won: false, detail: "Not solved" };
}

export function inspect(state: VectorState): OutcomeV3 {
  if (!isFinished(state)) return { kind: "ongoing" };
  return finishedOutcomeFor(state);
}
