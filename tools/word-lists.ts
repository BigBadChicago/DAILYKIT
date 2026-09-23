/**
 * Shared offline utilities for parsing and filtering SCOWL and ENABLE word lists.
 * Used by tools/pangram-words.ts and tools/five-letters-words.ts.
 */

import { readFileSync } from "node:fs";
import { argv as processArgv } from "node:process";

export const LINE_REGEX = /^((?:\d+\s*(?:\[[^\]]*\]\s*)*)+):\s*(.*)$/;
export const SIZE_REGEX = /(?<![\w[])(\d+)(?=\s*(?:\[|$|\s))/g;
export const WORD_REGEX = /^[a-z]+$/;
export const CODE_REGEX = /^[A-Z][A-Za-z]*$/;

export function cleanWordText(text: string): string {
  return text
    .replace(/<[^>]*>/g, "")
    .replace(/\{[^}]*\}/g, "")
    .replace(/#.*$/, "")
    .trim();
}

export function readLines(path: string): string[] {
  return readFileSync(path, "utf8")
    .split("\n")
    .map((word) => word.trim())
    .filter((word) => word.length > 0);
}

export function getCommandLineFlag(name: string, argvArray?: readonly string[]): string | null {
  const args = argvArray ?? processArgv;
  const at = args.indexOf(`--${name}`);
  return at >= 0 && at + 1 < args.length ? (args[at + 1] as string) : null;
}

export function distinctLetters(word: string): number {
  return new Set(word).size;
}

export interface ScowlLevels {
  /** Smallest level at which the word appears at all. */
  readonly any: Map<string, number>;
  /** Smallest level at which the word is a headword of its own line. */
  readonly head: Map<string, number>;
}

function recordLevel(map: Map<string, number>, word: string, level: number): void {
  const known = map.get(word);
  if (known === undefined || level < known) map.set(word, level);
}

export function parseScowlLevels(scowl: string): ScowlLevels {
  const any = new Map<string, number>();
  const head = new Map<string, number>();
  let previous: string | null = null;

  for (const raw of scowl.split("\n")) {
    const line = LINE_REGEX.exec(raw);
    if (line === null) continue;
    const levels = [...(line[1] as string).matchAll(SIZE_REGEX)].map((match) => Number(match[1]));
    if (levels.length === 0) continue;
    const level = Math.min(...levels);
    const fields = (line[2] as string).split(":");
    const at = fields.findIndex((field) => field.includes("<"));
    if (at < 0) continue;
    const codes = fields
      .slice(0, at)
      .join(" ")
      .split(/\s+/)
      .filter((flag) => CODE_REGEX.test(flag));
    if (codes.length > 0 && !codes.some((code) => code.startsWith("A"))) continue;
    const headField = fields[at] as string;
    const tags = /<([^>]*)>/.exec(headField)?.[1] ?? "";
    let word = cleanWordText(headField);
    const continuation = word === "-" || word === "";
    if (continuation) word = previous ?? "";
    else previous = word;

    if (tags.includes("upper") || tags.includes("abbr")) continue;
    if (WORD_REGEX.test(word)) {
      recordLevel(any, word, level);
      if (!continuation) recordLevel(head, word, level);
    }
    for (const field of fields.slice(at + 1)) {
      for (const piece of cleanWordText(field).split(",")) {
        const inflection = piece.trim();
        if (inflection !== "" && inflection !== "-" && WORD_REGEX.test(inflection)) {
          recordLevel(any, inflection, level);
        }
      }
    }
  }

  return { any, head };
}
