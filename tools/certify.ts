/**
 * Tools layer. The section 45 certification gate as a job. ARCHITECTURE2
 * sections 45 and 50, v3 migration phase 5 part B.
 *
 * The pure half decides what each gate step means for each live game, turns
 * probe results into checks, and builds, hashes, reads and compares the
 * committed record. The runner at the bottom only executes probes and writes
 * files, in the style of tools/sw-manifest.ts, so every rule here is testable
 * without running a build.
 *
 * Three modes:
 *   npm run certify                     runs every probe, writes changed records
 *   npm run certify -- --check          the same, and fails if a record would change
 *   npm run certify -- --check --from-ci  trusts the npm steps CI already ran in
 *                                       this job, still checks files itself
 *
 * Any mode exits non zero when a live game is not production safe.
 */

import { createHash } from "node:crypto";
import { existsSync, readFileSync } from "node:fs";

import { canonicalJson } from "../src/core/canonical-json.js";
import {
  CERTIFICATION_SCHEMA,
  GATE_STEPS,
  refusalsFor,
  type CertificationRecord,
  type GateCheck,
  type GateStep,
} from "../src/engine/certification.js";
import { SUITE_GAMES } from "../src/shell/registry.js";

/* ------------------------------------------------------------------------ */
/* Probes                                                                    */
/* ------------------------------------------------------------------------ */

/**
 * The smallest facts a step rests on. A probe is identified by its key, and two
 * steps naming the same key share one run, which is what keeps a suite wide
 * command from running once per step per game.
 */
export type Probe =
  /** An npm script. Exit status zero is the pass. */
  | { readonly kind: "npm"; readonly key: string; readonly script: string }
  /** A spec file under tests/. Passes when it exists and `npm test`, which
   *  collects every such file, passed. Never run twice. */
  | { readonly kind: "test-file"; readonly key: string; readonly path: string }
  /** A committed file that must exist, such as a calibration study. */
  | { readonly kind: "file"; readonly key: string; readonly path: string }
  /** The manifest index declares at least HORIZON_DAYS days from puzzle 1. */
  | { readonly kind: "horizon"; readonly key: string; readonly path: string }
  /** The byte budget ran over a build that contained this game's page. A build
   *  that silently dropped the game must not certify its budget. */
  | { readonly kind: "page"; readonly key: string; readonly gameId: string };

export type ProbeResult = { readonly ok: true } | { readonly ok: false; readonly detail: string };

export const HORIZON_DAYS = 365;

const npm = (script: string): Probe => ({ kind: "npm", key: `npm:${script}`, script });
const testFile = (path: string): Probe => ({ kind: "test-file", key: `test:${path}`, path });
const file = (path: string): Probe => ({ kind: "file", key: `file:${path}`, path });

/** Probes other probes depend on. A test-file probe means nothing if the suite
 *  did not pass, and a page probe means nothing without the budget. */
export const TEST_SUITE_KEY = "npm:test";
export const BUDGET_KEY = "npm:budget";
export const BUILD_KEY = "npm:build";

/* ------------------------------------------------------------------------ */
/* Plans                                                                     */
/* ------------------------------------------------------------------------ */

export type StepPlan =
  | { readonly kind: "probes"; readonly probes: readonly Probe[] }
  | { readonly kind: "n/a"; readonly reason: string }
  | { readonly kind: "pending"; readonly exemption: string }
  /** A result a person produced and wrote down. Recorded as a pass with its
   *  date and evidence, so the claim is visible in the committed record. */
  | { readonly kind: "manual"; readonly date: string; readonly evidence: string };

export type GamePlan = Readonly<Record<GateStep, StepPlan>>;

const probes = (...list: Probe[]): StepPlan => ({ kind: "probes", probes: list });

/** The live games built before sections 9.2 and 12 existed. */
const LEGACY_DECOMPOSITION =
  "Built before ARCHITECTURE2 section 12.1; no decomposition checker exists for this concept. " +
  "Retrofit logged in BACKLOG.md.";
const LEGACY_SYMMETRY =
  "Built before ARCHITECTURE2 section 12.2; no symmetry checker exists for this concept. " +
  "Retrofit logged in BACKLOG.md.";

export const MANUAL_MOBILE_EXEMPTION = "manual-mobile-2026-09-16";

/** Recorded by hand in v3 migration phase 5 part B, per offline decision 12. */
export const OFFLINE_SMOKE_RESULT: StepPlan = {
  kind: "manual",
  date: "2026-09-16",
  evidence:
    "Headless Chromium against vite preview of the release build, engine-v2: service worker installed, " +
    "server stopped, context offline; hub and POKER GRID, CIPHER and VECTOR rendered their boards from cache. " +
    "Offline decision 12 requires a rerun after any change to the worker or to asset naming.",
};

/** Steps whose evidence is the same for every game. */
function suiteSteps(): Pick<
  Record<GateStep, StepPlan>,
  "typecheck" | "tests" | "dependency-check" | "determinism-vectors" | "glyph-check"
> {
  return {
    typecheck: probes(npm("typecheck"), npm("typecheck:tools"), npm("typecheck:sw")),
    tests: probes(npm("test")),
    "dependency-check": probes(npm("depcheck")),
    "determinism-vectors": probes(testFile("tests/core/rng.test.ts")),
    "glyph-check": probes(testFile("tests/engine/share-grammar.test.ts")),
  };
}

function budgetStep(gameId: string): StepPlan {
  return probes(npm("build"), npm("budget"), { kind: "page", key: `page:${gameId}`, gameId });
}

function tailSteps(gameId: string): Pick<
  Record<GateStep, StepPlan>,
  "decomposition-check" | "symmetry-check" | "offline-smoke" | "byte-budget" | "manual-mobile-check"
> {
  return {
    "decomposition-check": { kind: "n/a", reason: LEGACY_DECOMPOSITION },
    "symmetry-check": { kind: "n/a", reason: LEGACY_SYMMETRY },
    "offline-smoke": OFFLINE_SMOKE_RESULT,
    "byte-budget": budgetStep(gameId),
    "manual-mobile-check": { kind: "pending", exemption: MANUAL_MOBILE_EXEMPTION },
  };
}

/**
 * The plan `npm run new-game` writes for a new game, v3 migration phase 6.
 *
 * Automated steps get the probes a finished game would have, pointed at the
 * files the scaffold writes or the files the game must add, so their evidence
 * is real from the first run and a missing verifier or manifest fails rather
 * than passes. The five steps a stub cannot pass get an empty probe list, which
 * checksFrom records as a skip and the gate refuses whatever else the record
 * says. Not n/a, because a reason a tool wrote is not a reason anyone checked,
 * and not pending, because no exemption covers a new game and an invented one
 * would refuse for a misleading reason.
 *
 * A stub is also `planned` in the registry and liveGameIds certifies only live
 * games, so this plan is not evaluated until its author marks the game live.
 */
export function newGamePlan(gameId: string): GamePlan {
  const tests = `tests/games/${gameId}`;
  return {
    ...suiteSteps(),
    "generation-pipeline": probes(testFile(`${tests}/generator.test.ts`)),
    "independent-verification": probes(npm(`${gameId}:verify`)),
    /* The author replaces this with the game's calibration study and its test. */
    "difficulty-calibration": probes(),
    "yearly-horizon": probes(npm(`${gameId}:verify`), {
      kind: "horizon",
      key: `horizon:${gameId}`,
      path: `data/${gameId}/manifest.index.json`,
    }),
    "duplicate-check": probes(npm(`${gameId}:verify`)),
    /* The author replaces this with the game's decomposition checker, ARCHITECTURE2 section 12.1. */
    "decomposition-check": probes(),
    /* The author replaces this with the game's symmetry checker, ARCHITECTURE2 section 12.2. */
    "symmetry-check": probes(),
    "share-leak-check": probes(testFile(`${tests}/module.test.ts`)),
    "accessibility-contract": probes(testFile(`${tests}/render.test.ts`), testFile("tests/ui/a11y.test.ts")),
    "state-round-trip": probes(testFile(`${tests}/module.test.ts`)),
    "manifest-round-trip": probes(testFile(`${tests}/module.test.ts`), testFile("tests/shell/boot.test.ts")),
    /* The author replaces this with a manual result once the game renders offline from cache. */
    "offline-smoke": probes(),
    "byte-budget": budgetStep(gameId),
    /* The author replaces this with a manual result from MANUAL-CHECKS.md for this game. */
    "manual-mobile-check": probes(),
  };
}

/**
 * What each gate step means per live game. HANDOFF section 5 is the map this
 * was written from; a step with no evidence for a game is a defect to fix, not
 * a row to leave out, and planFor refuses a game that has no plan.
 */
export const GAME_PLANS: Readonly<Record<string, GamePlan>> = {
  "poker-grid": {
    ...suiteSteps(),
    "generation-pipeline": probes(testFile("tests/tools/poker-grid-pipeline.test.ts")),
    "independent-verification": probes(npm("poker-grid:verify")),
    "difficulty-calibration": probes(
      file("data/poker-grid/calibration.json"),
      testFile("tests/games/poker-grid/difficulty.test.ts"),
    ),
    "yearly-horizon": probes(npm("poker-grid:verify"), {
      kind: "horizon",
      key: "horizon:poker-grid",
      path: "data/poker-grid/manifest.index.json",
    }),
    /* assertNoRepeatedBoard, added to the verifier in this phase. */
    "duplicate-check": probes(npm("poker-grid:verify")),
    "share-leak-check": probes(testFile("tests/games/poker-grid/telemetry.test.ts")),
    "accessibility-contract": probes(
      testFile("tests/games/poker-grid/render.test.ts"),
      testFile("tests/ui/a11y.test.ts"),
    ),
    "state-round-trip": probes(testFile("tests/games/poker-grid/module.test.ts")),
    "manifest-round-trip": probes(
      testFile("tests/games/poker-grid/manifest-codec.test.ts"),
      testFile("tests/shell/boot.test.ts"),
    ),
    ...tailSteps("poker-grid"),
  },
  cipher: {
    ...suiteSteps(),
    "generation-pipeline": probes(testFile("tests/tools/cipher-pipeline.test.ts")),
    "independent-verification": probes(npm("cipher:verify")),
    "difficulty-calibration": probes(
      file("data/cipher/study.json"),
      testFile("tests/games/cipher/difficulty.test.ts"),
    ),
    "yearly-horizon": probes(npm("cipher:verify"), {
      kind: "horizon",
      key: "horizon:cipher",
      path: "data/cipher/manifest.index.json",
    }),
    /* CIPHER generation decision 5, enforced in cipher-verify.ts. */
    "duplicate-check": probes(npm("cipher:verify")),
    "share-leak-check": probes(testFile("tests/games/cipher/telemetry.test.ts")),
    "accessibility-contract": probes(
      testFile("tests/games/cipher/render.test.ts"),
      testFile("tests/ui/a11y.test.ts"),
    ),
    "state-round-trip": probes(testFile("tests/games/cipher/module.test.ts")),
    "manifest-round-trip": probes(
      testFile("tests/games/cipher/manifest-codec.test.ts"),
      testFile("tests/shell/boot.test.ts"),
    ),
    ...tailSteps("cipher"),
  },
  vector: {
    ...suiteSteps(),
    "generation-pipeline": probes(testFile("tests/games/vector/generator.test.ts")),
    "independent-verification": probes(npm("vector:verify")),
    "difficulty-calibration": probes(
      file("data/vector/study.json"),
      testFile("tests/games/vector/generator.test.ts"),
    ),
    "yearly-horizon": probes(npm("vector:verify"), {
      kind: "horizon",
      key: "horizon:vector",
      path: "data/vector/manifest.index.json",
    }),
    /* Step 7 of vector-verify.ts. */
    "duplicate-check": probes(npm("vector:verify")),
    "share-leak-check": probes(testFile("tests/games/vector/telemetry.test.ts")),
    "accessibility-contract": probes(
      testFile("tests/games/vector/render.test.ts"),
      testFile("tests/ui/a11y.test.ts"),
    ),
    "state-round-trip": probes(testFile("tests/games/vector/module.test.ts")),
    /* VECTOR's codec round trip lives in its module test. */
    "manifest-round-trip": probes(
      testFile("tests/games/vector/module.test.ts"),
      testFile("tests/shell/boot.test.ts"),
    ),
    ...tailSteps("vector"),
  },
  "rotate-lock": {
    ...newGamePlan("rotate-lock"),
    /* ROTATE-LOCK.md 15: the committed study and the test that recomputes its head. */
    "difficulty-calibration": probes(
      file("data/rotate-lock/study.json"),
      testFile("tests/games/rotate-lock/generator.test.ts"),
    ),
    /* ROTATE-LOCK.md 11 and 12: the generator screens every day, the verifier
       reruns both checkers on every committed day, and the generator test holds
       each checker to a positive and a negative control. */
    "decomposition-check": probes(npm("rotate-lock:verify"), testFile("tests/games/rotate-lock/generator.test.ts")),
    "symmetry-check": probes(npm("rotate-lock:verify"), testFile("tests/games/rotate-lock/generator.test.ts")),
    "share-leak-check": probes(testFile("tests/games/rotate-lock/telemetry.test.ts")),
    /* Recorded in charter Phase 13 against a release shaped build. */
    "offline-smoke": {
      kind: "manual",
      date: "2026-09-17",
      evidence:
        "Headless Chromium at 360 by 740 against vite preview of a release build, engine-v2, service worker controlling: " +
        "hub, ROTATE LOCK twice (practice board, then day 256 from the manifest), two moves played, VECTOR, hub; context offline; " +
        "hub and ROTATE LOCK rendered from cache with 36 cells, 7 pieces and the two moves restored, no console error, no horizontal scroll. " +
        "The build admitted rotate-lock by a throwaway patch in a copy of the tree, because a planned game cannot enter a release build.",
    },
    /* manual-mobile-check stays the stub's empty list, which the gate refuses,
       until the owner runs MANUAL-CHECKS.md for ROTATE LOCK on devices. No
       exemption covers a new game and none is added. */
  },
  "difference-relay": {
    ...newGamePlan("difference-relay"),
    /* DIFFERENCE-RELAY.md 15: the committed study and the test that reads its edges. */
    "difficulty-calibration": probes(
      file("data/difference-relay/study.json"),
      testFile("tests/games/difference-relay/generator.test.ts"),
    ),
    /* DIFFERENCE-RELAY.md 11 and 12: the generator screens every day, the
       verifier reruns decomposition and symmetry on every committed day, and the
       generator test holds each to a control. */
    "decomposition-check": probes(npm("difference-relay:verify"), testFile("tests/games/difference-relay/generator.test.ts")),
    "symmetry-check": probes(npm("difference-relay:verify"), testFile("tests/games/difference-relay/generator.test.ts")),
    /* offline-smoke and manual-mobile-check stay the stub's empty lists, which the
       gate refuses, until the owner runs them on devices. No exemption covers a
       new game and none is added, so difference-relay stays planned. */
  },
  /* NEW_GAME_INSERTION: GAME_PLANS */
};

/** The games the gate certifies: every live registry row. */
export function liveGameIds(): string[] {
  return SUITE_GAMES.filter((game) => game.status === "live").map((game) => game.id);
}

export function planFor(gameId: string, plans: Readonly<Record<string, GamePlan>> = GAME_PLANS): GamePlan {
  const plan = plans[gameId];
  if (plan === undefined) throw new Error(`${gameId} is live and has no certification plan`);
  for (const step of GATE_STEPS) {
    if (plan[step] === undefined) throw new Error(`${gameId} plan is missing ${step}`);
  }
  return plan;
}

/** Every probe the plans name, once each, in first appearance order. The same
 *  key must always mean the same probe. */
export function uniqueProbes(plans: readonly GamePlan[]): Probe[] {
  const byKey = new Map<string, Probe>();
  for (const plan of plans) {
    for (const step of GATE_STEPS) {
      const stepPlan = plan[step];
      if (stepPlan.kind !== "probes") continue;
      for (const probe of stepPlan.probes) {
        const known = byKey.get(probe.key);
        if (known !== undefined && canonicalJson(known) !== canonicalJson(probe)) {
          throw new Error(`probe key ${probe.key} names two different probes`);
        }
        byKey.set(probe.key, probe);
      }
    }
  }
  return [...byKey.values()];
}

/** The npm scripts a plan needs, which is exactly what CI must run before
 *  `certify --from-ci` may trust them. */
export function npmScripts(probeList: readonly Probe[]): string[] {
  return probeList.flatMap((probe) => (probe.kind === "npm" ? [probe.script] : []));
}

/* ------------------------------------------------------------------------ */
/* Probe evaluation that needs no process                                    */
/* ------------------------------------------------------------------------ */

/** Days the index declares, counted from puzzle 1, in the one shape
 *  shell/boot.ts reads. VECTOR once wrote `{ first, last }`, which the shell
 *  refused, so that shape is refused here too. */
export function horizonDays(index: unknown): number | null {
  if (index === null || typeof index !== "object") return null;
  const horizon = (index as { horizon?: unknown }).horizon;
  return typeof horizon === "number" && Number.isInteger(horizon) ? horizon : null;
}

export interface Filesystem {
  exists(path: string): boolean;
  read(path: string): string;
}

/**
 * Resolves every probe that is not an npm script, given the npm results. `dist`
 * is the directory the budget read.
 */
export function resolveDerivedProbes(
  probeList: readonly Probe[],
  npmResults: ReadonlyMap<string, ProbeResult>,
  fs: Filesystem,
  dist: string,
): Map<string, ProbeResult> {
  const results = new Map(npmResults);
  const dependency = (key: string): ProbeResult =>
    results.get(key) ?? { ok: false, detail: `${key} did not run` };

  for (const probe of probeList) {
    switch (probe.kind) {
      case "npm":
        if (!results.has(probe.key)) results.set(probe.key, { ok: false, detail: "did not run" });
        break;
      case "test-file": {
        const suite = dependency(TEST_SUITE_KEY);
        if (!fs.exists(probe.path)) results.set(probe.key, { ok: false, detail: `${probe.path} does not exist` });
        else if (!suite.ok) results.set(probe.key, { ok: false, detail: `the test suite failed` });
        else results.set(probe.key, { ok: true });
        break;
      }
      case "file":
        results.set(
          probe.key,
          fs.exists(probe.path) ? { ok: true } : { ok: false, detail: `${probe.path} does not exist` },
        );
        break;
      case "horizon": {
        if (!fs.exists(probe.path)) {
          results.set(probe.key, { ok: false, detail: `${probe.path} does not exist` });
          break;
        }
        let days: number | null = null;
        try {
          days = horizonDays(JSON.parse(fs.read(probe.path)) as unknown);
        } catch {
          days = null;
        }
        results.set(
          probe.key,
          days !== null && days >= HORIZON_DAYS
            ? { ok: true }
            : { ok: false, detail: `${probe.path} declares ${String(days)} days, needs ${String(HORIZON_DAYS)}` },
        );
        break;
      }
      case "page": {
        const budget = dependency(BUDGET_KEY);
        const page = `${dist}/${probe.gameId}/index.html`;
        if (!budget.ok) results.set(probe.key, { ok: false, detail: "the byte budget failed" });
        else if (!fs.exists(page)) results.set(probe.key, { ok: false, detail: `${page} was not in the budgeted build` });
        else results.set(probe.key, { ok: true });
        break;
      }
    }
  }
  return results;
}

/* ------------------------------------------------------------------------ */
/* Records                                                                   */
/* ------------------------------------------------------------------------ */

/** The checks a plan yields from a set of probe results. A probe with no result
 *  makes its step a skip, which the gate refuses. */
export function checksFrom(plan: GamePlan, results: ReadonlyMap<string, ProbeResult>): Record<GateStep, GateCheck> {
  const checks = {} as Record<GateStep, GateCheck>;
  for (const step of GATE_STEPS) {
    const stepPlan = plan[step];
    switch (stepPlan.kind) {
      case "n/a":
        checks[step] = { outcome: "n/a", reason: stepPlan.reason };
        break;
      case "pending":
        checks[step] = { outcome: "pending", exemption: stepPlan.exemption };
        break;
      case "manual":
        checks[step] = { outcome: "pass", evidence: `manual ${stepPlan.date}: ${stepPlan.evidence}` };
        break;
      case "probes": {
        if (stepPlan.probes.length === 0) {
          checks[step] = { outcome: "skip" };
          break;
        }
        const outcomes = stepPlan.probes.map((probe) => [probe.key, results.get(probe.key)] as const);
        if (outcomes.some(([, result]) => result === undefined)) {
          checks[step] = { outcome: "skip" };
          break;
        }
        const failures = outcomes.flatMap(([key, result]) =>
          result !== undefined && !result.ok ? [`${key}: ${result.detail}`] : [],
        );
        checks[step] =
          failures.length === 0
            ? { outcome: "pass", evidence: outcomes.map(([key]) => key).join(", ") }
            : { outcome: "fail", detail: failures.join("; ") };
        break;
      }
    }
  }
  return checks;
}

/** Key order is fixed by canonical JSON, so the hash depends on content only. */
export function outcomesHash(gameId: string, checks: Readonly<Record<GateStep, GateCheck>>): string {
  return createHash("sha256").update(canonicalJson({ gameId, checks })).digest("hex");
}

export function buildRecord(
  gameId: string,
  checks: Readonly<Record<GateStep, GateCheck>>,
  commit: string,
): CertificationRecord {
  return {
    schema: CERTIFICATION_SCHEMA,
    gameId,
    certifiedCommit: commit,
    outcomesHash: outcomesHash(gameId, checks),
    checks,
  };
}

/** Steps in gate order and a trailing newline, so a diff reads like the gate. */
export function serializeRecord(record: CertificationRecord): string {
  const checks: Record<string, GateCheck> = {};
  for (const step of GATE_STEPS) checks[step] = record.checks[step];
  return `${JSON.stringify({ ...record, checks }, null, 2)}\n`;
}

export function recordPath(gameId: string): string {
  return `data/${gameId}/certification.json`;
}

/**
 * Reads a committed record without trusting it. Returns null for anything that
 * is not structurally a record, including a hash that does not match its own
 * checks, so a hand edit to an outcome is refused rather than believed.
 */
export function parseRecord(text: string, gameId: string): CertificationRecord | null {
  let value: unknown;
  try {
    value = JSON.parse(text) as unknown;
  } catch {
    return null;
  }
  if (value === null || typeof value !== "object") return null;
  const record = value as Partial<CertificationRecord>;
  if (record.schema !== CERTIFICATION_SCHEMA) return null;
  if (record.gameId !== gameId) return null;
  if (typeof record.certifiedCommit !== "string" || typeof record.outcomesHash !== "string") return null;
  if (record.checks === null || typeof record.checks !== "object") return null;
  for (const step of GATE_STEPS) {
    const check = (record.checks as Record<string, unknown>)[step];
    if (check === null || typeof check !== "object") return null;
  }
  const checks = record.checks as Record<GateStep, GateCheck>;
  if (outcomesHash(gameId, checks) !== record.outcomesHash) return null;
  return record as CertificationRecord;
}

/** The record to commit: the committed one when outcomes are unchanged, so an
 *  unchanged gate never rewrites the file. */
export function reconcile(
  committed: CertificationRecord | null,
  fresh: CertificationRecord,
): { readonly record: CertificationRecord; readonly changed: boolean } {
  if (committed !== null && committed.outcomesHash === fresh.outcomesHash) {
    return { record: committed, changed: false };
  }
  return { record: fresh, changed: true };
}

/** Local calendar date, the same notion of today the rest of the suite uses. */
export function localDate(now: Date = new Date()): string {
  const pad = (value: number): string => String(value).padStart(2, "0");
  return `${String(now.getFullYear())}-${pad(now.getMonth() + 1)}-${pad(now.getDate())}`;
}

/** What the build asks: may this game ship today. A missing or unreadable
 *  record is a no. */
export function productionSafeFromDisk(gameId: string, onDate: string, fs: Filesystem): boolean {
  const path = recordPath(gameId);
  if (!fs.exists(path)) return false;
  const record = parseRecord(fs.read(path), gameId);
  return record !== null && refusalsFor(record, onDate).length === 0;
}

export const nodeFilesystem: Filesystem = {
  exists: (path) => existsSync(path),
  read: (path) => readFileSync(path, "utf8"),
};

/** Set by the certify runner so a certification build contains every live game
 *  whatever its committed record says, in a directory nothing deploys. */
export const CERTIFY_BUILD_ENV = "DAILYKIT_CERTIFY_BUILD";
export const CERTIFY_DIST = "dist-certify";

/**
 * The npm CLI that launched this process. npm sets npm_execpath for every
 * script it runs, so certify invokes npm as Node plus that file and needs no
 * shell on any platform. Windows cannot spawn `npm` without one, and a shell
 * spawn with an argument list is deprecated there. Started any other way,
 * certify stops and says so rather than guessing where npm is.
 */
export function npmCliPath(env: Readonly<Record<string, string | undefined>>): string {
  const path = env["npm_execpath"];
  if (path === undefined || path.trim() === "") {
    throw new Error("certify runs npm scripts through the npm that started it; run it as npm run certify");
  }
  return path;
}

/** Node's arguments for one probe script. `npmCli` is null only under --from-ci,
 *  which runs no script. */
export function npmArguments(npmCli: string | null, script: string, extra: readonly string[]): string[] {
  if (npmCli === null) throw new Error(`--from-ci runs no npm script, yet ${script} was asked for`);
  return [npmCli, "run", script, ...extra];
}

/* ------------------------------------------------------------------------ */
/* Runner                                                                    */
/* ------------------------------------------------------------------------ */

async function run(): Promise<void> {
  const { spawnSync } = await import("node:child_process");
  const { writeFileSync } = await import("node:fs");

  const args = new Set(process.argv.slice(2));
  const check = args.has("--check");
  const fromCi = args.has("--from-ci");
  if (fromCi && process.env["CI"] !== "true") {
    throw new Error("--from-ci trusts steps this CI job already ran and is refused outside CI");
  }

  const npmCli = fromCi ? null : npmCliPath(process.env);
  const games = liveGameIds();
  const plans = games.map((gameId) => planFor(gameId));
  const probeList = uniqueProbes(plans);
  const dist = fromCi ? "dist" : CERTIFY_DIST;

  const npmResults = new Map<string, ProbeResult>();
  for (const probe of probeList) {
    if (probe.kind !== "npm") continue;
    if (fromCi) {
      /* Trusted because GitHub Actions stops the job at the first failing
         step, and ci.yml runs every one of these before this step. The
         certify test asserts ci.yml names each script. */
      npmResults.set(probe.key, { ok: true });
      continue;
    }
    const extra = probe.script === "budget" ? ["--", CERTIFY_DIST] : [];
    const env = probe.script === "build" ? { ...process.env, [CERTIFY_BUILD_ENV]: "1" } : process.env;
    process.stdout.write(`certify: npm run ${probe.script}\n`);
    const result = spawnSync(process.execPath, npmArguments(npmCli, probe.script, extra), {
      stdio: "inherit",
      env,
    });
    npmResults.set(
      probe.key,
      result.status === 0 ? { ok: true } : { ok: false, detail: `exit ${String(result.status)}` },
    );
  }

  const results = resolveDerivedProbes(probeList, npmResults, nodeFilesystem, dist);
  const commitRun = spawnSync("git", ["rev-parse", "--short=12", "HEAD"], { encoding: "utf8" });
  const commit = commitRun.status === 0 ? commitRun.stdout.trim() : "unknown";
  const today = localDate();

  let failed = false;
  for (const [position, gameId] of games.entries()) {
    const plan = plans[position] as GamePlan;
    const fresh = buildRecord(gameId, checksFrom(plan, results), commit);
    const path = recordPath(gameId);
    const committed = existsSync(path) ? parseRecord(readFileSync(path, "utf8"), gameId) : null;
    const { record, changed } = reconcile(committed, fresh);

    /* A check judges what is committed, because that is what the build reads.
       A write judges what it is about to commit. */
    const judged = check ? committed : record;
    const refusals =
      judged === null
        ? [{ step: "record", why: `${path} is missing, unreadable, or hand edited` }]
        : refusalsFor(judged, today);
    for (const refusal of refusals) process.stderr.write(`${gameId} ${refusal.step}: ${refusal.why}\n`);
    if (refusals.length > 0) failed = true;

    if (changed && check) {
      process.stderr.write(`${gameId}: ${path} is stale; run npm run certify and commit it\n`);
      failed = true;
    } else if (changed) {
      writeFileSync(path, serializeRecord(record));
      process.stdout.write(`${gameId}: wrote ${path}\n`);
    }
    process.stdout.write(`${gameId}: ${refusals.length === 0 ? "production safe" : "NOT production safe"}\n`);
  }
  if (failed) process.exitCode = 1;
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/certify.ts")) {
  await run();
}
