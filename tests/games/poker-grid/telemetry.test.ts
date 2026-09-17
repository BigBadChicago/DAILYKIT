import { describe, expect, it } from "vitest";
import { validateArtifact } from "../../../src/engine/artifact.js";
import { SHARE_MAX_LINES, validateArtifactText } from "../../../src/engine/share-grammar.js";
import { runShareLeakChecks, type LeakSample } from "../../../src/engine/share-leak.js";
import type { ArtifactModel } from "../../../src/engine/telemetry.js";
import type { ShareRow } from "../../../src/core/types.js";
import { seedFor } from "../../../src/core/seed.js";
import { generatePuzzle, type PokerBest, type PokerPuzzle } from "../../../src/games/poker-grid/generator.js";
import { UNRATED_DIFFICULTY, resetDifficultyMemo } from "../../../src/games/poker-grid/difficulty.js";
import {
  EMPTY_EFFORT,
  MAX_HANDS,
  type HandRecord,
  type PokerEffort,
  type PokerState,
} from "../../../src/games/poker-grid/rules.js";
import { CLEAR_VALUE_PER_HAND, pointsFor } from "../../../src/games/poker-grid/scoring.js";
import {
  REWORK_CAP,
  RUN_LOG_VERSION,
  SHARE_ROW_WIDTH,
  TITLE_PATTERN,
  artifactRows,
  artifactTitle,
  finishedOutcomeFor,
  pokerArtifact,
  pokerEntries,
  pokerFingerprint,
  pokerLeakProbes,
  pokerRunLog,
  readEntries,
  reworkBand,
  reworkOf,
} from "../../../src/games/poker-grid/telemetry.js";

const SHARE_URL = "dailykit.providentia.games";
const BEST: PokerBest = { score: 5670, hands: 7, method: "beam", width: 400 };

function puzzleFor(number = 21, best: PokerBest | null = BEST): PokerPuzzle {
  return { ...generatePuzzle(number, seedFor("poker-grid", number)), best };
}

type Played = { readonly category: HandRecord["category"]; readonly taps: number; readonly backs: number };

/**
 * A finished state built by hand. The rules are exercised in rules.test.ts; what
 * this file needs is control over the two things the run log reads, which are
 * the hand categories and the effort behind each one.
 */
function finished(played: readonly Played[], puzzle: PokerPuzzle = puzzleFor()): PokerState {
  const hands: HandRecord[] = played.map((hand) => ({ category: hand.category, points: pointsFor(hand.category) }));
  const effort: PokerEffort[] = played.map((hand) => ({ taps: hand.taps, backs: hand.backs }));
  const cleared = played.length * 5;
  const grid = puzzle.cells.map((card, cell) => (cell < cleared ? null : card));
  return {
    grid,
    puzzle,
    selection: [],
    hands,
    score: hands.reduce((sum, hand) => sum + hand.points + CLEAR_VALUE_PER_HAND, 0),
    terminal: true,
    effort,
    pending: EMPTY_EFFORT,
  };
}

const CLEAN_RUN: readonly Played[] = [
  { category: "one-pair", taps: 5, backs: 0 },
  { category: "two-pair", taps: 5, backs: 0 },
  { category: "flush", taps: 5, backs: 0 },
];

const REWORKED_RUN: readonly Played[] = [
  { category: "one-pair", taps: 9, backs: 1 },
  { category: "two-pair", taps: 7, backs: 3 },
  { category: "flush", taps: 5, backs: 0 },
];

const PERFECT_CLEAR: readonly Played[] = [
  { category: "one-pair", taps: 5, backs: 0 },
  { category: "one-pair", taps: 6, backs: 1 },
  { category: "two-pair", taps: 5, backs: 0 },
  { category: "three-of-a-kind", taps: 8, backs: 2 },
  { category: "straight", taps: 5, backs: 0 },
  { category: "four-of-a-kind", taps: 5, backs: 0 },
  { category: "straight-flush", taps: 11, backs: 4 },
];

const CONTEXT = { puzzleNumber: 21, currentStreak: 1, rated: true };

function artifactFor(played: readonly Played[], context = CONTEXT): ArtifactModel {
  const state = finished(played);
  return pokerArtifact(state, pokerRunLog(state), context);
}

describe("POKER GRID run log", () => {
  it("carries integers only, and nothing that names a card or a cell", () => {
    const entries = pokerEntries(finished(REWORKED_RUN));
    expect(entries).toHaveLength(3);
    for (const entry of entries) {
      for (const value of Object.values(entry)) expect(Number.isInteger(value)).toBe(true);
      expect(Object.keys(entry).sort()).toEqual(["backs", "hand", "index", "rework"]);
    }
  });

  it("measures rework as taps above the five a hand costs", () => {
    expect(reworkOf({ taps: 5, backs: 0 })).toBe(0);
    expect(reworkOf({ taps: 9, backs: 1 })).toBe(4);
    /* A record rebuilt from storage is input, not an assumption. */
    expect(reworkOf({ taps: 2, backs: 0 })).toBe(0);
    expect(reworkBand(99)).toBe(REWORK_CAP);
    expect(reworkBand(-3)).toBe(0);
  });

  it("versions the log and round trips it through the opaque engine type", () => {
    const state = finished(REWORKED_RUN);
    const run = pokerRunLog(state);
    expect(run.v).toBe(RUN_LOG_VERSION);
    expect(readEntries(run)).toEqual(pokerEntries(state));
  });

  it("drops a malformed entry rather than throwing at the worst possible moment", () => {
    const run = { v: RUN_LOG_VERSION, entries: [null, 7, { index: 0 }, { index: 0, hand: 0, rework: 0, backs: 0 }, { index: 1, hand: 3, rework: 2, backs: 1 }] };
    const entries = readEntries(run);
    /* The zero ordinal is high card, which is not a legal hand and has no row. */
    expect(entries).toEqual([{ index: 1, hand: 3, rework: 2, backs: 1 }]);
  });

  /* A hand with no effort record beside it would have to be paired with a zero,
     which is a false statement about the player's run inside something they are
     about to share. */
  it("drops a hand that has no effort record rather than inventing one", () => {
    const state = finished(CLEAN_RUN);
    const short: PokerState = { ...state, effort: state.effort.slice(0, 2) };
    expect(pokerEntries(short)).toHaveLength(2);
  });
});

describe("POKER GRID fingerprint", () => {
  /* Section 18, the reason this game needed a state change at all. Two runs
     with the same tier and the same rows must still be able to differ. */
  it("separates two runs that share every row and every hand", () => {
    const clean = pokerFingerprint(pokerEntries(finished(CLEAN_RUN)));
    const reworked = pokerFingerprint(pokerEntries(finished(REWORKED_RUN)));
    expect(artifactRows(pokerEntries(finished(CLEAN_RUN))))
      .toEqual(artifactRows(pokerEntries(finished(REWORKED_RUN))));
    expect(clean.points).not.toEqual(reworked.points);
  });

  it("puts chronology across, rework up, and decisiveness in the shape", () => {
    const points = pokerFingerprint(pokerEntries(finished(REWORKED_RUN))).points;
    expect(points.map((point) => point.x)).toEqual([0, 1, 2]);
    expect(points.map((point) => point.y)).toEqual([4, 2, 0]);
    expect(points.map((point) => point.shape)).toEqual(["correction", "refused", "accepted"]);
  });

  /* The two axes are not the same measurement wearing two hats. One truncation
     back three cells and three truncations of one cell each are the same rework
     and a different shape. */
  it("keeps rework and correction count independent", () => {
    const deep = pokerFingerprint(pokerEntries(finished([{ category: "flush", taps: 8, backs: 1 }])));
    const fussy = pokerFingerprint(pokerEntries(finished([{ category: "flush", taps: 8, backs: 3 }])));
    expect(deep.points[0]?.y).toBe(fussy.points[0]?.y);
    expect(deep.points[0]?.shape).not.toBe(fussy.points[0]?.shape);
  });
});

describe("POKER GRID artifact", () => {
  it("emits one single glyph row per hand, the summary bar having been dropped", () => {
    const artifact = artifactFor(CLEAN_RUN);
    expect(artifact.rows).toHaveLength(3);
    for (const row of artifact.rows) expect(row).toHaveLength(SHARE_ROW_WIDTH);
    expect(artifact.rows).toEqual([["weak"], ["weak"], ["strong"]]);
  });

  /* The first game in the suite to sit exactly on section 49's cap. Seven hands
     plus a title plus a URL is nine lines, so this is the test that would fail
     the day anything is added to the block. */
  it("fits a perfect clear inside the nine line cap with nothing to spare", () => {
    const artifact = artifactFor(PERFECT_CLEAR);
    expect(artifact.rows).toHaveLength(MAX_HANDS);
    expect(validateArtifactText(artifact, SHARE_URL).ok).toBe(true);
    expect(artifact.rows.length + 2).toBe(SHARE_MAX_LINES);
    const eighth: ArtifactModel = { ...artifact, rows: [...artifact.rows, ["best"] as ShareRow] };
    expect(validateArtifactText(eighth, SHARE_URL).ok).toBe(false);
  });

  it("passes the engine's own artifact validation", () => {
    resetDifficultyMemo();
    expect(validateArtifact(artifactFor(PERFECT_CLEAR), SHARE_URL).ok).toBe(true);
  });

  it("writes the shipped title, including the space before the streak", () => {
    const state = finished(CLEAN_RUN);
    expect(artifactTitle(state, { puzzleNumber: 21, currentStreak: 1, rated: true })).toMatch(TITLE_PATTERN);
    expect(artifactTitle(state, { puzzleNumber: 21, currentStreak: 4, rated: true })).toContain(" streak 4");
    expect(artifactTitle(state, { puzzleNumber: 21, currentStreak: 4, rated: false })).toBe("POKER GRID #21 unrated");
  });

  it("carries the v3 outcome, with a null win and a measured difficulty", () => {
    resetDifficultyMemo();
    const outcome = finishedOutcomeFor(finished(CLEAN_RUN));
    expect(outcome.kind).toBe("finished");
    expect(outcome.won).toBeNull();
    expect(outcome.detail).toBe("20 cards remaining");
    expect(outcome.bucket).toBe(4);
    /* An integer, and not the unrated sentinel. Its value is asserted against
       the formula in difficulty.test.ts; what matters here is that a graded
       board reaches the outcome as a real measurement. */
    expect(Number.isInteger(outcome.difficulty)).toBe(true);
    expect(outcome.difficulty).not.toBe(UNRATED_DIFFICULTY);
  });

  it("is unrated rather than graded on a board with no stored optimum", () => {
    resetDifficultyMemo();
    const outcome = finishedOutcomeFor(finished(CLEAN_RUN, puzzleFor(22, null)));
    expect(outcome.tier).toBeNull();
    expect(outcome.difficulty).toBe(UNRATED_DIFFICULTY);
  });
});

describe("POKER GRID share leak probes", () => {
  const sampleOf = (artifact: ArtifactModel): LeakSample => ({ artifact, answerKey: "" });

  /* Section 16. The good, average and bad matrix the architecture asks for. */
  it("passes a matrix spanning the outcome space", () => {
    resetDifficultyMemo();
    const samples = [PERFECT_CLEAR, REWORKED_RUN, CLEAN_RUN, [CLEAN_RUN[0] as Played]]
      .map((played) => sampleOf(artifactFor(played)));
    const report = runShareLeakChecks(samples, pokerLeakProbes);
    expect(report.failures).toEqual([]);
    expect(report.ok).toBe(true);
  });

  /* Each probe gets an artifact built to trip it, because a probe that has
     never fired is not evidence that it works. */
  it("fires on a row wide enough to carry a board position", () => {
    const artifact = artifactFor(CLEAN_RUN);
    const leaking: ArtifactModel = { ...artifact, rows: [["weak", "weak"] as ShareRow, ...artifact.rows.slice(1)] };
    expect(pokerLeakProbes.positionLeak?.(sampleOf(artifact))).toBe(false);
    expect(pokerLeakProbes.positionLeak?.(sampleOf(leaking))).toBe(true);
  });

  it("fires on a title that says anything but the game, the day and the grade", () => {
    const artifact = artifactFor(CLEAN_RUN);
    expect(pokerLeakProbes.answerPropertyLeak?.(sampleOf(artifact))).toBe(false);
    for (const title of ["POKER GRID #21 Great 5670 points", "POKER GRID #21 Great sparse-pairs", "POKER GRID Great"]) {
      expect(pokerLeakProbes.answerPropertyLeak?.(sampleOf({ ...artifact, rows: artifact.rows, title }))).toBe(true);
    }
  });

  it("fires on a token no hand can produce and on a stated win or loss", () => {
    const artifact = artifactFor(CLEAN_RUN);
    const missToken: ArtifactModel = { ...artifact, rows: [["miss"] as ShareRow, ...artifact.rows.slice(1)] };
    expect(pokerLeakProbes.answerPropertyLeak?.(sampleOf(missToken))).toBe(true);
    const claimsAWin: ArtifactModel = { ...artifact, outcome: { ...artifact.outcome, won: true } };
    expect(pokerLeakProbes.answerPropertyLeak?.(sampleOf(claimsAWin))).toBe(true);
  });

  it("fires when the block is taller than seven hands or disagrees with its own card count", () => {
    const artifact = artifactFor(CLEAN_RUN);
    expect(pokerLeakProbes.orderingLeak?.(sampleOf(artifact))).toBe(false);
    const tooTall: ArtifactModel = { ...artifact, rows: Array.from({ length: MAX_HANDS + 1 }, () => ["weak"] as ShareRow) };
    expect(pokerLeakProbes.orderingLeak?.(sampleOf(tooTall))).toBe(true);
    const disagrees: ArtifactModel = { ...artifact, outcome: { ...artifact.outcome, detail: "5 cards remaining" } };
    expect(pokerLeakProbes.orderingLeak?.(sampleOf(disagrees))).toBe(true);
    const unreadable: ArtifactModel = { ...artifact, outcome: { ...artifact.outcome, detail: "nearly done" } };
    expect(pokerLeakProbes.orderingLeak?.(sampleOf(unreadable))).toBe(true);
  });

  it("fires on a silhouette with a second dimension", () => {
    const artifact = artifactFor(CLEAN_RUN);
    expect(pokerLeakProbes.shapeLeak?.(sampleOf(artifact))).toBe(false);
    const widened: ArtifactModel = { ...artifact, rows: [["weak", "partial"] as ShareRow, ...artifact.rows.slice(1)] };
    expect(pokerLeakProbes.shapeLeak?.(sampleOf(widened))).toBe(true);
  });

  /* The harness's own two checks, which run for every game. */
  it("fires the engine's title and fingerprint checks", () => {
    const artifact = artifactFor(CLEAN_RUN);
    const withAnswer: LeakSample = { artifact: { ...artifact, title: `${artifact.title} Great` }, answerKey: "Great" };
    expect(runShareLeakChecks([withAnswer], {}).ok).toBe(false);
    const noFingerprint: LeakSample = { artifact: { ...artifact, fingerprint: { points: [] } }, answerKey: "" };
    expect(runShareLeakChecks([noFingerprint], {}).ok).toBe(false);
  });
});
