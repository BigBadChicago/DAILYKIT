/**
 * Layer 4. POKER GRID's social telemetry and its artifact mapping.
 * ARCHITECTURE2 sections 13, 16, 17 and 18.
 *
 * ## Why this game needed a state change and CIPHER did not
 *
 * `PokerState` held a board and a result and nothing about how the player
 * arrived at either. The only run shaped field was `hands`, and `hands` is
 * exactly what the share block already renders, one quality glyph per hand. A
 * fingerprint whose y came from hand quality would therefore be the rows
 * restyled, which is the failure section 18 exists to prevent. So POKER GRID
 * follows VECTOR and not CIPHER: `rules.ts` gained an effort record, the state
 * version went to 2, and the migration from 1 refuses.
 *
 * ## What the run log says and what it cannot say
 *
 * Integers only, and every one of them is a fact about the player. `hand` is
 * the category ordinal, which the row already shows as a quality tier. `rework`
 * is how many cells the player re-added after backing up, and `backs` is how
 * many separate times they backed up. Neither reads a card, a cell index or the
 * stored optimum, so neither can be inverted into anything about the board.
 *
 * ## The one thing POKER GRID does not hide, and why that is correct
 *
 * Locked decision 3 gives this game perfect information: the board is fully
 * visible from the first tap, there is no hidden answer, and nothing in the
 * artifact could spoil one. What is hidden is best play, and that reaches the
 * reader as exactly one ordinal out of five in the title, which requirement
 * 6.5.4 puts there on purpose. So the leak probes below hold the artifact to
 * carrying the player's run and that one grade, and nothing else derived from
 * `puzzle.best`.
 */

import type { FinishedOutcomeV3, ShareContext, ShareRow } from "../../core/types.js";
import type { LeakProbes } from "../../engine/share-leak.js";
import type {
  ArtifactModel,
  Fingerprint,
  FingerprintPoint,
  FingerprintShape,
  RunLog,
} from "../../engine/telemetry.js";
import { tierLabel, UNRATED_LABEL } from "../../engine/tiers.js";
import {
  HAND_ORDINAL,
  HAND_SHARE_TIER,
  categoryFromOrdinal,
  type HandOrdinal,
} from "../../shared/poker-hands.js";
import type { ShareToken } from "../../shared/share-vocabulary.js";
import { difficultyOf } from "./difficulty.js";
import { HAND_SIZE } from "./evaluator.js";
import {
  MAX_HANDS,
  bucketFor,
  remainingCards,
  type PokerEffort,
  type PokerState,
} from "./rules.js";
import { tierFor } from "./scoring.js";

export const RUN_LOG_VERSION = 1;

/** One glyph per hand. Recorded conflict resolution 9 dropped the summary bar,
 *  so a row has never been wider than this. */
export const SHARE_ROW_WIDTH = 1;

/**
 * Fingerprint y values run 0 to REWORK_CAP. Rework is unbounded in principle,
 * since a player can build and unbuild a path all afternoon, and a fingerprint
 * axis that one outlier stretches to nothing is not a picture of anything. Four
 * is where the axis stops saying more.
 */
export const REWORK_CAP = 4;

/**
 * One committed hand worth of run. Integers only, so nothing here can carry a
 * card, a cell or a score.
 */
export interface PokerRunEntry {
  /** Zero based hand index, which is also the row's position. */
  readonly index: number;
  /** Hand category ordinal, 1 to 8. High card is not a legal hand. */
  readonly hand: HandOrdinal;
  /** Cells re-added after backing up. Zero is a path walked once. */
  readonly rework: number;
  /** Separate times the player took cards back while building this hand. */
  readonly backs: number;
}

export function reworkOf(effort: PokerEffort): number {
  /* A committed hand took at least five taps, so this cannot go negative in
     practice. Clamped anyway, because an effort record rebuilt from storage is
     input and not an assumption. */
  return Math.max(0, effort.taps - HAND_SIZE);
}

export function reworkBand(rework: number): number {
  return Math.min(REWORK_CAP, Math.max(0, rework));
}

/**
 * The run log, derived from the hands and the effort records in play order.
 *
 * `effort` and `hands` are appended together on every commit, so they are the
 * same length on any state the engine can produce. A state restored from a save
 * written before the version bump cannot reach here, because `migrateState`
 * refuses it. The zip below is still written to the shorter of the two, so a
 * hand with no effort record is dropped rather than paired with a zero, which
 * would be a false statement about the player's run inside a shareable artifact.
 */
export function pokerEntries(state: PokerState): readonly PokerRunEntry[] {
  const count = Math.min(state.hands.length, state.effort.length);
  const entries: PokerRunEntry[] = [];
  for (let index = 0; index < count; index += 1) {
    const hand = state.hands[index] as PokerState["hands"][number];
    const effort = state.effort[index] as PokerEffort;
    entries.push({
      index,
      hand: HAND_ORDINAL[hand.category],
      rework: reworkOf(effort),
      backs: effort.backs,
    });
  }
  return entries;
}

export function pokerRunLog(state: PokerState): RunLog {
  return { v: RUN_LOG_VERSION, entries: pokerEntries(state) };
}

/**
 * The engine hands back an opaque RunLog, so entries are re-narrowed here rather
 * than assumed. A malformed entry is dropped rather than thrown on: the moment
 * a player taps share is the worst possible time for an exception, which is the
 * same reasoning engine decision 21 applies to an oversized block.
 */
export function readEntries(run: RunLog): readonly PokerRunEntry[] {
  const out: PokerRunEntry[] = [];
  for (const raw of run.entries) {
    if (typeof raw !== "object" || raw === null) continue;
    const entry = raw as Partial<PokerRunEntry>;
    if (
      typeof entry.index !== "number" ||
      typeof entry.hand !== "number" ||
      typeof entry.rework !== "number" ||
      typeof entry.backs !== "number"
    ) {
      continue;
    }
    const category = categoryFromOrdinal(entry.hand);
    /* High card is not a legal hand, so an ordinal of zero is not a hand that
       was played and has no row to render. */
    if (category === null || category === "high-card") continue;
    out.push({
      index: entry.index,
      hand: entry.hand as HandOrdinal,
      rework: entry.rework,
      backs: entry.backs,
    });
  }
  return out;
}

/** One row, one glyph, the hand's quality tier from the shared vocabulary.
 *  Rank names are never shown and no card, suit or cell is ever revealed. */
export function shareRow(hand: HandOrdinal): ShareRow {
  const category = categoryFromOrdinal(hand);
  /* Unreachable through readEntries, which drops a non hand before it gets
     here. Present so this function is total over its own input type. */
  if (category === null || category === "high-card") return ["miss"] as ShareToken[];
  return [HAND_SHARE_TIER[category]];
}

export function artifactRows(entries: readonly PokerRunEntry[]): ShareRow[] {
  return entries.map((entry) => shareRow(entry.hand));
}

/**
 * The title carries the game, the puzzle number and the achieved tier, per
 * requirement 6.5.4, plus the streak when there is one. Byte identical to what
 * shipped: the streak is a space and not a comma here, which differs from
 * CIPHER, and it is left alone because changing it would change every block a
 * player has ever shared.
 */
export function artifactTitle(state: PokerState, context: ShareContext): string {
  const tier = tierFor(state.puzzle.best, state.hands, state.score);
  const label = context.rated ? tierLabel(tier) : UNRATED_LABEL;
  const streak = context.rated && context.currentStreak >= 2 ? ` streak ${String(context.currentStreak)}` : "";
  return `POKER GRID #${String(context.puzzleNumber)} ${label}${streak}`;
}

/** What the title is allowed to be. The leak probe holds the title to this, so
 *  no score, card count or lever name can reach it by accident later. */
export const TITLE_PATTERN =
  /^POKER GRID #\d+ (?:Excellent|Great|Good|Fair|Rough|unrated)(?: streak \d+)?$/;

/**
 * The v3 terminal result. Built for any state so the artifact mapper has one
 * shape to read; `inspect` is what gates it on the board being finished.
 *
 * `won` is null because locked decision 4 removes the failure state, which is
 * recorded conflict resolution 1 and is why `hasWinLoss` is false.
 */
export function finishedOutcomeFor(state: PokerState): FinishedOutcomeV3 {
  const remaining = remainingCards(state.grid);
  return {
    kind: "finished",
    score: state.score,
    won: null,
    detail: `${String(remaining)} cards remaining`,
    tier: tierFor(state.puzzle.best, state.hands, state.score),
    bucket: bucketFor(state.grid),
    /* Measured from the board as dealt, never read from a stored field, and
       unrated past the horizon. See difficulty.ts for which half is measured
       and which half is read. */
    difficulty: difficultyOf(state.puzzle),
  };
}

/** Backs map onto the three shapes section 18 allows, best to worst. */
const SHAPE_BY_BACKS: readonly FingerprintShape[] = ["accepted", "correction"];

function shapeForBacks(backs: number): FingerprintShape {
  return SHAPE_BY_BACKS[backs] ?? "refused";
}

/**
 * Section 18. One point per hand: chronology across, rework depth up, and a
 * shape saying how many separate times the player changed their mind.
 *
 * The two axes are independent of each other and of the board. A player can back
 * up once and re-add three cells, or back up three times and re-add three cells,
 * and those are different pictures at the same rework. Two players who both
 * clear the board in seven hands of the same qualities, which is one tier and
 * one set of rows, are separated here by how much rebuilding it took, which a
 * tier restyled as a picture cannot do.
 */
export function pokerFingerprint(entries: readonly PokerRunEntry[]): Fingerprint {
  const points: FingerprintPoint[] = entries.map((entry) => ({
    x: entry.index,
    y: reworkBand(entry.rework),
    shape: shapeForBacks(entry.backs),
  }));
  return { points };
}

export function pokerArtifact(
  state: PokerState,
  run: RunLog,
  context: ShareContext,
): ArtifactModel {
  const entries = readEntries(run);
  return {
    title: artifactTitle(state, context),
    rows: artifactRows(entries),
    outcome: finishedOutcomeFor(state),
    fingerprint: pokerFingerprint(entries),
  };
}

/** The four tokens HAND_SHARE_TIER can produce. `miss` is deliberately not one
 *  of them: every row is a completed hand, so the miss glyph stays reserved for
 *  genuine failure in the suite's other games. Recorded in BACKLOG.md. */
const REACHABLE_TOKENS: ReadonlySet<string> = new Set<string>(["weak", "partial", "strong", "best"]);

function detailCards(detail: string): number | null {
  const match = /^(\d+) cards remaining$/.exec(detail);
  return match === null ? null : Number(match[1]);
}

/**
 * Section 16. The harness checks the title against the answer key and the
 * presence of a fingerprint for every game; these four are the correlations only
 * POKER GRID can compute. A probe returns true when it detects a leak, and each
 * one has a test that feeds it a deliberately leaking artifact, because a probe
 * that has never fired is not evidence.
 */
export const pokerLeakProbes: LeakProbes = {
  /**
   * A row is one glyph, so there is no second cell in a row for a column index
   * to ride in. A wider row is the only shape in which a five by seven board
   * position could be encoded at all.
   */
  positionLeak: (sample) => sample.artifact.rows.some((row) => row.length !== SHARE_ROW_WIDTH),

  /**
   * A row says what quality the player made and nothing else, so every token
   * must be one HAND_SHARE_TIER can produce. The title is held to its pattern
   * here too, which closes the channel a score, a card count or a lever name
   * could otherwise travel down, and the outcome must carry a null `won`,
   * because a true or false there would state a failure this game does not have.
   */
  answerPropertyLeak: (sample) => {
    if (!TITLE_PATTERN.test(sample.artifact.title)) return true;
    if (sample.artifact.outcome.won !== null) return true;
    for (const row of sample.artifact.rows) {
      for (const token of row) {
        if (!REACHABLE_TOKENS.has(token)) return true;
      }
    }
    return false;
  },

  /**
   * Rows are the player's play order, at most seven of them under locked
   * decision 1. Cards cleared is exactly five per row under locked decision 3,
   * so the row count and the outcome's card count are two statements of one
   * fact, and a block where they disagree is stating two different games.
   */
  orderingLeak: (sample) => {
    const rows = sample.artifact.rows;
    if (rows.length > MAX_HANDS) return true;
    const remaining = detailCards(sample.artifact.outcome.detail);
    if (remaining === null) return true;
    return remaining !== MAX_HANDS * HAND_SIZE - rows.length * HAND_SIZE;
  },

  /**
   * The silhouette is a single column, so its one free dimension is its height,
   * which is the hand count the tier already implies. A block whose token total
   * is not exactly its row count has a second dimension it should not have.
   */
  shapeLeak: (sample) => {
    let tokens = 0;
    for (const row of sample.artifact.rows) tokens += row.length;
    return tokens !== sample.artifact.rows.length;
  },
};
