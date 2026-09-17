import { describe, expect, it } from "vitest";

import type { ShareContext, ShareRow } from "../../../src/core/types.js";
import { renderArtifact, validateArtifact } from "../../../src/engine/artifact.js";
import { runShareLeakChecks, type LeakSample } from "../../../src/engine/share-leak.js";
import type { ArtifactModel } from "../../../src/engine/telemetry.js";
import { validateRunLog } from "../../../src/engine/telemetry.js";
import { MOVE_CAP, type RotateLockAction, type RotateLockState } from "../../../src/games/rotate-lock/rules.js";
import {
  MAX_ROWS,
  ROW_WIDTH,
  artifactOf,
  fingerprintOf,
  readEntries,
  rotateLockLeakProbes,
  rowsFromRevisits,
  runEntries,
  runLogOf,
} from "../../../src/games/rotate-lock/telemetry.js";
import { generateForPuzzle } from "../../../src/games/rotate-lock/generator.js";
import { drawFor } from "../../../tools/rotate-lock-generate.js";
import { IDLE_ROTATE, fixturePuzzle, play, solvingLine } from "./fixtures.js";

const URL = "dailykit.providentia.games";
const context = (overrides: Partial<ShareContext> = {}): ShareContext => ({ puzzleNumber: 12, currentStreak: 0, rated: true, ...overrides });
const artifact = (state: RotateLockState, overrides: Partial<ShareContext> = {}): ArtifactModel =>
  artifactOf(state, runLogOf(state), context(overrides));

const puzzle = fixturePuzzle();
const perfect = play(puzzle, solvingLine(puzzle));
/** Three wasted moves and one backtrack, then the line. */
const DETOUR: RotateLockAction[] = [{ kind: "swap", a: 2, b: 3 }, { kind: "swap", a: 2, b: 3 }, { kind: "rotate", piece: 4 }];
const detoured = play(puzzle, [...DETOUR, { kind: "rotate", piece: 4 }, { kind: "rotate", piece: 4 }, { kind: "rotate", piece: 4 }, ...solvingLine(puzzle)]);
const jammed = play(puzzle, new Array<RotateLockAction>(MOVE_CAP).fill(IDLE_ROTATE));

describe("ROTATE LOCK run log", () => {
  it("records kind, revisit and the opening move, and nothing about the board", () => {
    expect(runEntries(perfect)).toEqual([
      { index: 0, kind: "swap", revisit: false, opened: false },
      { index: 1, kind: "rotate", revisit: false, opened: false },
      { index: 2, kind: "rotate", revisit: false, opened: true },
    ]);
    for (const entry of runEntries(detoured)) expect(Object.keys(entry).sort()).toEqual(["index", "kind", "opened", "revisit"]);
    expect(validateRunLog(runLogOf(detoured)).ok).toBe(true);
  });

  it("drops a malformed entry rather than throwing", () => {
    const run = { v: 1, entries: [null, 3, { index: 0, kind: "slide", revisit: false, opened: false }, { index: 1, kind: "rotate", revisit: true, opened: false }] };
    expect(readEntries(run)).toEqual([{ index: 1, kind: "rotate", revisit: true, opened: false }]);
  });
});

describe("ROTATE LOCK artifact, ROTATE-LOCK.md 17.3 and 17.4", () => {
  it("shares a perfect run as one short row with the tier and moves in the title", () => {
    const model = artifact(perfect, { currentStreak: 3 });
    expect(renderArtifact(model, URL)).toBe(["ROTATE LOCK #12 Excellent, 3 moves, streak 3", "🟦🟦🟦", URL].join("\n"));
    expect(validateArtifact(model, URL).ok).toBe(true);
  });

  it("marks backtracks, pads the last row, and grades the detour", () => {
    const model = artifact(detoured);
    expect(detoured.moves).toHaveLength(9);
    expect(renderArtifact(model, URL)).toBe(
      ["ROTATE LOCK #12 Good, 9 moves", "🟦⬜🟦🟦🟦⬜🟦🟦", "🟦⬛⬛⬛⬛⬛⬛⬛", URL].join("\n"),
    );
    expect(validateArtifact(model, URL).ok).toBe(true);
  });

  it("shares a jam as seven full rows inside the nine line cap", () => {
    const model = artifact(jammed);
    const lines = renderArtifact(model, URL).split("\n");
    expect(lines[0]).toBe("ROTATE LOCK #12 Rough, jammed");
    expect(lines).toHaveLength(9);
    expect(model.rows).toHaveLength(MAX_ROWS);
    expect(validateArtifact(model, URL).ok).toBe(true);
  });

  it("builds rows from revisit flags alone", () => {
    expect(rowsFromRevisits([])).toEqual([]);
    expect(rowsFromRevisits([false, true])).toEqual([["barFull", "barEmpty"]]);
    expect(rowsFromRevisits(new Array<boolean>(8).fill(false))).toEqual([new Array(8).fill("barFull")]);
    const nine = rowsFromRevisits(new Array<boolean>(9).fill(true));
    expect(nine).toHaveLength(2);
    expect(nine[1]).toEqual(["barEmpty", "unused", "unused", "unused", "unused", "unused", "unused", "unused"]);
  });

  it("gives two runs of the same length and tier different fingerprints", () => {
    const swapsFirst = fingerprintOf([
      { index: 0, kind: "swap", revisit: false, opened: false },
      { index: 1, kind: "rotate", revisit: false, opened: true },
    ]);
    const rotateFirst = fingerprintOf([
      { index: 0, kind: "rotate", revisit: false, opened: false },
      { index: 1, kind: "swap", revisit: false, opened: true },
    ]);
    expect(swapsFirst).not.toEqual(rotateFirst);
    expect(artifact(detoured).fingerprint.points.map((point) => point.shape)).toContain("correction");
  });

  /* The rows are the run's and never the puzzle's: the same moves on two
     different days give the same rows. */
  it("gives the same rows for the same run on a different puzzle", () => {
    const other = generateForPuzzle(3, drawFor(3));
    if (other === null) throw new Error("no day 3");
    const moves: RotateLockAction[] = [{ kind: "swap", a: 0, b: 1 }, { kind: "swap", a: 0, b: 1 }, { kind: "rotate", piece: 2 }];
    const here = play(puzzle, moves);
    const there = play(other.puzzle, moves);
    expect(artifactOf(here, runLogOf(here), context()).rows).toEqual(artifactOf(there, runLogOf(there), context()).rows);
  });
});

describe("ROTATE LOCK share leak certification, ARCHITECTURE2 section 16", () => {
  const samples: LeakSample[] = [perfect, detoured, jammed, play(puzzle, [IDLE_ROTATE, IDLE_ROTATE, IDLE_ROTATE, IDLE_ROTATE, ...solvingLine(puzzle)])].map(
    (state) => ({ artifact: artifact(state), answerKey: "row 1 column 1" }),
  );

  it("passes the good, average, bad and jammed matrix", () => {
    expect(runShareLeakChecks(samples, rotateLockLeakProbes)).toEqual({ ok: true, failures: [] });
  });

  /* Positive controls. A probe that has never fired is not evidence. */
  const base = samples[1] as LeakSample;
  const withRows = (rows: readonly ShareRow[]): LeakSample => ({ ...base, artifact: { ...base.artifact, rows } });

  it("fires the position probe on a direction token", () => {
    expect(rotateLockLeakProbes.positionLeak?.(withRows([["barFull", "right"]]))).toBe(true);
  });

  it("fires the answer property probe on rows the run did not produce", () => {
    const rows = base.artifact.rows.map((row) => row.map((token) => (token === "barEmpty" ? "barFull" : token)));
    expect(rotateLockLeakProbes.answerPropertyLeak?.(withRows(rows))).toBe(true);
  });

  it("fires the ordering probe on padding before a move", () => {
    expect(rotateLockLeakProbes.orderingLeak?.(withRows([["unused", "barFull"]]))).toBe(true);
    expect(rotateLockLeakProbes.orderingLeak?.(withRows([new Array(8).fill("unused"), new Array(8).fill("barFull")]))).toBe(true);
  });

  it("fires the shape probe on a ragged or too tall block", () => {
    expect(rotateLockLeakProbes.shapeLeak?.(withRows([new Array(ROW_WIDTH).fill("barFull"), ["barFull"]]))).toBe(true);
    expect(rotateLockLeakProbes.shapeLeak?.(withRows(new Array(MAX_ROWS + 1).fill(new Array(ROW_WIDTH).fill("barFull"))))).toBe(true);
  });

  it("fails the harness's own title check when the title names the answer", () => {
    const leaking: LeakSample = { ...base, artifact: { ...base.artifact, title: "ROTATE LOCK #12 start row 1 column 1" } };
    expect(runShareLeakChecks([leaking], rotateLockLeakProbes).ok).toBe(false);
  });
});
