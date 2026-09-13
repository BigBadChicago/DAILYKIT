import { describe, expect, it } from "vitest";
import { renderArtifact, validateArtifact } from "../../src/engine/artifact.js";
import { SHARE_MAX_TOKENS_PER_ROW } from "../../src/engine/share-grammar.js";
import type { ArtifactModel } from "../../src/engine/telemetry.js";
import { SHARE_GLYPHS } from "../../src/shared/share-vocabulary.js";
import type { ShareRow } from "../../src/core/types.js";
import type { FinishedOutcomeV3 } from "../../src/core/types.js";

const URL = "dailykit.providentia.games";
const outcome: FinishedOutcomeV3 = { kind: "finished", score: 1, won: true, detail: "", tier: 0, bucket: 0, difficulty: 1 };
function model(over: Partial<ArtifactModel> = {}): ArtifactModel {
  return {
    title: "TOY V3 #1 guess 1",
    rows: [["best"]] as ShareRow[],
    outcome,
    fingerprint: { points: [{ x: 0, y: 1, shape: "accepted" }] },
    ...over,
  };
}

describe("validateArtifact", () => {
  it("accepts a good artifact", () => {
    expect(validateArtifact(model(), URL).ok).toBe(true);
  });
  it("rejects an artifact with no fingerprint", () => {
    const r = validateArtifact(model({ fingerprint: { points: [] } }), URL);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("no-fingerprint");
  });
  it("rejects a block taller than nine lines", () => {
    const rows = Array.from({ length: 8 }, () => ["best"]) as ShareRow[];
    const r = validateArtifact(model({ rows }), URL);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("too-tall");
  });
  it("rejects a row wider than the token cap", () => {
    const wide = Array.from({ length: SHARE_MAX_TOKENS_PER_ROW + 1 }, () => "best") as ShareRow;
    const r = validateArtifact(model({ rows: [wide] }), URL);
    expect(r.ok).toBe(false);
    if (!r.ok) expect(r.error.code).toBe("row-too-wide");
  });
  it("rejects a non finished outcome shape", () => {
    const bad = { ...model(), outcome: { kind: "ongoing" } } as unknown as ArtifactModel;
    expect(validateArtifact(bad, URL).ok).toBe(false);
  });
});

describe("renderArtifact", () => {
  it("renders title, token rows, then the bare url", () => {
    const text = renderArtifact(model(), URL);
    expect(text).toBe(["TOY V3 #1 guess 1", SHARE_GLYPHS.best, URL].join("\n"));
  });
});
