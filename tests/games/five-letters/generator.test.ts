import { readFileSync } from "node:fs";

import { beforeAll, describe, expect, it } from "vitest";

import { computeStudy } from "../../../tools/five-letters-calibrate.js";
import { buildContext, chunkRanges, generateHorizon, loadList } from "../../../tools/five-letters-generate.js";
import { wordsSource } from "../../../tools/five-letters-words.js";
import { BAND_EDGES, WEEKDAY_BAND, bandForPuzzle, bandOf, septiles } from "../../../src/games/five-letters/bands.js";
import { OPENING, candidatesAfterOpening } from "../../../src/games/five-letters/difficulty.js";
import { decodeAnswer } from "../../../src/games/five-letters/five-letters-codec.js";
import { emptyTally, generateForPuzzle, leversOf, type GenContext } from "../../../src/games/five-letters/generator.js";
import { candidatesAfter } from "../../../src/games/five-letters/solver.js";
import { ACCEPTED_WORDS } from "../../../src/games/five-letters/words.js";

const ACCEPTED = loadList("data/five-letters/accepted.txt");
const ANSWERS = loadList("data/five-letters/answers.txt");
const DENY = loadList("data/word-lists/deny.txt");
const STUDY = JSON.parse(readFileSync("data/five-letters/study.json", "utf8")) as ReturnType<typeof computeStudy>;

function committedEntries(): Map<number, unknown> {
  const index = JSON.parse(readFileSync("data/five-letters/manifest.index.json", "utf8")) as {
    horizon: number;
    chunks: { from: number; to: number; url: string }[];
  };
  const out = new Map<number, unknown>();
  for (const chunk of index.chunks) {
    const body = JSON.parse(readFileSync(chunk.url.slice(1), "utf8")) as { entries: Record<string, unknown> };
    for (const [n, entry] of Object.entries(body.entries)) out.set(Number(n), entry);
  }
  return out;
}

let context: GenContext;
beforeAll(() => {
  context = buildContext();
}, 60_000);

describe("FIVE LETTERS word lists", () => {
  it("are sorted, distinct, five letters, and free of every denied word", () => {
    for (const words of [ACCEPTED, ANSWERS]) {
      expect(words.every((w) => /^[a-z]{5}$/.test(w))).toBe(true);
      expect([...words].sort()).toEqual(words);
      expect(new Set(words).size).toBe(words.length);
      for (const denied of DENY) expect(words).not.toContain(denied);
    }
    const accepted = new Set(ACCEPTED);
    expect(ANSWERS.every((w) => accepted.has(w))).toBe(true);
  });

  it("ships the accepted list in the page byte for byte as the tool writes it", () => {
    expect(ACCEPTED_WORDS).toEqual(ACCEPTED);
    expect(readFileSync("src/games/five-letters/words.ts", "utf8")).toBe(wordsSource(ACCEPTED));
  });
});

describe("FIVE LETTERS calibration", () => {
  it("keeps the band table and the opening equal to the committed study", () => {
    expect(BAND_EDGES).toEqual(STUDY.bandEdges);
    expect(OPENING).toBe(STUDY.opening.word);
    expect(WEEKDAY_BAND).toEqual([0, 1, 2, 3, 5, 6, 4]);
    expect(septiles([1, 2, 3, 4, 5, 6, 7])).toEqual([2, 3, 4, 5, 6, 7]);
  });

  it("reruns the exhaustive study to the same figures", () => {
    const study = computeStudy(context.search, ANSWERS);
    expect(study).toEqual(STUDY);
    expect(study.witness.worst).toBeLessThanOrEqual(6);
    expect(study.perBand.every((count) => count >= 53)).toBe(true);
    expect(study.fallback.perBand.every((count) => count > 0)).toBe(true);
    expect(study.shareLeak.sorted.min).toBeGreaterThan(study.shareLeak.positional.min);
  }, 120_000);

  it("the browser's difficulty matches the solver's", () => {
    for (const answer of ["heart", "table", "water", "green", ANSWERS[0] as string]) {
      expect(candidatesAfterOpening(answer, ACCEPTED_WORDS)).toBe(candidatesAfter(context.search, OPENING, answer));
    }
    expect(candidatesAfterOpening("heart", ACCEPTED_WORDS)).toBe(11);
  });
});

describe("FIVE LETTERS generator", () => {
  it("replays the head of the committed horizon byte for byte", () => {
    const committed = committedEntries();
    const replayed = generateHorizon(context, 1, 10);
    for (let n = 1; n <= 10; n += 1) expect(JSON.stringify(replayed.get(n))).toBe(JSON.stringify(committed.get(n)));
  });

  it("the horizon holds 365 distinct answers, each in its weekday band", () => {
    const committed = committedEntries();
    expect(committed.size).toBe(365);
    const seen = new Set<string>();
    for (const [n, raw] of committed) {
      const answer = decodeAnswer(n, (raw as { answer: string }).answer) as string;
      expect(seen.has(answer)).toBe(false);
      seen.add(answer);
      expect(bandOf(candidatesAfterOpening(answer, ACCEPTED_WORDS))).toBe(bandForPuzzle(n));
    }
  });

  it("witness paths end on the answer inside six guesses", () => {
    for (const answer of ANSWERS.slice(0, 200)) {
      const path = context.witness.path(answer);
      expect(path[0]).toBe(OPENING);
      expect(path.at(-1)).toBe(answer);
      expect(path.length).toBeLessThanOrEqual(6);
    }
  });

  it("rejects out of band and repeated draws and gives up at the ceiling", () => {
    const tally = emptyTally();
    /* HEART is band 0; puzzle 7 is a Sunday, band 4. */
    const heart = ANSWERS.indexOf("heart");
    expect(generateForPuzzle(context, 7, { intBelow: () => heart }, tally, new Set())).toBeNull();
    expect(tally.band).toBeGreaterThan(0);
    const again = emptyTally();
    expect(generateForPuzzle(context, 1, { intBelow: () => heart }, again, new Set(["heart"]))).toBeNull();
    expect(again.repeat).toBeGreaterThan(0);
    const day = generateForPuzzle(context, 1, { intBelow: () => heart }, emptyTally(), new Set());
    expect(day).toMatchObject({ answer: "heart", candidates: 11, attempt: 0, levers: ["distinct-letters"] });
    expect(leversOf("geese")).toEqual(["repeat-letter"]);
    expect(chunkRanges(1, 365)).toHaveLength(12);
  });
});
