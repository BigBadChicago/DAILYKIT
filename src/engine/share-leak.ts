/**
 * Layer 1. The five share leak checks. ARCHITECTURE2 section 16. A game ships a
 * matrix of good, average and bad artifacts through this harness, and a failure
 * blocks certification.
 *
 * Two checks are structural and run here for every game: the title must not
 * contain the day's answer, and the artifact must carry a behavioral
 * fingerprint. The other three, position, ordering and shape, are correlations
 * against the hidden answer that only the game can compute, so a game supplies
 * them as probes. A probe returns true when it detects a leak.
 */

import type { ArtifactModel } from "./telemetry.js";

export interface LeakSample {
  readonly artifact: ArtifactModel;
  /** A plain rendering of the day's answer, used by the built in title check. */
  readonly answerKey: string;
}

export interface LeakProbes {
  readonly positionLeak?: (sample: LeakSample) => boolean;
  readonly answerPropertyLeak?: (sample: LeakSample) => boolean;
  readonly orderingLeak?: (sample: LeakSample) => boolean;
  readonly shapeLeak?: (sample: LeakSample) => boolean;
}

export interface LeakReport {
  readonly ok: boolean;
  readonly failures: readonly string[];
}

const PROBE_NAMES = ["positionLeak", "answerPropertyLeak", "orderingLeak", "shapeLeak"] as const;

export function runShareLeakChecks(samples: readonly LeakSample[], probes: LeakProbes = {}): LeakReport {
  const failures: string[] = [];
  for (let i = 0; i < samples.length; i += 1) {
    const sample = samples[i] as LeakSample;
    const where = `sample ${String(i)}`;
    const key = sample.answerKey.trim();
    if (key.length > 0 && sample.artifact.title.toLowerCase().includes(key.toLowerCase())) {
      failures.push(`${where}: title leak, the answer appears in the title`);
    }
    if (sample.artifact.fingerprint.points.length === 0) {
      failures.push(`${where}: no fingerprint, the artifact is a restyled score`);
    }
    for (const name of PROBE_NAMES) {
      const probe = probes[name];
      if (probe && probe(sample)) failures.push(`${where}: ${name}`);
    }
  }
  return { ok: failures.length === 0, failures };
}
