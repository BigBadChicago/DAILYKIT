/**
 * Build configuration. Contract decision 12 and the Build model in
 * ARCHITECTURE.md.
 *
 * The allow list below is the single place a game becomes shippable. It both
 * excludes toy-tap and the share harness from production and names every entry
 * a release build contains.
 *
 * ## Why the release build assembles the whole suite in one pass
 *
 * Requirement 7.3.2 wants the engine downloaded once and cached, which requires
 * one URL holding one set of bytes for every game. Separate per game builds
 * cannot produce that: Rollup includes only the engine each entry actually
 * reaches, so a hub only build and a POKER GRID build emit different bytes, and
 * whichever ran last would win at the shared URL. That is not a naming problem
 * and no filename scheme fixes it.
 *
 * So a release is one invocation with every allowed entry, and the engine chunk
 * is the shared chunk Rollup computes across those entries, pinned to a version
 * bearing filename rather than a content hash so it survives a game only
 * change. Constraint 2.9 still holds in the sense that matters: `GAME=<id> vite
 * build` builds one game alone and is what development and a smoke check use,
 * and a game's own code is its own chunk either way. Requirement 7.3.9 holds
 * because a release build is deterministic, so shipping a one game fix rewrites
 * that game's chunk and leaves the other four byte identical.
 *
 * Bumping ENGINE_VERSION is the deliberate act that invalidates the shared
 * chunk for every game at once.
 */

import { cp, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

const root = dirname(fileURLToPath(import.meta.url));

export const ENGINE_VERSION = 1;

interface Target {
  /** Directory under dist/. The empty string is the site root. */
  readonly outPath: string;
  readonly html: string;
  /** Names the data directory to deploy, and is absent for pages with none. */
  readonly gameId?: string;
  readonly productionSafe: boolean;
}

/** The allow list. A game ships by being added here and in no other way. */
const TARGETS: Readonly<Record<string, Target>> = {
  hub: { outPath: "", html: "src/hub/index.html", productionSafe: true },
  "poker-grid": {
    outPath: "poker-grid",
    html: "src/shell/entries/poker-grid.html",
    gameId: "poker-grid",
    productionSafe: true,
  },
  "toy-tap": {
    outPath: "toy-tap",
    html: "src/shell/entries/toy-tap.html",
    gameId: "toy-tap",
    productionSafe: false,
  },
  harness: { outPath: "harness", html: "tools/share-harness/index.html", productionSafe: false },
};

/**
 * The layers that make up the shared chunk. A game directory is never here, so
 * a game's code can never end up behind the engine's cached URL.
 */
const ENGINE_DIRS = ["/src/core/", "/src/engine/", "/src/ui/", "/src/contract/", "/src/shared/"];

const ENGINE_CHUNK = "engine";

function selectTargets(name: string | undefined, isProduction: boolean): [string, Target][] {
  if (name === undefined || name === "all") {
    return Object.entries(TARGETS).filter(
      ([, target]) => target.productionSafe || !isProduction,
    );
  }
  const target = TARGETS[name];
  if (target === undefined) {
    throw new Error(`GAME must be one of all, ${Object.keys(TARGETS).join(", ")}, got ${name}`);
  }
  if (isProduction && !target.productionSafe) {
    throw new Error(`${name} is excluded from production builds by the allow list`);
  }
  return [[name, target]];
}

/**
 * Vite emits an HTML entry at its path relative to the project root, so a
 * game's page would land at dist/src/shell/entries/<id>.html. Renaming here is
 * what lets the source tree stay organised by layer while the deployed tree is
 * organised by URL.
 */
function htmlLocationPlugin(targets: readonly [string, Target][]): Plugin {
  const byHtml = new Map(
    targets.map(([, target]) => [
      relative(root, resolve(root, target.html)).replaceAll("\\", "/"),
      target.outPath === "" ? "index.html" : `${target.outPath}/index.html`,
    ]),
  );

  return {
    name: "dailykit-html-location",
    enforce: "post",
    generateBundle(_options, bundle) {
      for (const [key, output] of Object.entries(bundle)) {
        const wanted = byHtml.get(key);
        if (wanted === undefined) continue;
        delete bundle[key];
        output.fileName = wanted;
        bundle[wanted] = output;
      }
    },
  };
}

/** Manifest chunks are static files the shell fetches by absolute URL, so they
 *  deploy with the games that own them and never with the hub. */
function manifestDataPlugin(targets: readonly [string, Target][], outDir: string): Plugin {
  return {
    name: "dailykit-manifest-data",
    async closeBundle() {
      for (const [, target] of targets) {
        if (target.gameId === undefined) continue;
        const from = resolve(root, "data", target.gameId);
        try {
          if (!(await stat(from)).isDirectory()) continue;
        } catch {
          continue;
        }
        await cp(from, resolve(root, outDir, "data", target.gameId), { recursive: true });
      }
    },
  };
}

export default defineConfig(({ mode }) => {
  const isProduction = mode === "production";
  const selected = process.env["GAME"];
  const targets = selectTargets(selected, isProduction);
  /* A single target build reaches only part of the engine, so its engine chunk
     is a subset and must never be written over a release tree's. It goes to its
     own directory, which is also why it is a development convenience and not a
     deploy path. */
  const outDir = selected === undefined || selected === "all" ? "dist" : "dist-dev";
  const input = Object.fromEntries(
    targets.map(([name, target]) => [name, resolve(root, target.html)]),
  );

  return {
    root,
    base: "/",
    publicDir: false,
    plugins: [htmlLocationPlugin(targets), manifestDataPlugin(targets, outDir)],
    build: {
      outDir,
      /* Never true. One build must not delete another game's output, which is
         requirement 7.3.9 expressed as a flag. `npm run clean` is the explicit
         way to start over. */
      emptyOutDir: false,
      target: "es2022",
      cssCodeSplit: true,
      modulePreload: { polyfill: false },
      rollupOptions: {
        input,
        output: {
          entryFileNames: "assets/[name]-[hash].js",
          chunkFileNames: (chunk) =>
            chunk.name === ENGINE_CHUNK
              ? `assets/engine-v${ENGINE_VERSION}.js`
              : "assets/[name]-[hash].js",
          assetFileNames: (asset) =>
            asset.names?.[0] === `${ENGINE_CHUNK}.css`
              ? `assets/engine-v${ENGINE_VERSION}.css`
              : "assets/[name]-[hash][extname]",
          manualChunks(id: string) {
            const path = id.replaceAll("\\", "/");
            return ENGINE_DIRS.some((dir) => path.includes(dir)) ? ENGINE_CHUNK : undefined;
          },
        },
      },
    },
  };
});
