import { describe, expect, it } from "vitest";
import { renderArtifact, validateArtifact } from "../../src/engine/artifact.js";
import { runShareLeakChecks } from "../../src/engine/share-leak.js";
import { validateRunLog } from "../../src/engine/telemetry.js";
import type { ShareContext } from "../../src/core/types.js";
import { toyInternals, type ToyState } from "../../src/games/toy-v3/module.js";

const ctx: ShareContext = { puzzleNumber: 1, currentStreak: 0, rated: true };
const URL = "dailykit.providentia.games";

function play(target: number, guesses: readonly number[]): ToyState {
  let state = toyInternals.initialState(toyInternals.makePuzzle(1, target));
  for (const g of guesses) {
    const r = toyInternals.apply(state, { kind: "guess", value: g });
    if (!r.ok) throw new Error(r.error.code);
    state = r.value;
  }
  return state;
}

describe("toy v3 contract round trip", () => {
  it("finishes a win with a v3 outcome carrying bucket and difficulty", () => {
    const state = play(7, [3, 7]);
    const outcome = toyInternals.inspect(state);
    expect(outcome).toEqual({ kind: "finished", score: 2, won: true, detail: "Solved on guess 2", tier: 1, bucket: 1, difficulty: 1 });
  });

  it("finishes a loss after three guesses", () => {
    const outcome = toyInternals.inspect(play(7, [0, 1, 2]));
    expect(outcome.kind).toBe("finished");
    if (outcome.kind === "finished") {
      expect(outcome.won).toBe(false);
      expect(outcome.bucket).toBe(3);
      expect(outcome.tier).toBeNull();
    }
  });

  it("produces a valid, leak free artifact that renders inside the grammar", () => {
    const state = play(7, [3, 7]);
    const run = toyInternals.telemetry(state);
    expect(validateRunLog(run).ok).toBe(true);
    const artifact = toyInternals.shareArtifact(state.puzzle, state, run, ctx);
    expect(validateArtifact(artifact, URL).ok).toBe(true);
    const leak = runShareLeakChecks([{ artifact, answerKey: String(state.puzzle.target) }]);
    expect(leak.ok).toBe(true);
    expect(renderArtifact(artifact, URL).split("\n").at(-1)).toBe(URL);
  });

  it("gives two runs of the same tier different fingerprints", () => {
    const a = toyInternals.telemetry(play(5, [5]));
    const b = toyInternals.telemetry(play(5, [1, 5]));
    const fa = toyInternals.shareArtifact(play(5, [5]).puzzle, play(5, [5]), a, ctx).fingerprint;
    const fb = toyInternals.shareArtifact(play(5, [1, 5]).puzzle, play(5, [1, 5]), b, ctx).fingerprint;
    expect(fa.points.length).not.toBe(fb.points.length);
  });

  it("round trips its serialized state", () => {
    const state = play(7, [3, 7]);
    const raw = toyInternals.serialize(state);
    const back = toyInternals.deserialize(state.puzzle, raw);
    expect(back.ok).toBe(true);
    if (back.ok) expect(back.value.guesses).toEqual([3, 7]);
  });
});
