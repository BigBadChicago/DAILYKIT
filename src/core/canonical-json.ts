/**
 * Layer 0. Stable JSON. Puzzle identity and manifest certification must not
 * depend on JavaScript's object key order, so keys are sorted at every depth and
 * equal values stringify to byte identical output. ARCHITECTURE2 section 30.
 */

export function canonicalize(value: unknown): unknown {
  if (value === null || typeof value !== "object") return value;
  if (Array.isArray(value)) return value.map(canonicalize);
  const record = value as Record<string, unknown>;
  const out: Record<string, unknown> = {};
  for (const key of Object.keys(record).sort()) out[key] = canonicalize(record[key]);
  return out;
}

export function canonicalJson(value: unknown): string {
  return JSON.stringify(canonicalize(value));
}
