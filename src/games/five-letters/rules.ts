/**
 * Layer 4. FIVE LETTERS rules. FIVE-LETTERS.md sections 1, 5, 17 and 18.
 *
 * Pure: no DOM, no clock, no randomness. A day is one answer and the accepted
 * list every guess is checked against. Every refused action is a value.
 */

import { err, ok, type Result } from "../../core/result.js";
import type { BucketId, FinishedOutcomeV3, OutcomeV3, PuzzleNumber, Rejection, TierOrdinal } from "../../core/types.js";
import { MAX_GUESSES, SOLVED_PATTERN, WORD_LENGTH, isWordShape, marksFor, patternOfMarks, type Mark } from "./feedback.js";

export interface FiveLettersPuzzle {
  readonly number: PuzzleNumber;
  readonly answer: string;
  /** Every legal guess. The answer is always one of them. */
  readonly accepted: ReadonlySet<string>;
  /** The section 14 integer, measured from the answer at construction. */
  readonly difficulty: number;
  readonly levers: readonly string[];
}

export interface GuessRecord {
  readonly word: string;
  readonly marks: readonly Mark[];
  /** Words refused since the previous accepted guess, FIVE-LETTERS.md 19. */
  readonly refusedBefore: number;
}

export interface FiveLettersState {
  readonly puzzle: FiveLettersPuzzle;
  readonly guesses: readonly GuessRecord[];
}

export type FiveLettersAction = { readonly kind: "guess"; readonly word: string; readonly refusedBefore: number };

export interface MakeFailure {
  readonly detail: string;
}

export function makePuzzle(
  number: PuzzleNumber,
  answer: string,
  accepted: ReadonlySet<string>,
  difficulty: number,
  levers: readonly string[],
): Result<FiveLettersPuzzle, MakeFailure> {
  if (!isWordShape(answer)) return err({ detail: "the answer must be five lowercase letters" });
  if (!accepted.has(answer)) return err({ detail: `${answer} is not in the accepted list` });
  if (!Number.isInteger(difficulty) || difficulty < 1) return err({ detail: "difficulty must be a positive count" });
  return ok({ number, answer, accepted, difficulty, levers: levers.slice() });
}

export function initialState(puzzle: FiveLettersPuzzle): FiveLettersState {
  return { puzzle, guesses: [] };
}

export function solved(state: FiveLettersState): boolean {
  const last = state.guesses[state.guesses.length - 1];
  return last !== undefined && patternOfMarks(last.marks) === SOLVED_PATTERN;
}

export function isTerminal(state: FiveLettersState): boolean {
  return solved(state) || state.guesses.length >= MAX_GUESSES;
}

export const REFUSALS: Readonly<Record<string, Rejection>> = {
  "game-over": { code: "game-over", announce: "Today's word is finished." },
  "too-short": { code: "too-short", announce: "Guesses need five letters." },
  "not-a-word": { code: "not-a-word", announce: "Not in the word list." },
  "already-guessed": { code: "already-guessed", announce: "You already tried that word." },
};

/** Why a typed word would be refused, or null when it is a legal guess. The
 *  renderer asks the same question to count friction, then the rules decide. */
export function refusalFor(state: FiveLettersState, raw: string): string | null {
  if (isTerminal(state)) return "game-over";
  const word = raw.toLowerCase();
  if (word.length !== WORD_LENGTH || !/^[a-z]+$/.test(word)) return "too-short";
  if (!state.puzzle.accepted.has(word)) return "not-a-word";
  if (state.guesses.some((guess) => guess.word === word)) return "already-guessed";
  return null;
}

export function applyAction(state: FiveLettersState, action: FiveLettersAction): Result<FiveLettersState, Rejection> {
  const refusal = refusalFor(state, action.word);
  if (refusal !== null) return err(REFUSALS[refusal] as Rejection);
  const word = action.word.toLowerCase();
  const refusedBefore = Number.isInteger(action.refusedBefore) && action.refusedBefore >= 0 ? action.refusedBefore : 0;
  const record: GuessRecord = { word, marks: marksFor(state.puzzle.answer, word), refusedBefore };
  return ok({ ...state, guesses: [...state.guesses, record] });
}

/** FIVE-LETTERS.md 17. Two or fewer is luck as much as skill, so it shares the
 *  top tier; a solve in six is still a solve and stays above a miss. */
export function tierFor(guesses: number, isSolved: boolean): TierOrdinal {
  if (!isSolved) return 4;
  if (guesses <= 2) return 0;
  if (guesses === 3) return 1;
  if (guesses === 4) return 2;
  return 3;
}

/** Seven buckets: solved in one to six, then not solved. */
export function bucketFor(guesses: number, isSolved: boolean): BucketId {
  return isSolved ? guesses - 1 : MAX_GUESSES;
}

export function finishedOutcomeFor(state: FiveLettersState): FinishedOutcomeV3 {
  const count = state.guesses.length;
  const won = solved(state);
  return {
    kind: "finished",
    score: won ? count : 0,
    won,
    detail: won ? `Solved in ${String(count)}` : `Not solved. The word was ${state.puzzle.answer.toUpperCase()}`,
    tier: tierFor(count, won),
    bucket: bucketFor(count, won),
    difficulty: state.puzzle.difficulty,
  };
}

export function inspect(state: FiveLettersState): OutcomeV3 {
  return isTerminal(state) ? finishedOutcomeFor(state) : { kind: "ongoing" };
}

/** Rebuilds a state from stored guesses through the rules, so a save no real
 *  game could reach is refused. Null on any failure. */
export function buildState(
  puzzle: FiveLettersPuzzle,
  words: readonly string[],
  refusals: readonly number[],
): FiveLettersState | null {
  if (words.length !== refusals.length || words.length > MAX_GUESSES) return null;
  let state = initialState(puzzle);
  for (let i = 0; i < words.length; i += 1) {
    const refused = refusals[i] as number;
    if (!Number.isInteger(refused) || refused < 0) return null;
    const next = applyAction(state, { kind: "guess", word: words[i] as string, refusedBefore: refused });
    if (!next.ok) return null;
    state = next.value;
  }
  return state;
}

/** Best known mark per letter across every guess, for the keyboard. */
export function letterMarks(state: FiveLettersState): ReadonlyMap<string, Mark> {
  const best = new Map<string, Mark>();
  for (const guess of state.guesses) {
    for (let i = 0; i < WORD_LENGTH; i += 1) {
      const letter = guess.word[i] as string;
      const mark = guess.marks[i] as Mark;
      const known = best.get(letter);
      if (known === undefined || mark > known) best.set(letter, mark);
    }
  }
  return best;
}
