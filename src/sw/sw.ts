/**
 * The service worker. Constraint 2.6 and requirement 7.3.1.
 *
 * Authored in TypeScript and emitted as dist/sw.js by swManifestPlugin in
 * vite.config.ts, which also stamps the cache name in below. It imports
 * nothing, so the emitted file is a classic script and registers without
 * `type: "module"`, which is what keeps it working on the oldest Safari in the
 * support floor of constraint 2.8.
 *
 * ## The cache name
 *
 * `__DK_CACHE_NAME__` is replaced at build time with
 * `dailykit-e<engine>-r<revision>-<build id>`. The engine version and the
 * revision are the two deliberate levers, and the build id is derived from the
 * emitted asset names. The build id is not decoration: the app shell is served
 * cache first and `index.html` sits at a stable URL, so without something in
 * the name that moves when the bundle moves, a returning player would keep the
 * first HTML they ever loaded. A release build is deterministic, so an
 * unchanged tree keeps its build id and its cache along with it.
 *
 * ## Strategies
 *
 * - App shell, meaning HTML, JS, CSS, and the root icons: cache first. Every
 *   one of those URLs either carries a content hash or lives inside a cache
 *   whose name changes when the bundle does, so a stale read is impossible.
 * - Manifest chunks under /data/: stale while revalidate. A chunk is immutable
 *   once written, but a regenerated horizon has to reach a returning player
 *   without a hard refresh.
 * - Everything else: network only. Nothing else is same origin in version 1.
 */

/// <reference lib="webworker" />

/* Makes this file a module, which is what lets `self` be redeclared with the
   worker's own type. It exports nothing, so the emitted bundle is still a
   classic script. */
export {};

declare const self: ServiceWorkerGlobalScope;

declare const __DK_CACHE_NAME__: string;

/** Written next to the worker by the build. Generated, never hand written. */
const MANIFEST_URL = "/sw-manifest.json";

const CACHE = __DK_CACHE_NAME__;

const DATA_PREFIX = "/data/";

interface PrecacheManifest {
  readonly assets: readonly string[];
}

/**
 * The manifest is fetched with the cache name in the query string so a new
 * deploy can never be handed the previous deploy's list out of the HTTP cache.
 */
async function precacheList(): Promise<readonly string[]> {
  const response = await fetch(`${MANIFEST_URL}?v=${encodeURIComponent(CACHE)}`, {
    cache: "no-cache",
    credentials: "omit",
  });
  if (!response.ok) throw new Error(`precache manifest ${response.status}`);
  const parsed = (await response.json()) as Partial<PrecacheManifest>;
  if (!Array.isArray(parsed.assets)) throw new Error("precache manifest is malformed");
  return parsed.assets.filter((entry): entry is string => typeof entry === "string");
}

self.addEventListener("install", (event) => {
  event.waitUntil(
    (async () => {
      const cache = await caches.open(CACHE);
      const assets = await precacheList();
      /* One request per asset rather than cache.addAll, because addAll rejects
         the whole install if any single entry fails, and a worker that never
         installs is worse than one that installs with a gap the fetch handler
         will fill from the network anyway. */
      await Promise.all(
        assets.map(async (url) => {
          try {
            const response = await fetch(url, { cache: "reload", credentials: "omit" });
            if (response.ok) await cache.put(url, response);
          } catch {
            /* Left for the fetch handler. */
          }
        }),
      );
    })(),
  );
  /* No skipWaiting. A player mid board must not have the page swapped
     underneath them, so the new worker waits and the next navigation gets it. */
});

self.addEventListener("activate", (event) => {
  event.waitUntil(
    (async () => {
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((name) => name.startsWith("dailykit-") && name !== CACHE)
          .map((name) => caches.delete(name)),
      );
      await self.clients.claim();
    })(),
  );
});

/** A navigation to a directory URL is served by that directory's index.html,
 *  which is the URL the precache holds. */
function shellKey(url: URL, request: Request): string | null {
  if (request.mode === "navigate") {
    return url.pathname.endsWith("/") ? `${url.pathname}index.html` : url.pathname;
  }
  const kind = request.destination;
  if (kind === "script" || kind === "style" || kind === "image" || kind === "manifest") {
    return url.pathname;
  }
  return null;
}

async function cacheFirst(key: string, request: Request): Promise<Response> {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(key);
  if (hit !== undefined) return hit;
  const response = await fetch(request);
  if (response.ok && response.type === "basic") await cache.put(key, response.clone());
  return response;
}

async function staleWhileRevalidate(request: Request): Promise<Response> {
  const cache = await caches.open(CACHE);
  const hit = await cache.match(request);
  const network = fetch(request)
    .then(async (response) => {
      if (response.ok) await cache.put(request, response.clone());
      return response;
    })
    .catch(() => null);
  if (hit !== undefined) {
    void network;
    return hit;
  }
  const response = await network;
  if (response !== null) return response;
  return new Response("", { status: 504, statusText: "Offline and not cached" });
}

self.addEventListener("fetch", (event) => {
  const request = event.request;
  if (request.method !== "GET") return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin) return;

  if (url.pathname.startsWith(DATA_PREFIX)) {
    event.respondWith(staleWhileRevalidate(request));
    return;
  }

  const key = shellKey(url, request);
  if (key === null) return;
  event.respondWith(
    cacheFirst(key, request).catch(
      /* A navigation with nothing cached and no connection. The hub is the one
         page every install has, so it is the honest landing place. */
      async () => (await caches.open(CACHE)).match("/index.html").then(
        (hit) => hit ?? new Response("", { status: 504, statusText: "Offline" }),
      ),
    ),
  );
});
