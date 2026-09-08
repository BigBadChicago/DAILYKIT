/**
 * Constraint 2.6. The precache list is generated from the emitted bundle, so
 * what is worth asserting is that the generator cannot silently omit a page, a
 * script, or a stylesheet, and that the cache name moves when and only when the
 * bundle does.
 */

import { describe, expect, it } from "vitest";

import {
  PRECACHED_EXTENSIONS,
  SW_FILE,
  SW_MANIFEST_FILE,
  cacheNameFor,
  precacheAssets,
} from "../../tools/sw-manifest.js";

/** The shape a release build emits today, as file names relative to dist. */
const BUNDLE = [
  "index.html",
  "poker-grid/index.html",
  "about/index.html",
  "assets/engine-v1.js",
  "assets/engine-v1.css",
  "assets/hub-6_3gXnpg.js",
  "assets/hub-D5wO__bs.css",
  "assets/poker-grid-zASVFUUt.js",
  "assets/poker-grid-Dxus71VM.css",
  "assets/about-3r4WdLJU.css",
  "assets/suite-DSR5hYu0.js",
  "icon.svg",
  "icon-192.png",
  "icon-512.png",
  "site.webmanifest",
  SW_FILE,
  SW_MANIFEST_FILE,
];

describe("precacheAssets", () => {
  it("covers every page, script, and stylesheet in the bundle", () => {
    const assets = new Set(precacheAssets(BUNDLE));
    for (const name of BUNDLE) {
      if (name === SW_FILE || name === SW_MANIFEST_FILE) continue;
      if (!PRECACHED_EXTENSIONS.some((ext) => name.endsWith(ext))) continue;
      expect(assets.has(`/${name}`)).toBe(true);
    }
    expect(assets.size).toBe(BUNDLE.length - 2);
  });

  it("excludes the worker and its own manifest", () => {
    const assets = precacheAssets(BUNDLE);
    expect(assets).not.toContain(`/${SW_FILE}`);
    expect(assets).not.toContain(`/${SW_MANIFEST_FILE}`);
  });

  it("excludes manifest chunks, which are stale while revalidate and not precached", () => {
    const assets = precacheAssets([...BUNDLE, "data/poker-grid/manifest.2026-01.json"]);
    expect(assets.some((url) => url.startsWith("/data/"))).toBe(false);
  });

  it("returns absolute root URLs in a stable order", () => {
    const forward = precacheAssets(BUNDLE);
    const reversed = precacheAssets([...BUNDLE].reverse());
    expect(forward).toEqual(reversed);
    expect(forward.every((url) => url.startsWith("/"))).toBe(true);
  });
});

describe("cacheNameFor", () => {
  const assets = precacheAssets(BUNDLE);

  it("carries both deliberate levers", () => {
    expect(cacheNameFor(1, 1, assets)).toMatch(/^dailykit-e1-r1-[0-9a-f]{8}$/);
    expect(cacheNameFor(2, 1, assets).startsWith("dailykit-e2-r1-")).toBe(true);
    expect(cacheNameFor(1, 4, assets).startsWith("dailykit-e1-r4-")).toBe(true);
  });

  it("is stable for an unchanged bundle, so a redeploy of identical bytes keeps the cache", () => {
    expect(cacheNameFor(1, 1, assets)).toBe(cacheNameFor(1, 1, precacheAssets([...BUNDLE].reverse())));
  });

  it("moves when any hashed asset moves, which is what unpins index.html", () => {
    const changed = BUNDLE.map((name) =>
      name === "assets/hub-6_3gXnpg.js" ? "assets/hub-AAAAAAAA.js" : name,
    );
    expect(cacheNameFor(1, 1, precacheAssets(changed))).not.toBe(cacheNameFor(1, 1, assets));
  });
});
