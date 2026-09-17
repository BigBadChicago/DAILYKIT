/**
 * The shell's share path, per live game. Requirement 3.6.1 for the streak, and
 * v3 migration phase 5 for the rest: the string a player shares now comes from
 * the v3 artifact through the engine's one composer, and these tests pin it to
 * the bytes the v2 path shipped while the v2 block still exists to compare
 * against. They are rewritten against fixed strings when phase 6 removes the
 * v2 block.
 */

import { describe, expect, it, vi } from "vitest";

import type { AnyGameModuleV3, OpaquePuzzle, OpaqueState } from "../../src/contract/v3/game-module.js";
import { isOk } from "../../src/core/result.js";
import { seedFor } from "../../src/core/seed.js";
import type { ShareBlock } from "../../src/core/types.js";
import { SHARE_MAX_LINES } from "../../src/engine/share-grammar.js";
import type { ArtifactModel } from "../../src/engine/telemetry.js";
import { renderShareRow } from "../../src/shared/share-vocabulary.js";
import { SUITE_SHARE_URL } from "../../src/shell/registry.js";
import {
  composeResultShare,
  shareStreakFor,
  type ResultShareSession,
  type ShareSessionMode,
} from "../../src/shell/share-context.js";
import { cipherV3 } from "../../src/games/cipher/module.js";
import type { CipherPuzzle } from "../../src/games/cipher/generator.js";
import { CODE_LENGTH, applyCipherAction, type CipherState, type Code } from "../../src/games/cipher/rules.js";
import { internals as pokerInternals, pokerGridV3 } from "../../src/games/poker-grid/module.js";
import { generatePuzzle, type PokerPuzzle } from "../../src/games/poker-grid/generator.js";
import { EMPTY_EFFORT, type HandRecord, type PokerState } from "../../src/games/poker-grid/rules.js";
import { CLEAR_VALUE_PER_HAND, pointsFor } from "../../src/games/poker-grid/scoring.js";
import { internals as vectorInternals, vectorV3 } from "../../src/games/vector/module.js";
import { apply as vectorApply, initialState as vectorInitial, type VectorState } from "../../src/games/vector/rules.js";
import type { Direction } from "../../src/games/vector/propagate.js";
import { FIXTURE_SOLUTION, fixturePuzzle } from "../games/vector/fixtures.js";

describe("shareStreakFor", () => {
  it("gives a live session its real streak", () => {
    expect(shareStreakFor("live", 12)).toBe(12);
    expect(shareStreakFor("live", 0)).toBe(0);
  });

  it("gives an archive replay no streak, whatever today's streak is", () => {
    expect(shareStreakFor("archive", 12)).toBe(0);
  });

  it("gives a tutorial no streak, so a later change cannot make it the exception", () => {
    expect(shareStreakFor("tutorial", 12)).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// Finished states, one small set per game
// ---------------------------------------------------------------------------

function cipherFinished(guesses: readonly Code[]): { puzzle: CipherPuzzle; state: CipherState } {
  const puzzle: CipherPuzzle = { number: 12, code: [1, 1, 4, 5], levers: ["one-pair"], best: { remaining: 105, line: 5 } };
  let state = cipherV3.initialState(puzzle as never) as unknown as CipherState;
  for (const guess of guesses) {
    for (let slot = 0; slot < CODE_LENGTH; slot += 1) {
      const set = applyCipherAction(state, { kind: "set", slot, symbol: guess[slot] as number });
      if (!isOk(set)) throw new Error(set.error.code);
      state = set.value;
    }
    const submit = applyCipherAction(state, { kind: "submit" });
    if (!isOk(submit)) throw new Error(submit.error.code);
    state = submit.value;
  }
  return { puzzle, state };
}

function vectorFinished(wrongSubmissions: number, solveAtEnd: boolean): { puzzle: unknown; state: VectorState } {
  const puzzle = fixturePuzzle();
  let state = vectorInitial(puzzle);
  const fill = (pick: (cell: number) => Direction | null): void => {
    for (const cell of puzzle.geometry.blankCells) {
      const wanted = pick(cell);
      const tries: Direction[] = wanted === null ? [1, 2, 3, 0] : [wanted, 0, 1, 2, 3];
      for (const dir of tries) {
        const next = vectorApply(state, { kind: "set", cell, dir });
        if (next.ok) {
          state = next.value;
          break;
        }
      }
    }
    const submitted = vectorApply(state, { kind: "submit" });
    if (!submitted.ok) throw new Error(submitted.error.code);
    state = submitted.value;
  };
  for (let at = 0; at < wrongSubmissions; at += 1) {
    /* Every blank pointed up where up is legal and away from its solution
       where it is not, which the fixture's unique solution does not satisfy. */
    fill((cell) => ((FIXTURE_SOLUTION[cell] as number) === 0 ? null : 0));
  }
  if (solveAtEnd) fill((cell) => FIXTURE_SOLUTION[cell] as Direction);
  return { puzzle, state };
}

function pokerFinished(categories: readonly HandRecord["category"][], graded: boolean): { puzzle: PokerPuzzle; state: PokerState } {
  const base = generatePuzzle(21, seedFor("poker-grid", 21));
  const puzzle: PokerPuzzle = { ...base, best: graded ? { score: 5670, hands: 7, method: "beam", width: 400 } : null };
  const hands: HandRecord[] = categories.map((category) => ({ category, points: pointsFor(category) }));
  const cleared = hands.length * 5;
  const state: PokerState = {
    grid: puzzle.cells.map((card, cell) => (cell < cleared ? null : card)),
    puzzle,
    selection: [],
    hands,
    score: hands.reduce((sum, hand) => sum + hand.points + CLEAR_VALUE_PER_HAND, 0),
    terminal: true,
    effort: hands.map((_hand, index) => ({ taps: 5 + index, backs: index % 2 })),
    pending: EMPTY_EFFORT,
  };
  return { puzzle, state };
}

interface Case {
  readonly name: string;
  readonly game: AnyGameModuleV3;
  readonly puzzle: unknown;
  readonly state: unknown;
  readonly v2Block: (streak: number, rated: boolean) => ShareBlock;
}

const cipherBlock = (state: CipherState) => (streak: number, rated: boolean): ShareBlock =>
  (cipherV3 as unknown as { shareBlock: (s: unknown, c: unknown) => ShareBlock }).shareBlock(state, {
    puzzleNumber: 12,
    currentStreak: streak,
    rated,
  });

const CASES: readonly Case[] = [
  ...[
    [[1, 1, 4, 5]],
    [[1, 4, 5, 1], [1, 1, 4, 5]],
    [[0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 2], [0, 0, 0, 3], [0, 0, 0, 4], [0, 0, 1, 0]],
  ].map((guesses, index): Case => {
    const { puzzle, state } = cipherFinished(guesses as Code[]);
    return { name: `CIPHER ${String(index)}`, game: cipherV3, puzzle, state, v2Block: cipherBlock(state) };
  }),
  ...[
    [0, true],
    [2, true],
    [3, false],
  ].map(([wrong, solve]): Case => {
    const { puzzle, state } = vectorFinished(wrong as number, solve as boolean);
    return {
      name: `VECTOR ${String(wrong)} ${String(solve)}`,
      game: vectorV3,
      puzzle,
      state,
      v2Block: (streak, rated) => vectorInternals.shareBlock(state, { puzzleNumber: 12, currentStreak: streak, rated }),
    };
  }),
  ...[
    [["one-pair", "two-pair", "flush"], true],
    [["one-pair", "one-pair", "straight", "flush", "full-house", "two-pair", "one-pair"], true],
    [["one-pair", "three-of-a-kind"], false],
  ].map(([categories, graded]): Case => {
    const { puzzle, state } = pokerFinished(categories as HandRecord["category"][], graded as boolean);
    return {
      name: `POKER GRID ${(categories as string[]).length} ${String(graded)}`,
      game: pokerGridV3,
      puzzle,
      state,
      v2Block: (streak, rated) => pokerInternals.shareBlock(state, { puzzleNumber: 12, currentStreak: streak, rated }),
    };
  }),
];

function session(sample: Case, mode: ShareSessionMode, rated = true): ResultShareSession {
  return {
    puzzleNumber: 12,
    mode,
    rated,
    puzzle: sample.puzzle as OpaquePuzzle,
    state: sample.state as OpaqueState,
  };
}

function v2Text(block: ShareBlock): string {
  return [block.title, ...block.rows.map(renderShareRow), SUITE_SHARE_URL].join("\n");
}

describe("composeResultShare", () => {
  it("finishes every fixture state, so the cases below test finished games", () => {
    for (const sample of CASES) {
      expect(sample.game.inspect(sample.state as OpaqueState).kind, sample.name).toBe("finished");
    }
  });

  for (const sample of CASES) {
    it(`${sample.name}: ships the bytes the v2 path shipped, with no fault`, () => {
      for (const rated of [true, false]) {
        const telemetry = { track: vi.fn(), fault: vi.fn() };
        const out = composeResultShare(sample.game, session(sample, "live", rated), 9, SUITE_SHARE_URL, telemetry);
        expect(out.fault).toBeNull();
        expect(telemetry.fault).not.toHaveBeenCalled();
        expect(out.text).toBe(v2Text(sample.v2Block(9, rated)));
        expect(out.lines.length).toBeLessThanOrEqual(SHARE_MAX_LINES);
        expect(out.lines.at(-1)).toBe(SUITE_SHARE_URL);
      }
    });

    it(`${sample.name}: carries no streak out of an archive replay`, () => {
      const live = composeResultShare(sample.game, session(sample, "live"), 9, SUITE_SHARE_URL);
      const replay = composeResultShare(sample.game, session(sample, "archive"), 9, SUITE_SHARE_URL);
      expect(replay.text).toBe(v2Text(sample.v2Block(0, true)));
      expect(replay.lines[0]).not.toContain("9");
      expect(live.lines.slice(1)).toEqual(replay.lines.slice(1));
    });
  }

  it("reports a defective artifact and still delivers a repaired string", () => {
    const sample = CASES[0] as Case;
    const tall: ArtifactModel = {
      title: "BROKEN #12 Rough",
      rows: Array.from({ length: 9 }, () => ["miss" as const]),
      outcome: { kind: "finished", score: 0, won: false, detail: "", tier: 4, bucket: 0, difficulty: 1 },
      fingerprint: { points: [{ x: 0, y: 0, shape: "refused" }] },
    };
    const broken = { ...sample.game, shareArtifact: () => tall } as AnyGameModuleV3;
    const telemetry = { track: vi.fn(), fault: vi.fn() };
    const out = composeResultShare(broken, session(sample, "live"), 0, SUITE_SHARE_URL, telemetry);
    expect(out.fault?.code).toBe("too-tall");
    expect(out.lines).toHaveLength(SHARE_MAX_LINES);
    expect(telemetry.fault).toHaveBeenCalledOnce();
  });

  it("hands the module the run log it produced, not one the shell built", () => {
    const sample = CASES[0] as Case;
    const run = sample.game.telemetry(sample.state as OpaqueState);
    const seen = vi.fn(sample.game.shareArtifact.bind(sample.game));
    composeResultShare({ ...sample.game, shareArtifact: seen } as AnyGameModuleV3, session(sample, "live"), 3, SUITE_SHARE_URL);
    expect(seen).toHaveBeenCalledOnce();
    expect(seen.mock.calls[0]?.[2]).toEqual(run);
    expect(seen.mock.calls[0]?.[3]).toEqual({ puzzleNumber: 12, currentStreak: 3, rated: true });
  });
});
