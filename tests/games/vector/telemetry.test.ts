import { describe, expect, it } from "vitest";

import { validateArtifact } from "../../../src/engine/artifact.js";
import { runShareLeakChecks, type LeakSample } from "../../../src/engine/share-leak.js";
import type { ArtifactModel } from "../../../src/engine/telemetry.js";
import type { ShareContext, ShareRow } from "../../../src/core/types.js";
import {
  EFFORT_BANDS,
  RUN_LOG_VERSION,
  SHARE_ROW_WIDTH,
  effortBand,
  readEntries,
  vectorArtifact,
  vectorEntries,
  vectorFingerprint,
  vectorLeakProbes,
  vectorRunLog,
} from "../../../src/games/vector/telemetry.js";
import {
  apply,
  initialState,
  makePuzzle,
  type VectorAction,
  type VectorState,
} from "../../../src/games/vector/rules.js";
import type { Direction } from "../../../src/games/vector/propagate.js";
import { FIXTURE_LAYOUT, FIXTURE_SOLUTION, fixturePuzzle } from "./fixtures.js";

const puzzle = fixturePuzzle();
const BLANKS = puzzle.geometry.blankCells.length;
const URL = "dailykit.providentia.games";

function context(overrides: Partial<ShareContext> = {}): ShareContext {
  return { puzzleNumber: 249, currentStreak: 0, rated: true, ...overrides };
}

function run(state: VectorState, actions: readonly VectorAction[]): VectorState {
  let at = state;
  for (const action of actions) {
    const result = apply(at, action);
    if (!result.ok) throw new Error(result.error.code);
    at = result.value;
  }
  return at;
}

/** Fill every blank with the solution. */
function fill(state: VectorState): VectorState {
  return run(
    state,
    puzzle.geometry.blankCells.map((cell) => ({
      kind: "set" as const,
      cell,
      dir: FIXTURE_SOLUTION[cell] as Direction,
    })),
  );
}

/** Fill every blank with its first candidate, which is wrong on this board. */
function fillWrong(state: VectorState): VectorState {
  return run(
    state,
    puzzle.geometry.blankCells.map((cell) => ({ kind: "cycle" as const, cell })),
  );
}

describe("effortBand", () => {
  it("returns a band inside the declared range for any input", () => {
    for (const cycles of [0, 1, BLANKS, BLANKS * 2, BLANKS * 40]) {
      const band = effortBand(cycles, BLANKS);
      expect(Number.isInteger(band)).toBe(true);
      expect(band).toBeGreaterThanOrEqual(0);
      expect(band).toBeLessThan(EFFORT_BANDS);
    }
  });

  it("is zero for a single pass and climbs as the player reworks", () => {
    expect(effortBand(BLANKS, BLANKS)).toBe(0);
    expect(effortBand(BLANKS + 1, BLANKS)).toBe(1);
    expect(effortBand(BLANKS * 2, BLANKS)).toBe(2);
    expect(effortBand(BLANKS * 3, BLANKS)).toBe(3);
    expect(effortBand(BLANKS * 4, BLANKS)).toBe(4);
  });

  it("never divides by a blank count of zero", () => {
    expect(effortBand(10, 0)).toBe(0);
  });

  it("is monotone, so more work never reads as less", () => {
    let previous = 0;
    for (let cycles = 0; cycles <= BLANKS * 5; cycles += 1) {
      const band = effortBand(cycles, BLANKS);
      expect(band).toBeGreaterThanOrEqual(previous);
      previous = band;
    }
  });
});

describe("the run log", () => {
  it("is empty before a submission", () => {
    const log = vectorRunLog(fill(initialState(puzzle)));
    expect(log.v).toBe(RUN_LOG_VERSION);
    expect(log.entries).toEqual([]);
  });

  it("marks only the last submission as the solving one", () => {
    const first = run(fillWrong(initialState(puzzle)), [{ kind: "submit" }]);
    const second = run(fill(first), [{ kind: "submit" }]);
    const entries = vectorEntries(second);
    expect(entries.map((entry) => entry.solved)).toEqual([false, true]);
    expect(entries.map((entry) => entry.index)).toEqual([0, 1]);
  });

  it("marks no submission as solving on a loss", () => {
    let state = fillWrong(initialState(puzzle));
    state = run(state, [{ kind: "submit" }, { kind: "submit" }, { kind: "submit" }]);
    expect(vectorEntries(state).every((entry) => !entry.solved)).toBe(true);
  });

  it("drops an entry that does not have the shape it declares", () => {
    const entries = readEntries({
      v: RUN_LOG_VERSION,
      entries: [null, 7, { index: 0 }, { index: 0, cycles: 1, changes: 0, solved: true, blanks: 2 }],
    });
    expect(entries).toHaveLength(1);
  });
});

describe("the fingerprint", () => {
  it("separates two runs that reached the same tier by different work", () => {
    const brisk = run(fill(initialState(puzzle)), [{ kind: "submit" }]);

    let laboured = initialState(puzzle);
    // Walk the first cell around its candidates several times before filling.
    for (let at = 0; at < BLANKS * 3; at += 1) {
      laboured = run(laboured, [{ kind: "cycle", cell: puzzle.geometry.blankCells[0] as number }]);
    }
    laboured = run(fill(laboured), [{ kind: "submit" }]);

    expect(brisk.submissions).toBe(laboured.submissions);
    expect(brisk.solved).toBe(laboured.solved);

    const one = vectorFingerprint(vectorEntries(brisk));
    const two = vectorFingerprint(vectorEntries(laboured));
    expect(one.points).not.toEqual(two.points);
  });

  it("shapes a submission by whether it landed and whether it was reworked", () => {
    const straight = run(fill(initialState(puzzle)), [{ kind: "submit" }]);
    expect(vectorFingerprint(vectorEntries(straight)).points[0]?.shape).toBe("accepted");

    const missed = run(fillWrong(initialState(puzzle)), [{ kind: "submit" }]);
    expect(vectorFingerprint(vectorEntries(missed)).points[0]?.shape).toBe("refused");

    const reworked = run(
      run(fillWrong(initialState(puzzle)), [
        { kind: "cycle", cell: puzzle.geometry.blankCells[0] as number },
      ]),
      [{ kind: "submit" }],
    );
    expect(vectorFingerprint(vectorEntries(reworked)).points[0]?.shape).toBe("correction");
  });
});

describe("the mapper reads the run and never the board", () => {
  it("produces an identical artifact for the same run on a different solution", () => {
    const state = run(fill(initialState(puzzle)), [{ kind: "submit" }]);
    const log = vectorRunLog(state);

    /* A different board, same shape of run. If anything about the answer had
       reached the artifact, these two would differ. */
    const other = makePuzzle(249, FIXTURE_LAYOUT, { difficulty: 1, opening: 1 }, ["none"]);
    const twin: VectorState = { ...state, puzzle: other };

    const a = vectorArtifact(state, log, context());
    const b = vectorArtifact(twin, log, context());
    expect(b.title).toBe(a.title);
    expect(b.rows).toEqual(a.rows);
    expect(b.fingerprint).toEqual(a.fingerprint);
  });

  it("builds its rows from the run log it is handed, not from the state", () => {
    const state = run(fill(initialState(puzzle)), [{ kind: "submit" }]);
    const empty = vectorArtifact(state, { v: RUN_LOG_VERSION, entries: [] }, context());
    expect(empty.rows).toEqual([]);
  });
});

describe("the leak probes fire on a leak", () => {
  const state = run(fill(initialState(puzzle)), [{ kind: "submit" }]);
  const clean = vectorArtifact(state, vectorRunLog(state), context());
  const answerKey = FIXTURE_SOLUTION.map((dir) => (dir === null ? "." : String(dir))).join("");

  function sample(artifact: ArtifactModel): LeakSample {
    return { artifact, answerKey };
  }

  it("passes a clean artifact", () => {
    expect(runShareLeakChecks([sample(clean)], vectorLeakProbes).ok).toBe(true);
  });

  it("catches a row that encodes something inside itself", () => {
    const mixed: ShareRow = ["best", "miss", "best", "miss", "best"];
    const report = runShareLeakChecks(
      [sample({ ...clean, rows: [mixed] })],
      vectorLeakProbes,
    );
    expect(report.failures.join(" ")).toContain("positionLeak");
  });

  it("catches rows that do not follow from the outcome", () => {
    const rows: ShareRow[] = [new Array<"miss">(SHARE_ROW_WIDTH).fill("miss")];
    const report = runShareLeakChecks([sample({ ...clean, rows })], vectorLeakProbes);
    expect(report.failures.join(" ")).toContain("answerPropertyLeak");
  });

  it("catches a solving row that is not the last", () => {
    const best: ShareRow = new Array<"best">(SHARE_ROW_WIDTH).fill("best");
    const miss: ShareRow = new Array<"miss">(SHARE_ROW_WIDTH).fill("miss");
    const report = runShareLeakChecks(
      [sample({ ...clean, rows: [best, miss] })],
      vectorLeakProbes,
    );
    expect(report.failures.join(" ")).toContain("orderingLeak");
  });

  it("catches a row whose width is not the meter width", () => {
    const narrow: ShareRow = ["best"];
    const report = runShareLeakChecks([sample({ ...clean, rows: [narrow] })], vectorLeakProbes);
    expect(report.failures.join(" ")).toContain("shapeLeak");
  });

  it("catches the answer in the title, through the harness itself", () => {
    const report = runShareLeakChecks(
      [sample({ ...clean, title: `VECTOR #249 ${answerKey}` })],
      vectorLeakProbes,
    );
    expect(report.failures.join(" ")).toContain("title leak");
  });

  it("catches an artifact with no fingerprint", () => {
    const report = runShareLeakChecks(
      [sample({ ...clean, fingerprint: { points: [] } })],
      vectorLeakProbes,
    );
    expect(report.failures.join(" ")).toContain("no fingerprint");
    expect(validateArtifact({ ...clean, fingerprint: { points: [] } }, URL).ok).toBe(false);
  });
});
