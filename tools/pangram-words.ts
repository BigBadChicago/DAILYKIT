/**
 * Derives the PANGRAM word lists from SCOWL/ESDB and ENABLE. PANGRAM.md 12.
 *
 *   npx tsx tools/pangram-words.ts --scowl <path to scowl-pre.txt> --enable <path to enable1.txt>
 *
 * Offline only, HANDOFF section 7 item 8: neither CI nor the browser fetches or
 * runs this, because ESDB and ENABLE are not committed. It exists so the two
 * committed lists can be rebuilt byte for byte by anyone holding the same inputs
 * (ESDB commit 1e5b7d3, ENABLE md5 33f2b09e2d9dfb732fa16b5f05a5a8d1), which the
 * WORD LADDER build did not leave behind for its own list.
 *
 * The rule, in the order applied:
 *   1. every lowercase a to z headword and inflection in scowl-pre.txt, at the
 *      smallest size level any of its lines gives it
 *   2. American only: a line that carries spelling codes counts only when one
 *      of them is A; a line with none counts for every spelling
 *   3. never an entry tagged upper or abbr
 *   4. in ENABLE
 *   5. length four or more, no letter s, at most seven distinct letters, because
 *      no PANGRAM day can ever contain anything else
 *   6. minus data/word-lists/deny.txt
 * accepted.txt is size 50 and below, familiar.txt size 35 and below.
 */

import { readFileSync, writeFileSync } from "node:fs";
import { argv, exit, stdout } from "node:process";

export const ACCEPTED_LEVEL = 50;
export const FAMILIAR_LEVEL = 35;
export const DENY_PATH = "data/word-lists/deny.txt";

const LINE = /^((?:\d+\s*(?:\[[^\]]*\]\s*)*)+):\s*(.*)$/;
const SIZE = /(?<![\w[])(\d+)(?=\s*(?:\[|$|\s))/g;
const WORD = /^[a-z]+$/;
const CODE = /^[A-Z][A-Za-z]*$/;

function clean(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/#.*$/, "")
    .trim();
}

/** Smallest size level per word, American spelling, no upper or abbr entries. */
export function sizeLevels(scowl: string): Map<string, number> {
  const size = new Map<string, number>();
  const emit = (word: string, level: number, tags: string): void => {
    if (!WORD.test(word)) return;
    if (tags.includes("upper") || tags.includes("abbr")) return;
    const known = size.get(word);
    if (known === undefined || level < known) size.set(word, level);
  };
  let previous: string | null = null;
  for (const raw of scowl.split("\n")) {
    const line = LINE.exec(raw);
    if (line === null) continue;
    const levels = [...(line[1] as string).matchAll(SIZE)].map((match) => Number(match[1]));
    if (levels.length === 0) continue;
    const level = Math.min(...levels);
    const fields = (line[2] as string).split(":");
    const head = fields.findIndex((field) => field.includes("<"));
    if (head < 0) continue;
    const codes = fields
      .slice(0, head)
      .join(" ")
      .split(/\s+/)
      .filter((flag) => CODE.test(flag));
    if (codes.length > 0 && !codes.some((code) => code.startsWith("A"))) continue;
    const headField = fields[head] as string;
    const tags = /<([^>]*)>/.exec(headField)?.[1] ?? "";
    let word = clean(headField);
    if (word === "-" || word === "") word = previous ?? "";
    else previous = word;
    if (word !== "") emit(word, level, tags);
    for (const field of fields.slice(head + 1)) {
      for (const piece of clean(field).split(",")) {
        const inflection = piece.trim();
        if (inflection !== "" && inflection !== "-") emit(inflection, level, tags);
      }
    }
  }
  return size;
}

export function distinctLetters(word: string): number {
  return new Set(word).size;
}

/** Rule steps 4 to 6 over one size level, sorted. */
export function derive(
  levels: ReadonlyMap<string, number>,
  enable: ReadonlySet<string>,
  deny: ReadonlySet<string>,
  maxLevel: number,
): string[] {
  const out: string[] = [];
  for (const [word, level] of levels) {
    if (level > maxLevel || !enable.has(word) || deny.has(word)) continue;
    if (word.length < 4 || word.includes("s") || distinctLetters(word) > 7) continue;
    out.push(word);
  }
  return out.sort();
}

function lines(path: string): string[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
}

function flag(name: string): string | null {
  const at = argv.indexOf(`--${name}`);
  return at >= 0 && at + 1 < argv.length ? (argv[at + 1] as string) : null;
}

function main(): void {
  const scowlPath = flag("scowl");
  const enablePath = flag("enable");
  if (scowlPath === null || enablePath === null) {
    stdout.write("usage: pangram-words --scowl <scowl-pre.txt> --enable <enable1.txt>\n");
    exit(1);
  }
  const levels = sizeLevels(readFileSync(scowlPath, "utf8"));
  const enable = new Set(lines(enablePath));
  const deny = new Set(lines(DENY_PATH));
  const accepted = derive(levels, enable, deny, ACCEPTED_LEVEL);
  const familiar = derive(levels, enable, deny, FAMILIAR_LEVEL);
  writeFileSync("data/pangram/accepted.txt", `${accepted.join("\n")}\n`);
  writeFileSync("data/pangram/familiar.txt", `${familiar.join("\n")}\n`);
  stdout.write(`accepted ${String(accepted.length)} words, familiar ${String(familiar.length)} words\n`);
}

if (process.argv[1]?.replaceAll("\\", "/").endsWith("tools/pangram-words.ts")) main();
