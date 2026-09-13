/**
 * Layer 4. CIPHER's social telemetry and its artifact mapping. ARCHITECTURE2
 * sections 13, 16, 17 and 18.
 *
 * Unlike VECTOR, CIPHER needed no new state to say something about the run:
 * `CipherState.guesses` already holds every code the player submitted, and
 * `deserialize` rebuilds all of it, so the run log survives a reload without a
 * stored field and `stateVersion` stays 1.
 *
 * The guessed codes are read here and never leave. They are the day's answer in
 * all but name once feedback sits beside them, so the run log carries only
 * integers derived from them: how far the player moved between guesses, and
 * whether the guess they made was licensed by the feedback they already held.
 * Both are facts about the player, and neither can be inverted into the code by
 * a reader who never saw the guesses.
 *
 * `finishedOutcomeFor` lives here rather than in rules.ts because the v3
 * outcome carries the difficulty integer, and rules.ts cannot import
 * difficulty.ts without a cycle: difficulty.ts needs scoreGuess.
 */

import type { FinishedOutcomeV3, ShareContext, ShareRow } from "../../core/types.js";
import type { LeakProbes } from "../../engine/share-leak.js";
import { tierLabel } from "../../engine/tiers.js";
import type {
  ArtifactModel,
  Fingerprint,
  FingerprintPoint,
  FingerprintShape,
  RunLog,
} from "../../engine/telemetry.js";
import type { ShareToken } from "../../shared/share-vocabulary.js";
import { difficultyOf } from "./difficulty.js";
import {
  CODE_LENGTH,
  MAX_GUESSES,
  bucketFor,
  scoreGuess,
  solvedBy,
  tierFor,
  type CipherState,
  type Code,
  type GuessRecord,
} from "./rules.js";

export const RUN_LOG_VERSION = 1;

/** Cells per share row, one per slot. CIPHER.md section 10, unchanged. */
export const SHARE_ROW_WIDTH = CODE_LENGTH;

/** Fingerprint y values run 0 to CHURN_BANDS - 1, which is slots changed. */
export const CHURN_BANDS = CODE_LENGTH + 1;

/**
 * How much of what the player already knew the guess respected.
 *
 * 2 the guess was consistent with every earlier feedback, so it could have been
 *   the answer given what the player held
 * 1 it contradicted something earlier but respected the most recent feedback
 * 0 it contradicted even the most recent feedback
 *
 * The first guess is 2, because an empty set of constraints contradicts
 * nothing, which is the honest reading rather than a flattering one.
 */
export type Discipline = 0 | 1 | 2;

/**
 * One guess worth of run. Integers only: the codes that produced them stay in
 * `CipherState` and are never written here.
 */
export interface CipherRunEntry {
  /** Zero based guess index, which is also the row's position. */
  readonly index: number;
  /** Feedback, which already ships in the row this entry renders. */
  readonly exact: number;
  readonly misplaced: number;
  /** Slots changed since the previous guess. Zero for the first, where there
   *  was nothing yet to change. */
  readonly churn: number;
  readonly discipline: Discipline;
  /** This guess ended it. */
  readonly solved: boolean;
}

/** Feedback is symmetric in both components, so which argument is the candidate
 *  and which is the guess does not matter here. */
function agreesWith(candidate: Code, record: GuessRecord): boolean {
  const feedback = scoreGuess(candidate, record.code);
  return feedback.exact === record.feedback.exact && feedback.misplaced === record.feedback.misplaced;
}

export function churnBetween(previous: Code, current: Code): number {
  let changed = 0;
  for (let slot = 0; slot < CODE_LENGTH; slot += 1) {
    if (previous[slot] !== current[slot]) changed += 1;
  }
  return changed;
}

export function disciplineAt(guesses: readonly GuessRecord[], index: number): Discipline {
  const guess = (guesses[index] as GuessRecord).code;
  let all = true;
  for (let earlier = 0; earlier < index; earlier += 1) {
    if (!agreesWith(guess, guesses[earlier] as GuessRecord)) {
      all = false;
      break;
    }
  }
  if (all) return 2;
  return agreesWith(guess, guesses[index - 1] as GuessRecord) ? 1 : 0;
}

export function cipherEntries(state: CipherState): readonly CipherRunEntry[] {
  return state.guesses.map((record, index) => ({
    index,
    exact: record.feedback.exact,
    misplaced: record.feedback.misplaced,
    churn: index === 0 ? 0 : churnBetween((state.guesses[index - 1] as GuessRecord).code, record.code),
    discipline: disciplineAt(state.guesses, index),
    solved: solvedBy(record.feedback),
  }));
}

export function cipherRunLog(state: CipherState): RunLog {
  return { v: RUN_LOG_VERSION, entries: cipherEntries(state) };
}

/** The engine hands back an opaque RunLog, so the entries are re-narrowed here
 *  rather than assumed. A malformed entry is dropped rather than thrown on; the
 *  moment a player taps share is the worst time for an exception. */
export function readEntries(run: RunLog): readonly CipherRunEntry[] {
  const out: CipherRunEntry[] = [];
  for (const raw of run.entries) {
    if (typeof raw !== "object" || raw === null) continue;
    const entry = raw as Partial<CipherRunEntry>;
    if (
      typeof entry.index !== "number" ||
      typeof entry.exact !== "number" ||
      typeof entry.misplaced !== "number" ||
      typeof entry.churn !== "number" ||
      typeof entry.discipline !== "number" ||
      typeof entry.solved !== "boolean"
    ) {
      continue;
    }
    out.push({
      index: entry.index,
      exact: entry.exact,
      misplaced: entry.misplaced,
      churn: entry.churn,
      discipline: entry.discipline,
      solved: entry.solved,
    });
  }
  return out;
}

/**
 * Cells are sorted, all `best` first, then `partial`, then `miss`. Sorting is
 * what keeps rules decision 1 true in the share block: an unsorted row would
 * leak which slots were right to anyone holding the same day's puzzle.
 * CIPHER.md section 10.
 */
export function shareRow(exact: number, misplaced: number): ShareRow {
  const cells: ShareToken[] = [];
  for (let i = 0; i < exact; i += 1) cells.push("best");
  for (let i = 0; i < misplaced; i += 1) cells.push("partial");
  while (cells.length < SHARE_ROW_WIDTH) cells.push("miss");
  return cells;
}

export function artifactRows(entries: readonly CipherRunEntry[]): ShareRow[] {
  return entries.map((entry) => shareRow(entry.exact, entry.misplaced));
}

/** The tier is written into the title by the module, which owns its own grade.
 *  Requirement 3.5.1 puts the result summary on the title line. */
export function artifactTitle(state: CipherState, context: ShareContext): string {
  const label = tierLabel(tierFor(state.guesses.length, state.solved));
  const streak = context.currentStreak >= 2 ? `, streak ${String(context.currentStreak)}` : "";
  return `CIPHER #${String(context.puzzleNumber)} ${label}${streak}`;
}

/** What the title is allowed to be. The share leak probe holds the title to
 *  this, so nothing about the code can reach it by accident later. */
export const TITLE_PATTERN = /^CIPHER #\d+ (?:Excellent|Great|Good|Fair|Rough)(?:, streak \d+)?$/;

/**
 * The v3 terminal result. Built for any state, finished or not, so the artifact
 * mapper has one shape to read; `inspect` is what gates it on being finished.
 */
export function finishedOutcomeFor(state: CipherState): FinishedOutcomeV3 {
  const guesses = state.guesses.length;
  return {
    kind: "finished",
    score: state.solved ? guesses : 0,
    won: state.solved,
    detail: state.solved ? `Solved in ${String(guesses)}` : "Not solved",
    /* Derived from the guess count, so it is correct past the manifest horizon,
       where CIPHER owes the stored optimum nothing. Engine decision 16 leaves
       it to the module. */
    tier: tierFor(guesses, state.solved),
    bucket: bucketFor(guesses, state.solved),
    /* Recomputed from the code, never read from the manifest entry. Section 9
       and ARCHITECTURE2 section 52 risk 2. */
    difficulty: difficultyOf(state.code),
  };
}

/** Discipline maps onto the three shapes section 18 allows, worst to best. */
const SHAPE_BY_DISCIPLINE: readonly FingerprintShape[] = ["refused", "correction", "accepted"];

/**
 * Section 18. One point per guess: chronology across, slots changed up, and a
 * shape saying whether the move was licensed by the feedback the player held.
 *
 * The two axes are independent of each other and of the code. A player can move
 * one slot and contradict themselves, or jump all four and stay consistent, so
 * two players who both solve in four are separated here by how they got there,
 * which a tier restyled as a picture cannot do.
 */
export function cipherFingerprint(entries: readonly CipherRunEntry[]): Fingerprint {
  const points: FingerprintPoint[] = entries.map((entry) => ({
    x: entry.index,
    y: entry.churn,
    shape: SHAPE_BY_DISCIPLINE[entry.discipline] ?? "refused",
  }));
  return { points };
}

export function cipherArtifact(
  state: CipherState,
  run: RunLog,
  context: ShareContext,
): ArtifactModel {
  const entries = readEntries(run);
  return {
    title: artifactTitle(state, context),
    rows: artifactRows(entries),
    outcome: finishedOutcomeFor(state),
    fingerprint: cipherFingerprint(entries),
  };
}

/** Rank inside a row. A row is sorted when this never decreases across it. */
const CELL_RANK: Readonly<Record<string, number>> = { best: 0, partial: 1, miss: 2 };

function isSolveRow(row: ShareRow): boolean {
  return row.length === SHARE_ROW_WIDTH && row.every((token) => token === "best");
}

/**
 * Section 16. The harness checks the title against the answer key and the
 * presence of a fingerprint for every game; these four are the correlations
 * only CIPHER can compute. A probe returns true when it detects a leak, and
 * each one has a test that feeds it a deliberately leaking artifact, because a
 * probe that has never fired is not evidence.
 */
export const cipherLeakProbes: LeakProbes = {
  /** A row is sorted by rank, so no cell position corresponds to a slot. An
   *  unsorted row is the leak CIPHER.md section 10 sorts to prevent. */
  positionLeak: (sample) =>
    sample.artifact.rows.some((row) => {
      let rank = -1;
      for (const token of row) {
        const next = CELL_RANK[token];
        if (next === undefined || next < rank) return true;
        rank = next;
      }
      return false;
    }),

  /**
   * A row says how many slots were right and how many symbols were right in the
   * wrong place, and nothing else. So every row must be a legal feedback pair,
   * the day's code cannot have three exact and one misplaced, and the outcome
   * must agree with the last row about whether the code was broken. The title
   * is held to its pattern here too, which closes the other channel a property
   * of the code could travel down.
   */
  answerPropertyLeak: (sample) => {
    if (!TITLE_PATTERN.test(sample.artifact.title)) return true;
    const rows = sample.artifact.rows;
    for (const row of rows) {
      let exact = 0;
      let misplaced = 0;
      let miss = 0;
      for (const token of row) {
        if (token === "best") exact += 1;
        else if (token === "partial") misplaced += 1;
        else if (token === "miss") miss += 1;
        else return true;
      }
      if (exact + misplaced + miss !== SHARE_ROW_WIDTH) return true;
      if (exact === SHARE_ROW_WIDTH - 1 && misplaced === 1) return true;
    }
    const last = rows[rows.length - 1];
    const won = sample.artifact.outcome.won === true;
    if (last !== undefined && isSolveRow(last) !== won) return true;
    return false;
  },

  /** Rows are player chronology: at most six of them, and the row that broke
   *  the code can only be the last one. */
  orderingLeak: (sample) => {
    const rows = sample.artifact.rows;
    if (rows.length > MAX_GUESSES) return true;
    for (let at = 0; at < rows.length; at += 1) {
      if (isSolveRow(rows[at] as ShareRow) && at !== rows.length - 1) return true;
    }
    return false;
  },

  /** The silhouette is a rectangle four cells wide, so its only free dimension
   *  is the guess count, which the tier already states in words. */
  shapeLeak: (sample) => sample.artifact.rows.some((row) => row.length !== SHARE_ROW_WIDTH),
};
