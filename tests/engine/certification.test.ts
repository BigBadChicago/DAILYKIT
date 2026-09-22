import { describe, expect, it } from "vitest";
import {
  CERTIFICATION_SCHEMA,
  GATE_EXEMPTIONS,
  GATE_STEPS,
  isProductionSafe,
  refusalsFor,
  type CertificationRecord,
  type GateCheck,
  type GateExemption,
  type GateStep,
} from "../../src/engine/certification.js";

const EXEMPTION: GateExemption = {
  id: "test-exemption",
  steps: ["manual-mobile-check"],
  games: ["alpha"],
  issued: "2026-09-16",
  expires: "2026-12-15",
  reason: "fixture",
};

function record(overrides: Partial<Record<GateStep, GateCheck>> = {}, gameId = "alpha"): CertificationRecord {
  const checks = {} as Record<GateStep, GateCheck>;
  for (const step of GATE_STEPS) checks[step] = { outcome: "pass" };
  return { schema: CERTIFICATION_SCHEMA, gameId, certifiedCommit: "abc", outcomesHash: "h", checks: { ...checks, ...overrides } };
}

const safe = (r: CertificationRecord, date = "2026-10-01"): boolean => isProductionSafe(r, date, [EXEMPTION]);

describe("the gate steps", () => {
  it("are the nineteen of section 45, in its order, once each", () => {
    expect(GATE_STEPS).toHaveLength(19);
    expect(new Set(GATE_STEPS).size).toBe(19);
    expect(GATE_STEPS[0]).toBe("typecheck");
    expect(GATE_STEPS[18]).toBe("manual-mobile-check");
  });
});

describe("isProductionSafe", () => {
  it("accepts a record where every step passes", () => {
    expect(safe(record())).toBe(true);
    expect(refusalsFor(record(), "2026-10-01", [EXEMPTION])).toEqual([]);
  });

  it("refuses a failure", () => {
    const r = record({ tests: { outcome: "fail", detail: "3 failed" } });
    expect(safe(r)).toBe(false);
    expect(refusalsFor(r, "2026-10-01", [EXEMPTION])).toEqual([{ step: "tests", why: "failed: 3 failed" }]);
  });

  it("refuses a skip, because a skip is not a pass", () => {
    expect(safe(record({ "byte-budget": { outcome: "skip" } }))).toBe(false);
  });

  it("accepts n/a with a written reason", () => {
    expect(safe(record({ "symmetry-check": { outcome: "n/a", reason: "no symmetry checker exists" } }))).toBe(true);
  });

  it("refuses n/a without a reason, with a blank reason, or with a reason that is not text", () => {
    expect(safe(record({ "symmetry-check": { outcome: "n/a", reason: "" } }))).toBe(false);
    expect(safe(record({ "symmetry-check": { outcome: "n/a", reason: "   " } }))).toBe(false);
    const untyped = { outcome: "n/a" } as unknown as GateCheck;
    expect(safe(record({ "symmetry-check": untyped }))).toBe(false);
  });

  it("accepts pending under a live exemption naming the step and the game, inclusive of both dates", () => {
    const r = record({ "manual-mobile-check": { outcome: "pending", exemption: "test-exemption" } });
    expect(safe(r, "2026-09-16")).toBe(true);
    expect(safe(r, "2026-12-15")).toBe(true);
  });

  it("refuses pending under an expired or not yet issued exemption", () => {
    const r = record({ "manual-mobile-check": { outcome: "pending", exemption: "test-exemption" } });
    expect(safe(r, "2026-12-16")).toBe(false);
    expect(safe(r, "2026-09-15")).toBe(false);
  });

  it("refuses pending under an exemption that names another game", () => {
    const r = record({ "manual-mobile-check": { outcome: "pending", exemption: "test-exemption" } }, "beta");
    expect(safe(r)).toBe(false);
    expect(refusalsFor(r, "2026-10-01", [EXEMPTION])[0]?.why).toContain("does not cover beta");
  });

  it("refuses pending under an exemption that names another step", () => {
    expect(safe(record({ "offline-smoke": { outcome: "pending", exemption: "test-exemption" } }))).toBe(false);
  });

  it("refuses pending under an exemption that does not exist", () => {
    expect(safe(record({ "manual-mobile-check": { outcome: "pending", exemption: "invented" } }))).toBe(false);
  });

  it("refuses a missing step, an unknown outcome, and a foreign schema", () => {
    const missing = record();
    const checks = { ...missing.checks } as Partial<Record<GateStep, GateCheck>>;
    delete checks["glyph-check"];
    expect(safe({ ...missing, checks: checks as Record<GateStep, GateCheck> })).toBe(false);
    expect(safe(record({ tests: { outcome: "maybe" } as unknown as GateCheck }))).toBe(false);
    expect(safe({ ...record(), schema: CERTIFICATION_SCHEMA + 1 })).toBe(false);
  });

  it("rejects a date that is not a calendar date rather than comparing it as text", () => {
    expect(() => isProductionSafe(record(), "16/09/2026")).toThrow();
  });
});

describe("the committed exemptions", () => {
  it("each names steps, games, a reason and an issue date on or before its expiry", () => {
    for (const exemption of GATE_EXEMPTIONS) {
      expect(exemption.steps.length).toBeGreaterThan(0);
      expect(exemption.games.length).toBeGreaterThan(0);
      expect(exemption.reason.trim()).not.toBe("");
      expect(exemption.issued <= exemption.expires).toBe(true);
      for (const step of exemption.steps) expect(GATE_STEPS).toContain(step);
    }
  });

  it("each covers only the manual mobile check, named games and a reason", () => {
    for (const exemption of GATE_EXEMPTIONS) {
      expect(exemption.steps).toEqual(["manual-mobile-check"]);
      expect(exemption.games.length).toBeGreaterThan(0);
    }
    const first = GATE_EXEMPTIONS.find((e) => e.id === "manual-mobile-2026-09-16");
    expect(first?.games).toEqual(["poker-grid", "cipher", "vector"]);
    expect(first?.issued).toBe("2026-09-16");
    const second = GATE_EXEMPTIONS.find((e) => e.id === "manual-mobile-2026-09-22");
    expect(second?.games).toEqual(["rotate-lock", "difference-relay", "word-ladder", "pangram", "five-letters"]);
    expect(second?.issued).toBe("2026-09-22");
  });
});
