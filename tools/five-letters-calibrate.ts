/**
 * The FIVE LETTERS calibration study. FIVE-LETTERS.md 15 and 30.
 *
 *   npx tsx tools/five-letters-calibrate.ts --out data/five-letters
 *
 * Exhaustive rather than sampled: every answer in the pool is measured, so the
 * study has no seeds and reruns to the same bytes. It records the ideal opening,
 * the septile band edges of the primary measure (candidates left after the
 * opening, over the accepted list) and of the named fallback (answers still in
 * the pool after the opening), the witness solver's guess histogram, and the
 * share leak measurement that chose sorted rows over positional ones.
 */

import { writeFileSync } from "node:fs";
import { argv, stdout } from "node:process";

import { bandOfWith, septiles } from "../src/games/five-letters/bands.js";
import { countsOf, marksOfPattern, PATTERN_COUNT } from "../src/games/five-letters/feedback.js";
import { candidatesAfter, idealOpening, Witness, type Search } from "../src/games/five-letters/solver.js";

export interface Study {
  readonly accepted: number;
  readonly answers: number;
  readonly opening: { readonly word: string; readonly expected: number };
  readonly bandEdges: readonly number[];
  readonly distinct: number;
  readonly perBand: readonly number[];
  readonly fallback: { readonly measure: string; readonly bandEdges: readonly number[]; readonly distinct: number; readonly perBand: readonly number[] };
  readonly witness: { readonly histogram: readonly number[]; readonly worst: number };
  readonly shareLeak: {
    readonly positional: { readonly median: number; readonly min: number };
    readonly sorted: { readonly median: number; readonly min: number };
  };
}

const median = (values: readonly number[]): number => [...values].sort((a, b) => a - b)[values.length >> 1] as number;

function perBand(edges: readonly number[], values: readonly number[]): number[] {
  const counts = new Array<number>(edges.length + 1).fill(0);
  for (const value of values) {
    const band = bandOfWith(edges, value);
    counts[band] = (counts[band] as number) + 1;
  }
  return counts;
}

export function computeStudy(search: Search, answers: readonly string[]): Study {
  const opening = idealOpening(search);
  const n = search.words.length;
  const g = search.index.get(opening.word) as number;
  const primary = answers.map((answer) => candidatesAfter(search, opening.word, answer));
  const answerIdx = answers.map((answer) => search.index.get(answer) as number);
  const fallback = answerIdx.map((a) => {
    const target = search.patterns[g * n + a];
    return answerIdx.filter((c) => search.patterns[g * n + c] === target).length;
  });
  const bandEdges = septiles(primary);
  const fallbackEdges = septiles(fallback);

  const witness = new Witness(search, opening.word);
  const histogram = [0, 0, 0, 0, 0, 0, 0, 0];
  const paths = answers.map((answer) => witness.path(answer));
  for (const path of paths) histogram[Math.min(path.length, 7)] = (histogram[Math.min(path.length, 7)] as number) + 1;

  /* For each answer, which patterns and which sorted count pairs any accepted
     guess can earn against it. A shared block leaves possible every answer that
     can earn each of its rows. */
  const sortedKey = (pattern: number): number => {
    const counts = countsOf(marksOfPattern(pattern));
    return counts.right * 6 + counts.present;
  };
  const positional = answerIdx.map((a) => {
    const reach = new Uint8Array(PATTERN_COUNT);
    for (let guess = 0; guess < n; guess += 1) reach[search.patterns[guess * n + a] as number] = 1;
    return reach;
  });
  const sorted = positional.map((reach) => {
    const out = new Uint8Array(36);
    for (let p = 0; p < PATTERN_COUNT; p += 1) if (reach[p] === 1) out[sortedKey(p)] = 1;
    return out;
  });
  const possiblePositional: number[] = [];
  const possibleSorted: number[] = [];
  answerIdx.forEach((a, i) => {
    const rows = (paths[i] as string[]).map((word) => search.patterns[(search.index.get(word) as number) * n + a] as number);
    let pos = 0;
    let srt = 0;
    for (let k = 0; k < answerIdx.length; k += 1) {
      if (rows.every((p) => positional[k]?.[p] === 1)) pos += 1;
      if (rows.every((p) => sorted[k]?.[sortedKey(p)] === 1)) srt += 1;
    }
    possiblePositional.push(pos);
    possibleSorted.push(srt);
  });

  return {
    accepted: n,
    answers: answers.length,
    opening: { word: opening.word, expected: Math.round(opening.expected * 100) / 100 },
    bandEdges,
    distinct: new Set(primary).size,
    perBand: perBand(bandEdges, primary),
    fallback: {
      measure: "answers still in the pool after the opening",
      bandEdges: fallbackEdges,
      distinct: new Set(fallback).size,
      perBand: perBand(fallbackEdges, fallback),
    },
    witness: { histogram, worst: Math.max(...paths.map((path) => path.length)) },
    shareLeak: {
      positional: { median: median(possiblePositional), min: Math.min(...possiblePositional) },
      sorted: { median: median(possibleSorted), min: Math.min(...possibleSorted) },
    },
  };
}

async function main(): Promise<void> {
  const at = argv.indexOf("--out");
  const out = at >= 0 ? (argv[at + 1] as string) : "data/five-letters";
  const { buildContext, loadList, ANSWERS_PATH } = await import("./five-letters-generate.js");
  const context = buildContext();
  const study = computeStudy(context.search, loadList(ANSWERS_PATH));
  writeFileSync(`${out}/study.json`, `${JSON.stringify(study, null, 2)}\n`);
  stdout.write(`${JSON.stringify(study)}\n`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/five-letters-calibrate.ts")) void main();
