/**
 * Layer 4. WORD LADDER rules. WORD-LADDER.md sections 5, 17 and 18.
 *
 * Pure: no DOM, no clock, no randomness. ladder.ts is the graph and the rung
 * test; solver.ts is par, fairness and difficulty; this file is the climb, the
 * reveal, the end of the day and its grade. Every refused action is a value.
 */

import { err, ok, type Result } from "../../core/result.js";
import type {
  BucketId,
  FinishedOutcomeV3,
  OutcomeV3,
  PuzzleNumber,
  Rejection,
  TierOrdinal,
} from "../../core/types.js";
import { WORD_LENGTH, isOneChange, type WordGraph } from "./ladder.js";
import { solveWith } from "./solver.js";

/** Bucket 0 par, 1 par+1, 2 par+2, 3 par+3 or more, 4 revealed. */
export const BUCKET_PAR = 0;
export const BUCKET_REVEALED = 4;
/** Rungs over par whose upper edge defines tiers 0 to 3; reveal is tier 4. */
export const TIER_OVER: readonly number[] = [0, 1, 2];

export interface WordLadderPuzzle {
  readonly number: PuzzleNumber;
  readonly start: string;
  /** The goal word. Obfuscated in the manifest, shown in the board as the target. */
  readonly goal: string;
  /** Exact shortest path length over the accepted list. Derived, never read from
   *  a manifest. */
  readonly par: number;
  /** The section 14 search ball. Derived. */
  readonly difficulty: number;
  readonly levers: readonly string[];
  /** The accepted word set, the one runtime asset, shared by every day. */
  readonly accepted: ReadonlySet<string>;
}

/** One accepted rung and whether it moved closer, level, or farther from goal. */
export interface RungRecord {
  readonly word: string;
  /** Sign of the change in shortest distance to goal from the previous rung. */
  readonly progress: -1 | 0 | 1;
  /** Rungs refused before this one landed, WORD-LADDER.md 19. */
  readonly refusedBefore: number;
}

export interface WordLadderState {
  readonly puzzle: WordLadderPuzzle;
  /** The climb so far, from start (exclusive) to the current word. */
  readonly rungs: readonly RungRecord[];
  readonly won: boolean;
  readonly revealed: boolean;
}

export type WordLadderAction =
  | { readonly kind: "rung"; readonly word: string; readonly refusedBefore: number }
  | { readonly kind: "undo" }
  | { readonly kind: "reveal" };

export interface MakeFailure {
  readonly detail: string;
}

/** The word at the top of the ladder, the one a rung is measured against. */
export function currentWord(state: WordLadderState): string {
  const last = state.rungs[state.rungs.length - 1];
  return last === undefined ? state.puzzle.start : last.word;
}

/** Shape checks shared by the parser, the generator and the verifier. */
export function puzzleProblem(start: string, goal: string): string | null {
  if (start.length !== WORD_LENGTH || goal.length !== WORD_LENGTH) return "words must be four letters";
  if (!/^[a-z]{4}$/.test(start) || !/^[a-z]{4}$/.test(goal)) return "words must be lowercase a to z";
  if (start === goal) return "the start and goal must differ";
  return null;
}

/**
 * Builds a puzzle and proves it on the way: solvable, par exact, and at least one
 * shortest path all familiar (the section 11 fairness claim). A board failing any
 * of these is refused, so a malformed manifest entry becomes a readable failure
 * rather than an unfair day. The graphs are passed in, built once per run.
 */
export function makePuzzle(
  number: PuzzleNumber,
  start: string,
  goal: string,
  acceptedGraph: WordGraph,
  familiarGraph: WordGraph,
  accepted: ReadonlySet<string>,
  levers: readonly string[],
): Result<WordLadderPuzzle, MakeFailure> {
  const problem = puzzleProblem(start, goal);
  if (problem !== null) return err({ detail: problem });
  if (!accepted.has(start) || !accepted.has(goal)) return err({ detail: "an endpoint is not in the accepted list" });
  const solved = solveWith(acceptedGraph, familiarGraph, start, goal);
  if (!solved.solvable) return err({ detail: "the goal is not reachable from the start" });
  if (solved.par < 4 || solved.par > 7) return err({ detail: `par ${String(solved.par)} is outside the band` });
  if (!solved.familiarFair) return err({ detail: "no shortest path uses familiar words alone" });
  return ok({
    number,
    start,
    goal,
    par: solved.par,
    difficulty: solved.difficulty,
    levers: levers.slice(),
    accepted,
  });
}

export function initialState(puzzle: WordLadderPuzzle): WordLadderState {
  return { puzzle, rungs: [], won: false, revealed: false };
}

export function isTerminal(state: WordLadderState): boolean {
  return state.won || state.revealed;
}

const GAME_OVER: Rejection = { code: "game-over", announce: "Today's ladder is finished." };
const NOT_ONE_CHANGE: Rejection = { code: "not-one-change", announce: "Change exactly one letter." };
const SAME_WORD: Rejection = { code: "same-word", announce: "That is the same word." };
const NOT_A_WORD: Rejection = { code: "not-a-word", announce: "Not in the word list." };
const ALREADY_USED: Rejection = { code: "already-used", announce: "You already used that word." };

/** The sign of the change in shortest distance to goal, from `from` to `to`.
 *  Both distances are read from the accepted graph via the puzzle's own solver
 *  seam; here the module supplies a distance function so rules stays graph free. */
export type DistanceToGoal = (word: string) => number | null;

export function applyAction(
  state: WordLadderState,
  action: WordLadderAction,
  distanceToGoal: DistanceToGoal,
): Result<WordLadderState, Rejection> {
  if (action.kind === "reveal") {
    if (isTerminal(state)) return err(GAME_OVER);
    return ok({ ...state, revealed: true });
  }

  if (action.kind === "undo") {
    if (isTerminal(state)) return err(GAME_OVER);
    if (state.rungs.length === 0) return ok(state);
    return ok({ ...state, rungs: state.rungs.slice(0, -1) });
  }

  if (isTerminal(state)) return err(GAME_OVER);
  const previous = currentWord(state);
  const word = action.word;
  if (word === previous) return err(SAME_WORD);
  if (!isOneChange(previous, word)) return err(NOT_ONE_CHANGE);
  if (!state.puzzle.accepted.has(word)) return err(NOT_A_WORD);
  if (word === state.puzzle.start || state.rungs.some((rung) => rung.word === word)) return err(ALREADY_USED);

  const before = distanceToGoal(previous);
  const after = distanceToGoal(word);
  const progress: -1 | 0 | 1 =
    before === null || after === null ? 0 : after < before ? 1 : after > before ? -1 : 0;
  const refusedBefore = Number.isInteger(action.refusedBefore) && action.refusedBefore >= 0 ? action.refusedBefore : 0;
  const rung: RungRecord = { word, progress, refusedBefore };
  return ok({
    ...state,
    rungs: [...state.rungs, rung],
    won: word === state.puzzle.goal,
  });
}

export function tierFor(state: WordLadderState): TierOrdinal {
  if (!state.won) return 4;
  const over = state.rungs.length - state.puzzle.par;
  let tier = 0;
  while (tier < TIER_OVER.length && over > (TIER_OVER[tier] as number)) tier += 1;
  return tier as TierOrdinal;
}

export function bucketFor(state: WordLadderState): BucketId {
  if (!state.won) return BUCKET_REVEALED;
  const over = state.rungs.length - state.puzzle.par;
  return Math.min(over, 3);
}

export function finishedOutcomeFor(state: WordLadderState): FinishedOutcomeV3 {
  const rungs = state.rungs.length;
  return {
    kind: "finished",
    score: rungs,
    won: state.won ? true : null,
    detail: state.won
      ? `Climbed in ${String(rungs)} ${rungs === 1 ? "rung" : "rungs"}, par ${String(state.puzzle.par)}`
      : `Revealed, par ${String(state.puzzle.par)}`,
    tier: tierFor(state),
    bucket: bucketFor(state),
    difficulty: state.puzzle.difficulty,
  };
}

export function inspect(state: WordLadderState): OutcomeV3 {
  return isTerminal(state) ? finishedOutcomeFor(state) : { kind: "ongoing" };
}

/**
 * Rebuilds a state from a stored list of climbed words, validating that no
 * illegal game could reach it: each word one change from the last, accepted, no
 * repeat, and a win only on the last rung. Null when any of that fails, which the
 * module turns into a StateFailure. Progress and refusal counts are recomputed
 * from the distance function; refusals cannot be reconstructed and are stored, so
 * the serialized form carries them.
 */
export function buildState(
  puzzle: WordLadderPuzzle,
  words: readonly string[],
  refusals: readonly number[],
  revealed: boolean,
  distanceToGoal: DistanceToGoal,
): WordLadderState | null {
  if (words.length !== refusals.length) return null;
  const rungs: RungRecord[] = [];
  const seen = new Set<string>([puzzle.start]);
  let previous = puzzle.start;
  let won = false;
  for (let i = 0; i < words.length; i += 1) {
    const word = words[i] as string;
    if (!isOneChange(previous, word)) return null;
    if (!puzzle.accepted.has(word)) return null;
    if (seen.has(word)) return null;
    if (won) return null;
    seen.add(word);
    const before = distanceToGoal(previous);
    const after = distanceToGoal(word);
    const progress: -1 | 0 | 1 =
      before === null || after === null ? 0 : after < before ? 1 : after > before ? -1 : 0;
    const refusedBefore = refusals[i] as number;
    if (!Number.isInteger(refusedBefore) || refusedBefore < 0) return null;
    rungs.push({ word, progress, refusedBefore });
    if (word === puzzle.goal) won = true;
    previous = word;
  }
  return { puzzle, rungs, won, revealed: revealed && !won };
}
