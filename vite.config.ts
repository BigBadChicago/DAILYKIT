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

import { cp, readFile, readdir, stat } from "node:fs/promises";
import { dirname, relative, resolve } from "node:path";
import { fileURLToPath } from "node:url";
import { defineConfig, type Plugin } from "vite";

import {
  CACHE_NAME_TOKEN,
  SW_FILE,
  SW_MANIFEST_FILE,
  cacheNameFor,
  precacheAssets,
} from "./tools/sw-manifest.js";

const root = dirname(fileURLToPath(import.meta.url));

export const ENGINE_VERSION = 1;

/** Bumped by hand when the worker's own behaviour changes. Together with the
 *  engine version and the build id it names the cache. */
export const SW_REVISION = 1;



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
  cipher: {
    outPath: "cipher",
    html: "src/shell/entries/cipher.html",
    gameId: "cipher",
    productionSafe: true,
  },
  "toy-tap": {
    outPath: "toy-tap",
    html: "src/shell/entries/toy-tap.html",
    gameId: "toy-tap",
    productionSafe: false,
  },
  about: { outPath: "about", html: "src/about/index.html", productionSafe: true },
  harness: { outPath: "harness", html: "tools/share-harness/index.html", productionSafe: false },
    "scaffold-check": {
    outPath: "scaffold-check",
    html: "src/shell/entries/scaffold-check.html",
    gameId: "scaffold-check",
    productionSafe: false,
  },
  /* NEW_GAME_INSERTION: TARGETS */
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

/**
 * Files under static/ deploy to the site root byte for byte: the icons, the web
 * manifest, and anything else addressed by a fixed URL. They are emitted into
 * the bundle rather than copied afterwards so that a later plugin reading the
 * bundle sees them, which is what lets the precache list be generated rather
 * than hand written.
 */
function staticFilesPlugin(): Plugin {
  const dir = resolve(root, "static");
  return {
    name: "dailykit-static-files",
    async generateBundle() {
      let names: string[];
      try {
        names = await readdir(dir);
      } catch {
        return;
      }
      for (const name of names.sort()) {
        if (!(await stat(resolve(dir, name))).isFile()) continue;
        this.emitFile({
          type: "asset",
          fileName: name,
          source: await readFile(resolve(dir, name)),
        });
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
        /* Manifest chunks and the index only. calibration.json lives in the
           same directory because it is the study behind the scoring table, and
           nothing ever fetches it, so deploying it was dead weight. */
        await cp(from, resolve(root, outDir, "data", target.gameId), {
          recursive: true,
          filter: (source) => {
            const name = source.replaceAll("\\", "/").split("/").pop() ?? "";
            return name === target.gameId || name.startsWith("manifest.");
          },
        });
      }
    },
  };
}


/**
 * Writes the precache list and stamps the cache name into the worker.
 *
 * Both halves have to happen here, in generateBundle, because both need the
 * final emitted file names: the list is those names, and the cache name
 * carries a build id derived from them. A hand written list goes stale in
 * silence, and a cache name that does not move when the bundle moves would
 * pin a returning player to the first index.html they ever loaded, since the
 * app shell is served cache first and index.html has no content hash.
 *
 * The build is deterministic, so an unchanged tree yields an unchanged build
 * id and the player's cache survives a redeploy of identical bytes.
 */
function swManifestPlugin(): Plugin {
  return {
    name: "dailykit-sw-manifest",
    enforce: "post",
    generateBundle(_options, bundle) {
      const swKey = Object.keys(bundle).find((key) => key === SW_FILE);
      if (swKey === undefined) return;

      const assets = precacheAssets(Object.keys(bundle));
      const cacheName = cacheNameFor(ENGINE_VERSION, SW_REVISION, assets);

      const chunk = bundle[swKey];
      if (chunk?.type !== "chunk") throw new Error("sw.js was emitted as an asset");
      if (!chunk.code.includes(CACHE_NAME_TOKEN)) {
        throw new Error(`${CACHE_NAME_TOKEN} is missing from the emitted worker`);
      }
      chunk.code = chunk.code.replaceAll(CACHE_NAME_TOKEN, JSON.stringify(cacheName));

      this.emitFile({
        type: "asset",
        fileName: SW_MANIFEST_FILE,
        source: `${JSON.stringify({ cacheName, assets }, null, 2)}\n`,
      });
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
  /* The worker's scope is the whole site, so it only makes sense in a build
     that contains the whole site. A single target build and a dev server both
     go without one, which is also what keeps a stale cache out of development. */
  const withWorker = isProduction && outDir === "dist";
  if (withWorker) input["sw"] = resolve(root, "src/sw/sw.ts");

  return {
    root,
    base: "/",
    publicDir: false,
    plugins: [
      staticFilesPlugin(),
      htmlLocationPlugin(targets),
      swManifestPlugin(),
      manifestDataPlugin(targets, outDir),
    ],
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
          entryFileNames: (chunk) =>
            chunk.name === "sw" ? SW_FILE : "assets/[name]-[hash].js",
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
