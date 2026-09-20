/**
 * Layer 4. PANGRAM rules. PANGRAM.md sections 1, 5, 17 and 18.
 *
 * Pure: no DOM, no clock, no randomness. A day is seven letters, a centre and
 * the answer list the manifest carries. Every refused action is a value.
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
import {
  COUNT_MAX,
  COUNT_MIN,
  EXCLUDED_LETTER,
  MIN_LENGTH,
  SET_SIZE,
  TIER_PERCENT,
  fitsSet,
  isPangram,
  maskOf,
  scoreOf,
  thresholdFor,
} from "./letters.js";

export interface PangramPuzzle {
  readonly number: PuzzleNumber;
  /** The seven letters, alphabetical. */
  readonly letters: string;
  readonly centre: string;
  readonly rootMask: number;
  readonly centreMask: number;
  /** Every answer, alphabetical. Carried by the manifest because the browser
   *  ships no dictionary (PANGRAM.md 0). */
  readonly answers: readonly string[];
  readonly answerSet: ReadonlySet<string>;
  /** Sum of every answer's score, measured here and never read. */
  readonly total: number;
  readonly pangrams: number;
  /** The section 14 integer: the total available score. */
  readonly difficulty: number;
  readonly levers: readonly string[];
}

export interface FoundWord {
  readonly word: string;
  readonly points: number;
  readonly pangram: boolean;
  /** Words refused since the previous find, PANGRAM.md 19. */
  readonly refusedBefore: number;
}

export interface PangramState {
  readonly puzzle: PangramPuzzle;
  /** Finds in the order the player made them. */
  readonly found: readonly FoundWord[];
  readonly finished: boolean;
}

export type PangramAction =
  | { readonly kind: "word"; readonly word: string; readonly refusedBefore: number }
  | { readonly kind: "finish" };

export interface MakeFailure {
  readonly detail: string;
}

/**
 * Builds a day and checks it on the way: seven distinct letters with no s, a
 * centre among them, answers sorted and distinct, each one fitting the set, at
 * least one pangram, and a count inside the window. Whether the answers are
 * exactly the dictionary's is the verifier's claim (PANGRAM.md 9); this is what
 * the browser can check without a dictionary.
 */
export function makePuzzle(
  number: PuzzleNumber,
  letters: string,
  centre: string,
  answers: readonly string[],
  levers: readonly string[],
): Result<PangramPuzzle, MakeFailure> {
  if (!/^[a-z]{7}$/.test(letters)) return err({ detail: "the set must be seven lowercase letters" });
  const rootMask = maskOf(letters);
  if (new Set(letters).size !== SET_SIZE) return err({ detail: "the set letters must be distinct" });
  if (letters !== letters.split("").sort().join("")) return err({ detail: "the set letters must be alphabetical" });
  if (letters.includes(EXCLUDED_LETTER)) return err({ detail: "the set may not contain s" });
  if (centre.length !== 1 || !letters.includes(centre)) return err({ detail: "the centre must be a set letter" });
  if (answers.length < COUNT_MIN || answers.length > COUNT_MAX) {
    return err({ detail: `${String(answers.length)} answers is outside ${String(COUNT_MIN)} to ${String(COUNT_MAX)}` });
  }
  const centreMask = maskOf(centre);
  let total = 0;
  let pangrams = 0;
  for (let i = 0; i < answers.length; i += 1) {
    const word = answers[i] as string;
    if (i > 0 && word <= (answers[i - 1] as string)) return err({ detail: "answers must be alphabetical and distinct" });
    if (!fitsSet(word, rootMask, centreMask)) return err({ detail: `${word} does not fit the set` });
    total += scoreOf(word, rootMask);
    if (isPangram(word, rootMask)) pangrams += 1;
  }
  if (pangrams === 0) return err({ detail: "no answer uses all seven letters" });
  return ok({
    number,
    letters,
    centre,
    rootMask,
    centreMask,
    answers: answers.slice(),
    answerSet: new Set(answers),
    total,
    pangrams,
    difficulty: total,
    levers: levers.slice(),
  });
}

export function initialState(puzzle: PangramPuzzle): PangramState {
  return { puzzle, found: [], finished: false };
}

export function scoreOfState(state: PangramState): number {
  return state.found.reduce((sum, find) => sum + find.points, 0);
}

export function pangramFound(state: PangramState): boolean {
  return state.found.some((find) => find.pangram);
}

export function isTerminal(state: PangramState): boolean {
  return state.finished || state.found.length === state.puzzle.answers.length;
}

export const REFUSALS: Readonly<Record<string, Rejection>> = {
  "game-over": { code: "game-over", announce: "Today's letters are finished." },
  "too-short": { code: "too-short", announce: "Words need at least four letters." },
  "bad-letter": { code: "bad-letter", announce: "Use only today's seven letters." },
  "no-centre": { code: "no-centre", announce: "Every word must use the centre letter." },
  "already-found": { code: "already-found", announce: "You already found that word." },
  "not-a-word": { code: "not-a-word", announce: "Not in the word list." },
};

function refuse(code: string): Result<PangramState, Rejection> {
  return err(REFUSALS[code] as Rejection);
}

/** Why a typed word would be refused, or null when it is a new answer. The
 *  renderer asks the same question to count friction, then the rules decide. */
export function refusalFor(state: PangramState, raw: string): string | null {
  if (isTerminal(state)) return "game-over";
  const word = raw.toLowerCase();
  if (word.length < MIN_LENGTH) return "too-short";
  if (!/^[a-z]+$/.test(word) || (maskOf(word) & ~state.puzzle.rootMask) !== 0) return "bad-letter";
  if ((maskOf(word) & state.puzzle.centreMask) === 0) return "no-centre";
  if (state.found.some((find) => find.word === word)) return "already-found";
  if (!state.puzzle.answerSet.has(word)) return "not-a-word";
  return null;
}

export function applyAction(state: PangramState, action: PangramAction): Result<PangramState, Rejection> {
  if (action.kind === "finish") {
    if (isTerminal(state)) return refuse("game-over");
    return ok({ ...state, finished: true });
  }
  const refusal = refusalFor(state, action.word);
  if (refusal !== null) return refuse(refusal);
  const word = action.word.toLowerCase();
  const refusedBefore = Number.isInteger(action.refusedBefore) && action.refusedBefore >= 0 ? action.refusedBefore : 0;
  const find: FoundWord = {
    word,
    points: scoreOf(word, state.puzzle.rootMask),
    pangram: isPangram(word, state.puzzle.rootMask),
    refusedBefore,
  };
  return ok({ ...state, found: [...state.found, find] });
}

/** Tier by percentage of the day's total; tier 0 also needs a pangram. */
export function tierFor(state: PangramState): TierOrdinal {
  const score = scoreOfState(state);
  const total = state.puzzle.total;
  for (let tier = 0; tier < TIER_PERCENT.length; tier += 1) {
    if (score < thresholdFor(TIER_PERCENT[tier] as number, total)) continue;
    if (tier === 0 && !pangramFound(state)) continue;
    return tier as TierOrdinal;
  }
  return 4;
}

/** Buckets are the five tiers, bucket 0 distinguished. */
export function bucketFor(state: PangramState): BucketId {
  return tierFor(state);
}

export function finishedOutcomeFor(state: PangramState): FinishedOutcomeV3 {
  const score = scoreOfState(state);
  const found = state.found.length;
  const count = state.puzzle.answers.length;
  return {
    kind: "finished",
    score,
    won: null,
    detail: `Found ${String(found)} of ${String(count)} words, ${String(score)} of ${String(state.puzzle.total)} points${
      pangramFound(state) ? ", pangram found" : ""
    }`,
    tier: tierFor(state),
    bucket: bucketFor(state),
    difficulty: state.puzzle.difficulty,
  };
}

export function inspect(state: PangramState): OutcomeV3 {
  return isTerminal(state) ? finishedOutcomeFor(state) : { kind: "ongoing" };
}

/**
 * Rebuilds a state from stored finds, validating that no real game could have
 * produced anything else: each word a distinct answer, and finished only as
 * stored. Null on any failure, which the module turns into a StateFailure.
 */
export function buildState(
  puzzle: PangramPuzzle,
  words: readonly string[],
  refusals: readonly number[],
  finished: boolean,
): PangramState | null {
  if (words.length !== refusals.length) return null;
  let state = initialState(puzzle);
  for (let i = 0; i < words.length; i += 1) {
    const refused = refusals[i] as number;
    if (!Number.isInteger(refused) || refused < 0) return null;
    const next = applyAction(state, { kind: "word", word: words[i] as string, refusedBefore: refused });
    if (!next.ok) return null;
    state = next.value;
  }
  if (finished && !isTerminal(state)) state = { ...state, finished: true };
  return state;
}
