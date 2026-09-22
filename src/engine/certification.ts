/**
 * Layer 1. Shared certification types for the generator, the verifier and the
 * gate. ARCHITECTURE2 sections 11, 25 and 45. This file solves no game; it names
 * what a verification contains, what the gate is, and the one rule that turns a
 * game's committed record into productionSafe.
 */

/** An exact search proves the claim; a bounded one only reports best known, and
 *  the UI must never show an optimum for a bounded result. Section 11.4. */
export type SearchKind = "EXACT" | "BEST_KNOWN";

export interface VerificationResult {
  readonly structuralValid: boolean;
  readonly solvable: boolean;
  readonly unique: boolean;
  readonly deductionFair: boolean;
  readonly difficulty: number;
  readonly stateSpaceVisited: number;
  readonly searchKind: SearchKind;
  readonly rejectionReasons: readonly string[];
}

/** Section 25, the per puzzle record a manifest entry may carry. Distinct from
 *  the per game gate record below: one describes a day, the other a release. */
export interface PuzzleCertification {
  readonly verification: VerificationResult;
}

/** The certification gate, section 45, in the order the section lists it. */
export const GATE_STEPS = [
  "typecheck",
  "tests",
  "dependency-check",
  "determinism-vectors",
  "generation-pipeline",
  "independent-verification",
  "difficulty-calibration",
  "yearly-horizon",
  "duplicate-check",
  "decomposition-check",
  "symmetry-check",
  "share-leak-check",
  "glyph-check",
  "accessibility-contract",
  "state-round-trip",
  "manifest-round-trip",
  "offline-smoke",
  "byte-budget",
  "manual-mobile-check",
] as const;

export type GateStep = (typeof GATE_STEPS)[number];

/**
 * One step's outcome. `skip` exists so a runner can say it did not run a step,
 * and it always refuses. `n/a` must say why in words a reader can check. Only
 * `pending` defers a step, and only under an exemption named in GATE_EXEMPTIONS.
 */
export type GateCheck =
  | { readonly outcome: "pass"; readonly evidence?: string }
  | { readonly outcome: "fail"; readonly detail: string }
  | { readonly outcome: "skip" }
  | { readonly outcome: "n/a"; readonly reason: string }
  | { readonly outcome: "pending"; readonly exemption: string };

export type GateOutcome = GateCheck["outcome"];

/**
 * A dated, named permission to ship with a step still pending. It lists the
 * steps and the games it covers so it cannot quietly extend to a new game, and
 * it expires so it cannot quietly become permanent. Adding one is an edit to
 * this file, which is engine source and therefore reviewed like engine source.
 */
export interface GateExemption {
  readonly id: string;
  readonly steps: readonly GateStep[];
  readonly games: readonly string[];
  /** Local calendar dates, YYYY-MM-DD. `expires` is the last day it holds. */
  readonly issued: string;
  readonly expires: string;
  readonly reason: string;
}

export const GATE_EXEMPTIONS: readonly GateExemption[] = [
  {
    id: "manual-mobile-2026-09-16",
    steps: ["manual-mobile-check"],
    games: ["poker-grid", "cipher", "vector"],
    issued: "2026-09-16",
    expires: "2026-12-15",
    reason:
      "The three live games shipped before the gate existed and MANUAL-CHECKS.md has never been run. " +
      "They stay live until it is run once and its result recorded, and no longer than this date.",
  },
  {
    id: "manual-mobile-2026-09-22",
    steps: ["manual-mobile-check"],
    games: ["rotate-lock", "difference-relay", "word-ladder", "pangram", "five-letters"],
    issued: "2026-09-22",
    expires: "2026-12-21",
    reason:
      "The owner directed these five built games live in chat on 2026-09-22, ahead of MANUAL-CHECKS.md, " +
      "trading the device pass for speed. They stay live until it is run once per game and recorded, " +
      "and no longer than this date.",
  },
];

/** Bumped when the record's shape changes, so a stale committed file is refused
 *  rather than misread. */
export const CERTIFICATION_SCHEMA = 1;

/** The committed data/<game>/certification.json. */
export interface CertificationRecord {
  readonly schema: number;
  readonly gameId: string;
  /** The commit the outcomes were last produced at. Not a timestamp, so an
   *  unchanged gate leaves the committed file unchanged. */
  readonly certifiedCommit: string;
  /** sha256 over the canonical JSON of gameId and checks. */
  readonly outcomesHash: string;
  readonly checks: Readonly<Record<GateStep, GateCheck>>;
}

export type Refusal = { readonly step: GateStep | "record"; readonly why: string };

const DATE = /^\d{4}-\d{2}-\d{2}$/;

/** Every reason a record is not production safe on a given local date. Empty
 *  means safe. Pure, so the build, the certify tool and the tests share it. */
export function refusalsFor(
  record: CertificationRecord,
  onDate: string,
  exemptions: readonly GateExemption[] = GATE_EXEMPTIONS,
): Refusal[] {
  if (!DATE.test(onDate)) throw new Error(`onDate must be YYYY-MM-DD, got ${onDate}`);
  if (record.schema !== CERTIFICATION_SCHEMA) {
    return [{ step: "record", why: `schema ${String(record.schema)} is not ${String(CERTIFICATION_SCHEMA)}` }];
  }
  const refusals: Refusal[] = [];
  for (const step of GATE_STEPS) {
    const check = record.checks[step] as GateCheck | undefined;
    if (check === undefined) {
      refusals.push({ step, why: "missing" });
      continue;
    }
    switch (check.outcome) {
      case "pass":
        break;
      case "fail":
        refusals.push({ step, why: `failed: ${check.detail}` });
        break;
      case "skip":
        refusals.push({ step, why: "skipped, and a skip is not a pass" });
        break;
      case "n/a":
        if (typeof check.reason !== "string" || check.reason.trim() === "") {
          refusals.push({ step, why: "n/a without a written reason" });
        }
        break;
      case "pending": {
        const exemption = exemptions.find((candidate) => candidate.id === check.exemption);
        if (exemption === undefined) {
          refusals.push({ step, why: `pending under unknown exemption ${check.exemption}` });
        } else if (!exemption.steps.includes(step)) {
          refusals.push({ step, why: `exemption ${exemption.id} does not cover this step` });
        } else if (!exemption.games.includes(record.gameId)) {
          refusals.push({ step, why: `exemption ${exemption.id} does not cover ${record.gameId}` });
        } else if (onDate < exemption.issued || onDate > exemption.expires) {
          refusals.push({ step, why: `exemption ${exemption.id} holds ${exemption.issued} to ${exemption.expires}` });
        }
        break;
      }
      default:
        refusals.push({ step, why: "unknown outcome" });
    }
  }
  return refusals;
}

/** True only when every step passes, carries a reasoned n/a, or is pending
 *  under a live exemption that names this step and this game. */
export function isProductionSafe(
  record: CertificationRecord,
  onDate: string,
  exemptions: readonly GateExemption[] = GATE_EXEMPTIONS,
): boolean {
  return refusalsFor(record, onDate, exemptions).length === 0;
}
