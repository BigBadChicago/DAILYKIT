/**
 * Tools layer. The two pure decisions behind the service worker's precache
 * list, kept out of vite.config.ts so they can be tested without running a
 * build. vite.config.ts is the only caller in the build; the test is the other.
 */

import { createHash } from "node:crypto";

/** Emitted at the site root, so the worker's scope is the whole site. */
export const SW_FILE = "sw.js";

export const SW_MANIFEST_FILE = "sw-manifest.json";

/** The token swManifestPlugin replaces in the emitted worker. */
export const CACHE_NAME_TOKEN = "__DK_CACHE_NAME__";

/**
 * Extensions the worker precaches and then serves cache first. Every one of
 * these is either content hashed or covered by the build id in the cache name,
 * which is what makes cache first safe for them and for nothing else.
 */
export const PRECACHED_EXTENSIONS = [".html", ".js", ".css", ".svg", ".png", ".webmanifest"];

/**
 * The precache list, as absolute URLs, sorted so the build id below depends on
 * the set and not on the order Rollup happened to emit it in.
 *
 * The worker itself is excluded: the browser fetches it by URL to decide
 * whether to install, and a worker serving itself from its own cache is a
 * worker that can never be replaced.
 */
export function precacheAssets(fileNames: readonly string[]): string[] {
  return fileNames
    .filter((name) => name !== SW_FILE && name !== SW_MANIFEST_FILE)
    .filter((name) => PRECACHED_EXTENSIONS.some((ext) => name.endsWith(ext)))
    .map((name) => `/${name}`)
    .sort();
}

/**
 * `dailykit-e<engine>-r<revision>-<build id>`.
 *
 * The engine version and the revision are the two deliberate levers. The build
 * id is not decoration: the app shell is served cache first and index.html sits
 * at a stable URL with no content hash, so without a component that moves when
 * the bundle moves, a returning player would keep the first index.html they
 * ever loaded. A release build is deterministic, so identical bytes yield an
 * identical id and a redeploy of an unchanged tree costs the player nothing.
 */
export function cacheNameFor(
  engineVersion: number,
  revision: number,
  assets: readonly string[],
): string {
  const buildId = createHash("sha256").update(assets.join("\n")).digest("hex").slice(0, 8);
  return `dailykit-e${engineVersion}-r${revision}-${buildId}`;
}
