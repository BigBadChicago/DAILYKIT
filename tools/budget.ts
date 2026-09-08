/**
 * Tools layer. Constraint 2.7's byte half, asserted rather than remembered.
 *
 * Sums the gzipped size of everything a page pulls on a cold load, meaning its
 * own HTML plus every script and stylesheet it references, and fails over the
 * budget. Manifest chunks are excluded on purpose: they are fetched after the
 * page is interactive and the lookahead prefetch waits for idle, so they are
 * not part of a cold load.
 *
 * Run after a release build. It reads dist/ and nothing else.
 */

import { gzipSync } from "node:zlib";
import { readFile, readdir } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const root = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const dist = resolve(root, "dist");

/** Constraint 2.7, excluding fonts, of which there are none. */
const BUDGET_BYTES = 150 * 1024;

async function pages(): Promise<string[]> {
  const found: string[] = [];
  const walk = async (directory: string): Promise<void> => {
    for (const item of await readdir(directory, { withFileTypes: true })) {
      const path = resolve(directory, item.name);
      if (item.isDirectory()) {
        if (item.name === "data" || item.name === "assets") continue;
        await walk(path);
      } else if (item.name.endsWith(".html")) {
        found.push(path);
      }
    }
  };
  await walk(dist);
  return found.sort();
}

async function gzippedSize(path: string): Promise<number> {
  return gzipSync(await readFile(path), { level: 9 }).byteLength;
}

async function main(): Promise<void> {
  const failures: string[] = [];
  for (const page of await pages()) {
    const html = await readFile(page, "utf8");
    const referenced = [...html.matchAll(/(?:src|href)="(\/[^"]+\.(?:js|css))"/g)].map(
      (match) => match[1] as string,
    );
    let total = await gzippedSize(page);
    for (const url of new Set(referenced)) total += await gzippedSize(resolve(dist, url.slice(1)));

    const name = page.slice(dist.length + 1).replaceAll("\\", "/");
    const kilobytes = (total / 1024).toFixed(1);
    const verdict = total > BUDGET_BYTES ? "OVER BUDGET" : "ok";
    console.log(`${name.padEnd(24)} ${kilobytes.padStart(7)} KB gzipped  ${verdict}`);
    if (total > BUDGET_BYTES) failures.push(`${name} is ${kilobytes} KB gzipped`);
  }

  if (failures.length > 0) {
    console.error(`\nOver the ${BUDGET_BYTES / 1024} KB cold load budget:`);
    for (const failure of failures) console.error(`  ${failure}`);
    process.exitCode = 1;
    return;
  }
  console.log("\nevery page is inside the cold load budget");
}

await main();
