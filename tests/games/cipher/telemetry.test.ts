import { describe, expect, it } from "vitest";
import type { ShareContext, ShareRow } from "../../../src/core/types.js";
import { renderArtifact, validateArtifact } from "../../../src/engine/artifact.js";
import { SHARE_MAX_LINES } from "../../../src/engine/share-grammar.js";
import { runShareLeakChecks, type LeakSample } from "../../../src/engine/share-leak.js";
import type { ArtifactModel } from "../../../src/engine/telemetry.js";
import cipher, { internals } from "../../../src/games/cipher/module.js";
import {
  CODE_LENGTH,
  MAX_GUESSES,
  applyCipherAction,
  initialCipherState,
  type CipherState,
  type Code,
} from "../../../src/games/cipher/rules.js";
import {
  RUN_LOG_VERSION,
  SHARE_ROW_WIDTH,
  artifactRows,
  cipherArtifact,
  cipherEntries,
  cipherFingerprint,
  cipherLeakProbes,
  cipherRunLog,
  readEntries,
  shareRow,
} from "../../../src/games/cipher/telemetry.js";
import type { CipherPuzzle } from "../../../src/games/cipher/generator.js";

const CODE: Code = [1, 1, 4, 5];
const ANSWER_KEY = CODE.join("");
const URL = "dailykit.providentia.games";

const puzzle: CipherPuzzle = { number: 12, code: CODE, levers: ["one-pair"], best: { remaining: 105, line: 5 } };

function play(guesses: readonly Code[]): CipherState {
  let current = initialCipherState(CODE);
  for (const guess of guesses) {
    for (let slot = 0; slot < CODE_LENGTH; slot += 1) {
      const set = applyCipherAction(current, { kind: "set", slot, symbol: guess[slot] as number });
      if (!set.ok) throw new Error(set.error.code);
      current = set.value;
    }
    const submit = applyCipherAction(current, { kind: "submit" });
    if (!submit.ok) throw new Error(submit.error.code);
    current = submit.value;
  }
  return current;
}

const context = (overrides: Partial<ShareContext> = {}): ShareContext => ({
  puzzleNumber: 12,
  currentStreak: 0,
  rated: true,
  ...overrides,
});

/* One guess, three guesses, and a full six guess failure. Section 16 asks for a
   good, an average and a bad artifact, and these are CIPHER's three. */
const ONE_GUESS: readonly Code[] = [CODE];
const THREE_GUESS: readonly Code[] = [[0, 0, 1, 2], [0, 0, 1, 3], CODE];
const LOST: readonly Code[] = [
  [0, 0, 0, 0], [0, 0, 0, 1], [0, 0, 0, 2], [0, 0, 0, 3], [0, 0, 0, 4], [0, 0, 1, 0],
];

function artifactFor(guesses: readonly Code[], overrides: Partial<ShareContext> = {}): ArtifactModel {
  const state = play(guesses);
  return cipherArtifact(state, cipherRunLog(state), context(overrides));
}

const MATRIX: readonly LeakSample[] = [ONE_GUESS, THREE_GUESS, LOST].map((guesses) => ({
  artifact: artifactFor(guesses),
  answerKey: ANSWER_KEY,
}));

function withRows(sample: LeakSample, rows: readonly ShareRow[]): LeakSample {
  return { ...sample, artifact: { ...sample.artifact, rows } };
}

describe("the cipher run log", () => {
  it("is derivable from the guess history alone, so the state did not change", () => {
    expect(internals.STATE_VERSION).toBe(1);
    expect(cipher.stateVersion).toBe(1);
  });

  it("survives a reload, because deserialize rebuilds every guess", () => {
    const played = play(THREE_GUESS);
    const stored = cipher.serialize(played as never);
    const restored = cipher.deserialize(puzzle as never, stored);
    if (!restored.ok) throw new Error(restored.error.code);
    expect(cipherEntries(restored.value as unknown as CipherState)).toEqual(cipherEntries(played));
  });

  it("carries integers only, never a guessed code", () => {
    const entries = cipherEntries(play(THREE_GUESS));
    for (const entry of entries) {
      expect(Object.keys(entry).sort()).toEqual(
        ["churn", "discipline", "exact", "index", "misplaced", "solved"],
      );
      for (const value of Object.values(entry)) {
        expect(Array.isArray(value)).toBe(false);
        expect(typeof value === "number" || typeof value === "boolean").toBe(true);
      }
    }
  });

  it("counts churn as slots changed since the previous guess, and zero for the first", () => {
    const entries = cipherEntries(play([[0, 0, 1, 2], [0, 0, 1, 3], [1, 1, 4, 5]]));
    expect(entries.map((entry) => entry.churn)).toEqual([0, 1, 4]);
  });

  it("grades discipline against what the player already knew", () => {
    /* Guess two contradicts guess one, so it is refused. Guess three respects
       guess two's feedback but not guess one's, which is the middle class. */
    const entries = cipherEntries(play([[0, 0, 0, 0], [0, 0, 0, 1], [2, 2, 2, 0]]));
    expect(entries.map((entry) => entry.discipline)).toEqual([2, 0, 1]);
  });

  it("calls the first guess disciplined, because an empty set of clues contradicts nothing", () => {
    expect(cipherEntries(play([[0, 0, 0, 0]]))[0]?.discipline).toBe(2);
  });

  it("re-narrows an opaque log and drops entries it cannot read", () => {
    const good = cipherRunLog(play(THREE_GUESS));
    expect(good.v).toBe(RUN_LOG_VERSION);
    expect(readEntries(good)).toEqual(cipherEntries(play(THREE_GUESS)));
    expect(readEntries({ v: 1, entries: [null, 7, { index: 0 }] })).toEqual([]);
  });
});

describe("the cipher fingerprint", () => {
  it("puts one point per guess, chronology across and churn up", () => {
    const entries = cipherEntries(play(THREE_GUESS));
    const points = cipherFingerprint(entries).points;
    expect(points).toHaveLength(entries.length);
    expect(points.map((point) => point.x)).toEqual([0, 1, 2]);
    expect(points.map((point) => point.y)).toEqual(entries.map((entry) => entry.churn));
  });

  it("maps discipline onto the three shapes, worst to best", () => {
    const shapes = cipherFingerprint(cipherEntries(play([[0, 0, 0, 0], [0, 0, 0, 1], [2, 2, 2, 0]]))).points
      .map((point) => point.shape);
    expect(shapes).toEqual(["accepted", "refused", "correction"]);
  });

  /* Section 18. If two players at one tier could not differ here, the
     fingerprint would be the tier wearing a picture. */
  it("separates two runs that earned the same tier", () => {
    const left = cipherFingerprint(cipherEntries(play([[0, 0, 1, 2], [0, 0, 1, 3], CODE])));
    const right = cipherFingerprint(cipherEntries(play([[5, 4, 1, 1], [1, 4, 5, 1], CODE])));
    expect(cipher.inspect(play([[0, 0, 1, 2], [0, 0, 1, 3], CODE]) as never)).toMatchObject({ tier: 1 });
    expect(cipher.inspect(play([[5, 4, 1, 1], [1, 4, 5, 1], CODE]) as never)).toMatchObject({ tier: 1 });
    expect(left.points).not.toEqual(right.points);
  });

  it("never leaves an artifact without one, which is what makes it not a restyled score", () => {
    for (const sample of MATRIX) expect(sample.artifact.fingerprint.points.length).toBeGreaterThan(0);
  });
});

describe("the cipher artifact", () => {
  it("is the shipped share block plus an outcome and a fingerprint", () => {
    const state = play(THREE_GUESS);
    const block = cipher.shareBlock(state as never, context());
    const artifact = cipherArtifact(state, cipherRunLog(state), context());
    expect(artifact.title).toBe(block.title);
    expect(artifact.rows).toEqual(block.rows);
  });

  it("renders the same rows the design document's worked examples show", () => {
    const rows = artifactRows(cipherEntries(play([[0, 0, 1, 2], [1, 4, 5, 1], CODE])));
    expect(rows).toEqual([
      ["partial", "miss", "miss", "miss"],
      ["best", "partial", "partial", "partial"],
      ["best", "best", "best", "best"],
    ]);
    expect(shareRow(1, 1)).toEqual(["best", "partial", "miss", "miss"]);
  });

  it("validates and fits the nine line grammar at its tallest", () => {
    for (const sample of MATRIX) {
      const validated = validateArtifact(sample.artifact, URL);
      expect(validated.ok).toBe(true);
      expect(renderArtifact(sample.artifact, URL).split("\n").length).toBeLessThanOrEqual(SHARE_MAX_LINES);
    }
    const lost = MATRIX[2] as LeakSample;
    expect(lost.artifact.rows).toHaveLength(MAX_GUESSES);
    expect(renderArtifact(lost.artifact, URL).split("\n")).toHaveLength(MAX_GUESSES + 2);
  });

  it("declares no more rows than it can emit", () => {
    expect(internals.shareCapabilities.maxRows).toBe(MAX_GUESSES);
    expect(internals.shareCapabilities.patterns.length).toBeGreaterThanOrEqual(2);
    for (const sample of MATRIX) {
      expect(sample.artifact.rows.length).toBeLessThanOrEqual(internals.shareCapabilities.maxRows);
    }
  });

  it("carries the v3 outcome, difficulty included", () => {
    const artifact = MATRIX[1] as LeakSample;
    expect(artifact.artifact.outcome.difficulty).toBe(internals.difficulty(puzzle));
    expect(artifact.artifact.outcome.bucket).toBe(2);
    expect(artifact.artifact.outcome.tier).toBe(1);
  });
});

describe("share leak certification", () => {
  it("passes the whole matrix", () => {
    const report = runShareLeakChecks(MATRIX, cipherLeakProbes);
    expect(report.failures).toEqual([]);
    expect(report.ok).toBe(true);
  });

  /* Each probe below is handed an artifact that really does leak. A probe that
     has never fired is not evidence. */
  it("fires the position probe on an unsorted row", () => {
    const leaking = withRows(MATRIX[1] as LeakSample, [["miss", "best", "best", "miss"]]);
    expect(cipherLeakProbes.positionLeak?.(leaking)).toBe(true);
    expect(runShareLeakChecks([leaking], cipherLeakProbes).ok).toBe(false);
  });

  it("fires the answer property probe on a title that carries the difficulty class", () => {
    const sample = MATRIX[1] as LeakSample;
    const leaking: LeakSample = {
      ...sample,
      artifact: { ...sample.artifact, title: "CIPHER #12 Great, 105 left after the opening" },
    };
    expect(cipherLeakProbes.answerPropertyLeak?.(leaking)).toBe(true);
  });

  it("fires the answer property probe on a row that is not a legal feedback", () => {
    const three = MATRIX[1] as LeakSample;
    expect(cipherLeakProbes.answerPropertyLeak?.(withRows(three, [["best", "best", "best", "partial"]]))).toBe(true);
    expect(cipherLeakProbes.answerPropertyLeak?.(withRows(three, [["best", "strong", "miss", "miss"]]))).toBe(true);
  });

  it("fires the answer property probe when the last row disagrees with the result", () => {
    const won = MATRIX[0] as LeakSample;
    expect(cipherLeakProbes.answerPropertyLeak?.(withRows(won, [["best", "best", "best", "miss"]]))).toBe(true);
  });

  it("fires the ordering probe when the solving row is not the last", () => {
    const three = MATRIX[1] as LeakSample;
    const rows: ShareRow[] = [
      ["best", "best", "best", "best"],
      ["best", "partial", "miss", "miss"],
    ];
    expect(cipherLeakProbes.orderingLeak?.(withRows(three, rows))).toBe(true);
    expect(cipherLeakProbes.orderingLeak?.(withRows(three, new Array<ShareRow>(MAX_GUESSES + 1).fill(
      ["miss", "miss", "miss", "miss"],
    )))).toBe(true);
  });

  it("fires the shape probe on a row that is not four cells", () => {
    const three = MATRIX[1] as LeakSample;
    expect(cipherLeakProbes.shapeLeak?.(withRows(three, [["best", "miss", "miss"]]))).toBe(true);
    expect(SHARE_ROW_WIDTH).toBe(CODE_LENGTH);
  });

  it("fires the harness title check when the code reaches the title", () => {
    const sample = MATRIX[1] as LeakSample;
    const leaking: LeakSample = {
      ...sample,
      artifact: { ...sample.artifact, title: `CIPHER #12 Great ${ANSWER_KEY}` },
    };
    const report = runShareLeakChecks([leaking], cipherLeakProbes);
    expect(report.ok).toBe(false);
    expect(report.failures.join(" ")).toContain("title leak");
  });

  it("keeps a clean artifact clean under a long streak", () => {
    const streaked: LeakSample = { artifact: artifactFor(THREE_GUESS, { currentStreak: 12 }), answerKey: ANSWER_KEY };
    expect(streaked.artifact.title).toBe("CIPHER #12 Great, streak 12");
    expect(runShareLeakChecks([streaked], cipherLeakProbes).ok).toBe(true);
  });
});
