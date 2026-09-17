import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CERTIFICATION_SCHEMA,
  GATE_STEPS,
  isProductionSafe,
  type GateCheck,
  type GateStep,
} from "../../src/engine/certification.js";
import {
  BUDGET_KEY,
  GAME_PLANS,
  HORIZON_DAYS,
  MANUAL_MOBILE_EXEMPTION,
  TEST_SUITE_KEY,
  buildRecord,
  checksFrom,
  horizonDays,
  liveGameIds,
  localDate,
  npmScripts,
  outcomesHash,
  parseRecord,
  planFor,
  productionSafeFromDisk,
  reconcile,
  recordPath,
  resolveDerivedProbes,
  serializeRecord,
  uniqueProbes,
  type Filesystem,
  type GamePlan,
  type Probe,
  type ProbeResult,
} from "../../tools/certify.js";

const fakeFs = (files: Record<string, string>): Filesystem => ({
  exists: (path) => path in files,
  read: (path) => {
    const text = files[path];
    if (text === undefined) throw new Error(`no ${path}`);
    return text;
  },
});

const allOk = (probes: readonly Probe[]): Map<string, ProbeResult> =>
  new Map(probes.map((probe) => [probe.key, { ok: true } as ProbeResult]));

const plans = (): GamePlan[] => liveGameIds().map((id) => planFor(id));

describe("the plans", () => {
  it("cover every live registry game and every gate step", () => {
    expect(liveGameIds()).toEqual(expect.arrayContaining(["poker-grid", "cipher", "vector"]));
    for (const gameId of liveGameIds()) {
      const plan = planFor(gameId);
      for (const step of GATE_STEPS) expect(plan[step], `${gameId} ${step}`).toBeDefined();
    }
  });

  it("refuse a live game with no plan, and a plan missing a step", () => {
    expect(() => planFor("rotate-lock")).toThrow(/no certification plan/);
    const partial = Object.fromEntries(
      Object.entries(GAME_PLANS["cipher"] as GamePlan).filter(([step]) => step !== "glyph-check"),
    );
    expect(() => planFor("cipher", { cipher: partial as GamePlan })).toThrow(/missing glyph-check/);
  });

  it("mark n/a only the two section 12 checks, each with a reason, and pending only the manual mobile check", () => {
    for (const gameId of liveGameIds()) {
      const plan = planFor(gameId);
      for (const step of GATE_STEPS) {
        const stepPlan = plan[step];
        if (stepPlan.kind === "n/a") {
          expect(["decomposition-check", "symmetry-check"]).toContain(step);
          expect(stepPlan.reason).toMatch(/BACKLOG/);
        }
        if (stepPlan.kind === "pending") {
          expect(step).toBe("manual-mobile-check");
          expect(stepPlan.exemption).toBe(MANUAL_MOBILE_EXEMPTION);
        }
        if (stepPlan.kind === "manual") expect(step).toBe("offline-smoke");
        if (stepPlan.kind === "probes") expect(stepPlan.probes.length).toBeGreaterThan(0);
      }
    }
  });

  it("name only files that exist in the repository", () => {
    for (const probe of uniqueProbes(plans())) {
      if (probe.kind === "test-file" || probe.kind === "file" || probe.kind === "horizon") {
        expect(existsSync(probe.path), probe.path).toBe(true);
      }
      if (probe.kind === "test-file") expect(probe.path).toMatch(/^tests\/.+\.test\.ts$/);
    }
  });

  it("name only npm scripts that exist, and ci.yml runs every one before the certify step", () => {
    const pkg = JSON.parse(readFileSync("package.json", "utf8")) as { scripts: Record<string, string> };
    const ci = readFileSync(".github/workflows/ci.yml", "utf8");
    const certifyAt = ci.indexOf("npm run certify -- --check --from-ci");
    expect(certifyAt).toBeGreaterThan(0);
    for (const script of npmScripts(uniqueProbes(plans()))) {
      expect(pkg.scripts[script], script).toBeDefined();
      const invocation = script === "test" ? /\brun: npm (?:run )?test\s*$/m : new RegExp(`\\brun: npm run ${script.replace(":", "\\:")}\\s*$`, "m");
      const match = invocation.exec(ci);
      expect(match, `ci.yml runs ${script}`).not.toBeNull();
      expect(match!.index, `${script} runs before certify`).toBeLessThan(certifyAt);
    }
  });
});

describe("uniqueProbes", () => {
  it("returns each key once across games", () => {
    const keys = uniqueProbes(plans()).map((probe) => probe.key);
    expect(new Set(keys).size).toBe(keys.length);
    expect(keys.filter((key) => key === TEST_SUITE_KEY)).toHaveLength(1);
  });

  it("refuses one key naming two different probes", () => {
    const base = planFor("cipher");
    const clash: GamePlan = {
      ...base,
      "glyph-check": { kind: "probes", probes: [{ kind: "file", key: "npm:test", path: "x" }] },
    };
    expect(() => uniqueProbes([base, clash])).toThrow(/names two different probes/);
  });
});

describe("horizonDays", () => {
  it("reads the integer horizon the shell reads", () => {
    expect(horizonDays({ horizon: 365 })).toBe(365);
  });

  it("refuses the first and last shape the shell refused, and anything else", () => {
    expect(horizonDays({ horizon: { first: 1, last: 365 } })).toBeNull();
    expect(horizonDays({ horizon: "365" })).toBeNull();
    expect(horizonDays(null)).toBeNull();
    expect(horizonDays({})).toBeNull();
  });

  it("finds at least a year in every committed index", () => {
    for (const gameId of liveGameIds()) {
      const index = JSON.parse(readFileSync(`data/${gameId}/manifest.index.json`, "utf8")) as unknown;
      expect(horizonDays(index)).toBeGreaterThanOrEqual(HORIZON_DAYS);
    }
  });
});

describe("resolveDerivedProbes", () => {
  const testFile: Probe = { kind: "test-file", key: "test:tests/a.test.ts", path: "tests/a.test.ts" };
  const study: Probe = { kind: "file", key: "file:data/s.json", path: "data/s.json" };
  const horizon: Probe = { kind: "horizon", key: "horizon:g", path: "data/g/manifest.index.json" };
  const page: Probe = { kind: "page", key: "page:g", gameId: "g" };
  const suite: Probe = { kind: "npm", key: TEST_SUITE_KEY, script: "test" };
  const budget: Probe = { kind: "npm", key: BUDGET_KEY, script: "budget" };
  const all = [suite, budget, testFile, study, horizon, page];
  const files = {
    "tests/a.test.ts": "",
    "data/s.json": "{}",
    "data/g/manifest.index.json": JSON.stringify({ horizon: 365 }),
    "out/g/index.html": "",
  };

  it("passes every derived probe when its facts and its dependency hold", () => {
    const results = resolveDerivedProbes(all, allOk([suite, budget]), fakeFs(files), "out");
    for (const probe of all) expect(results.get(probe.key), probe.key).toEqual({ ok: true });
  });

  it("fails a test file when the suite failed, even though the file exists", () => {
    const npm = new Map<string, ProbeResult>([[TEST_SUITE_KEY, { ok: false, detail: "exit 1" }], [BUDGET_KEY, { ok: true }]]);
    expect(resolveDerivedProbes(all, npm, fakeFs(files), "out").get(testFile.key)?.ok).toBe(false);
  });

  it("fails a test file that does not exist, even when the suite passed", () => {
    const { ["tests/a.test.ts"]: _gone, ...rest } = files;
    expect(resolveDerivedProbes(all, allOk([suite, budget]), fakeFs(rest), "out").get(testFile.key)?.ok).toBe(false);
  });

  it("fails a page the budgeted build left out, and any page when the budget failed", () => {
    const { ["out/g/index.html"]: _gone, ...rest } = files;
    expect(resolveDerivedProbes(all, allOk([suite, budget]), fakeFs(rest), "out").get(page.key)?.ok).toBe(false);
    const npm = new Map<string, ProbeResult>([[TEST_SUITE_KEY, { ok: true }], [BUDGET_KEY, { ok: false, detail: "over" }]]);
    expect(resolveDerivedProbes(all, npm, fakeFs(files), "out").get(page.key)?.ok).toBe(false);
  });

  it("fails a short or unreadable horizon, a missing study, and an npm script that never ran", () => {
    const short = { ...files, "data/g/manifest.index.json": JSON.stringify({ horizon: 300 }) };
    expect(resolveDerivedProbes(all, allOk([suite, budget]), fakeFs(short), "out").get(horizon.key)?.ok).toBe(false);
    const broken = { ...files, "data/g/manifest.index.json": "{" };
    expect(resolveDerivedProbes(all, allOk([suite, budget]), fakeFs(broken), "out").get(horizon.key)?.ok).toBe(false);
    const { ["data/s.json"]: _gone, ...rest } = files;
    expect(resolveDerivedProbes(all, allOk([suite, budget]), fakeFs(rest), "out").get(study.key)?.ok).toBe(false);
    expect(resolveDerivedProbes(all, allOk([suite]), fakeFs(files), "out").get(BUDGET_KEY)?.ok).toBe(false);
  });
});

describe("checksFrom", () => {
  const plan = planFor("cipher");
  const probes = uniqueProbes([plan]);

  it("turns passing probes into passes and carries n/a, pending and manual results as planned", () => {
    const checks = checksFrom(plan, allOk(probes));
    expect(checks.typecheck).toEqual({ outcome: "pass", evidence: "npm:typecheck, npm:typecheck:tools, npm:typecheck:sw" });
    expect(checks["symmetry-check"].outcome).toBe("n/a");
    expect(checks["manual-mobile-check"]).toEqual({ outcome: "pending", exemption: MANUAL_MOBILE_EXEMPTION });
    const offline = checks["offline-smoke"];
    expect(offline.outcome).toBe("pass");
    expect(offline.outcome === "pass" ? offline.evidence : "").toMatch(/^manual 2026-09-16: /);
  });

  it("fails a step when any of its probes failed, naming the probe", () => {
    const results = allOk(probes);
    results.set("npm:cipher:verify", { ok: false, detail: "exit 1" });
    const checks = checksFrom(plan, results);
    expect(checks["independent-verification"]).toEqual({ outcome: "fail", detail: "npm:cipher:verify: exit 1" });
    expect(checks["duplicate-check"].outcome).toBe("fail");
    expect(checks.typecheck.outcome).toBe("pass");
  });

  it("skips a step whose probe has no result, which the gate then refuses", () => {
    const results = allOk(probes);
    results.delete("npm:depcheck");
    const checks = checksFrom(plan, results);
    expect(checks["dependency-check"]).toEqual({ outcome: "skip" });
    expect(isProductionSafe(buildRecord("cipher", checks, "c"), "2026-10-01")).toBe(false);
  });

  it("yields a production safe record for every live game when every probe passes", () => {
    for (const gameId of liveGameIds()) {
      const plan = planFor(gameId);
      const record = buildRecord(gameId, checksFrom(plan, allOk(uniqueProbes([plan]))), "c");
      expect(isProductionSafe(record, "2026-09-16"), gameId).toBe(true);
    }
  });
});

describe("records", () => {
  const plan = planFor("vector");
  const checks = checksFrom(plan, allOk(uniqueProbes([plan])));

  it("hash content, not key order and not the commit", () => {
    const reordered = Object.fromEntries([...GATE_STEPS].reverse().map((step) => [step, checks[step]])) as Record<GateStep, GateCheck>;
    expect(outcomesHash("vector", reordered)).toBe(outcomesHash("vector", checks));
    expect(buildRecord("vector", checks, "one").outcomesHash).toBe(buildRecord("vector", checks, "two").outcomesHash);
    expect(outcomesHash("cipher", checks)).not.toBe(outcomesHash("vector", checks));
    const changed = { ...checks, tests: { outcome: "fail", detail: "x" } as GateCheck };
    expect(outcomesHash("vector", changed)).not.toBe(outcomesHash("vector", checks));
  });

  it("carry no timestamp", () => {
    const text = serializeRecord(buildRecord("vector", checks, "abc"));
    expect(text).not.toMatch(/generatedAt|\d{4}-\d{2}-\d{2}T/);
    expect(text.endsWith("}\n")).toBe(true);
  });

  it("round trip through serialize and parse, with steps in gate order", () => {
    const record = buildRecord("vector", checks, "abc");
    const text = serializeRecord(record);
    expect(parseRecord(text, "vector")).toEqual(record);
    expect(Object.keys((JSON.parse(text) as { checks: object }).checks)).toEqual([...GATE_STEPS]);
  });

  it("refuse a hand edited outcome, another game's record, a foreign schema, and broken JSON", () => {
    const record = buildRecord("vector", checks, "abc");
    const edited = { ...record, checks: { ...record.checks, tests: { outcome: "pass", evidence: "trust me" } } };
    expect(parseRecord(JSON.stringify(edited), "vector")).toBeNull();
    expect(parseRecord(serializeRecord(record), "cipher")).toBeNull();
    expect(parseRecord(JSON.stringify({ ...record, schema: CERTIFICATION_SCHEMA + 1 }), "vector")).toBeNull();
    expect(parseRecord("{", "vector")).toBeNull();
  });

  it("reconcile to the committed record when outcomes are unchanged, so the file is not rewritten", () => {
    const committed = buildRecord("vector", checks, "old");
    const fresh = buildRecord("vector", checks, "new");
    expect(reconcile(committed, fresh)).toEqual({ record: committed, changed: false });
    const failing = buildRecord("vector", { ...checks, tests: { outcome: "fail", detail: "x" } }, "new");
    expect(reconcile(committed, failing)).toEqual({ record: failing, changed: true });
    expect(reconcile(null, fresh).changed).toBe(true);
  });

  it("make a game production safe on disk only through a readable, safe record", () => {
    const path = recordPath("vector");
    const good = serializeRecord(buildRecord("vector", checks, "abc"));
    expect(productionSafeFromDisk("vector", "2026-10-01", fakeFs({ [path]: good }))).toBe(true);
    expect(productionSafeFromDisk("vector", "2026-10-01", fakeFs({}))).toBe(false);
    expect(productionSafeFromDisk("vector", "2026-12-16", fakeFs({ [path]: good }))).toBe(false);
    const failing = serializeRecord(buildRecord("vector", { ...checks, "byte-budget": { outcome: "fail", detail: "x" } }, "abc"));
    expect(productionSafeFromDisk("vector", "2026-10-01", fakeFs({ [path]: failing }))).toBe(false);
  });

  it("date the day in local time", () => {
    expect(localDate(new Date(2026, 0, 5, 23, 59))).toBe("2026-01-05");
  });
});

describe("the committed certification records", () => {
  /* Deliberately not "every record passes". The tests are evidence inside the
     records, so a test that required passing records would hold a failed record
     failed forever: the next certify run would see this test fail and write the
     failure again. Whether a record is current and safe is certify --check's
     question, asked in CI after the tests have run. */
  it("parse when present, belong to their game, and are written in the canonical form", () => {
    for (const gameId of liveGameIds()) {
      const path = recordPath(gameId);
      if (!existsSync(path)) continue;
      const text = readFileSync(path, "utf8");
      const record = parseRecord(text, gameId);
      expect(record, gameId).not.toBeNull();
      expect(serializeRecord(record!)).toBe(text);
    }
  });
});
