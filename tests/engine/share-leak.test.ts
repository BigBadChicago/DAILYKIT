import { describe, expect, it } from "vitest";
import { runShareLeakChecks, type LeakSample } from "../../src/engine/share-leak.js";
import type { ArtifactModel } from "../../src/engine/telemetry.js";
import type { FinishedOutcomeV3 } from "../../src/core/types.js";

const outcome: FinishedOutcomeV3 = { kind: "finished", score: 0, won: false, detail: "", tier: null, bucket: 3, difficulty: 1 };
function sample(title: string, answerKey: string): LeakSample {
  return {
    answerKey,
    artifact: { title, rows: [["miss"]], outcome, fingerprint: { points: [{ x: 0, y: 0, shape: "refused" }] } },
  };
}

describe("runShareLeakChecks", () => {
  it("passes a clean matrix", () => {
    const report = runShareLeakChecks([sample("TOY V3 #1 unsolved", "7")]);
    expect(report.ok).toBe(true);
  });
  it("catches the answer leaking into the title", () => {
    const report = runShareLeakChecks([sample("TOY V3 #1 answer 7", "7")]);
    expect(report.ok).toBe(false);
    expect(report.failures[0]).toContain("title leak");
  });
  it("catches a missing fingerprint", () => {
    const s: LeakSample = { answerKey: "", artifact: { title: "x", rows: [["miss"]], outcome, fingerprint: { points: [] } } };
    expect(runShareLeakChecks([s]).ok).toBe(false);
  });
  it("runs game supplied probes", () => {
    const report = runShareLeakChecks([sample("clean", "")], { orderingLeak: () => true });
    expect(report.ok).toBe(false);
    expect(report.failures[0]).toContain("orderingLeak");
  });
});
