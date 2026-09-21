/**
 * Layer 4. The FIVE LETTERS generator. Node only. FIVE-LETTERS.md 6 and 7.
 *
 * Rejection sampling: draw an answer uniformly from the answer pool, measure its
 * candidates after the opening, and keep it when it falls in the weekday's band,
 * the witness solves it in six or fewer, and it has not been used in the horizon.
 */

import { MAX_GUESSES } from "./feedback.js";
import { OPENING } from "./difficulty.js";
import { bandForPuzzle, bandOf } from "./bands.js";
import { candidatesAfter, Witness, buildSearch, type Search } from "./solver.js";

export const ATTEMPT_CEILING = 2000;

export interface Draw {
  intBelow(bound: number): number;
}

export interface GenContext {
  readonly search: Search;
  readonly answers: readonly string[];
  readonly witness: Witness;
}

export interface Day {
  readonly answer: string;
  readonly candidates: number;
  readonly witness: readonly string[];
  readonly levers: readonly string[];
  readonly attempt: number;
}

export type Tally = Record<"band" | "repeat" | "witness", number> & { accepted: number };

export function emptyTally(): Tally {
  return { band: 0, repeat: 0, witness: 0, accepted: 0 };
}

export function contextFromLists(accepted: readonly string[], answers: readonly string[]): GenContext {
  const search = buildSearch(accepted);
  return { search, answers, witness: new Witness(search, OPENING) };
}

/** Levers are records of what a day is, for audit, never inputs. */
export function leversOf(answer: string): string[] {
  return [new Set(answer).size < answer.length ? "repeat-letter" : "distinct-letters"];
}

export function generateForPuzzle(
  context: GenContext,
  puzzleNumber: number,
  draw: Draw,
  tally: Tally,
  used: ReadonlySet<string>,
): Day | null {
  const band = bandForPuzzle(puzzleNumber);
  for (let attempt = 0; attempt < ATTEMPT_CEILING; attempt += 1) {
    const answer = context.answers[draw.intBelow(context.answers.length)] as string;
    const candidates = candidatesAfter(context.search, OPENING, answer);
    if (bandOf(candidates) !== band) {
      tally.band += 1;
      continue;
    }
    if (used.has(answer)) {
      tally.repeat += 1;
      continue;
    }
    const witness = context.witness.path(answer);
    if (witness.length > MAX_GUESSES) {
      tally.witness += 1;
      continue;
    }
    tally.accepted += 1;
    return { answer, candidates, witness, levers: leversOf(answer), attempt };
  }
  return null;
}
