/**
 * Layer 1. Shared certification types for the generator and verifier.
 * ARCHITECTURE2 sections 11, 25 and 45. This file solves no game; it only names
 * what a verification and a certification record contain, and what the gate is.
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

/** The certification gate. A game is productionSafe only when every step passes.
 *  Section 45. The allow list is a consequence of certification, not of a
 *  directory existing. */
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
export type GateOutcome = "pass" | "fail" | "skip";

export interface CertificationRecord {
  readonly checks: Readonly<Record<GateStep, GateOutcome>>;
  readonly verification: VerificationResult;
  /** ISO timestamp the record was produced. */
  readonly generatedAt: string;
}

/** True only when every gate step passed. A skip is not a pass. */
export function isProductionSafe(record: CertificationRecord): boolean {
  return GATE_STEPS.every((step) => record.checks[step] === "pass");
}
