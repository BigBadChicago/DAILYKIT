---
name: Shell, hub, service worker, about
description: Rules for Layer 5 and the offline layer
applyTo: "src/shell/**,src/hub/**,src/sw/**,src/about/**"
---

Layer 5 boots one game module, owns the session lifecycle, mounts the chrome,
and is the only place that knows a session has a lifecycle. The hub is the
landing page. The service worker makes the whole thing work offline.

## Rules

1. **`src/shell/main.ts` names no game.** A game is named in exactly one file,
   `src/shell/entries/<id>.ts`, plus the allow list in `vite.config.ts`.
2. **The registry is data with zero imports.** `src/shell/registry.ts` restates
   each game's identity so the hub can render every card and read every storage
   key without loading a single game's code. A hub that imports a game pays that
   game's download on the landing page.
3. **The hub never writes.** Opening it resolves puzzle numbers and reads
   records and touches nothing. A hub that advanced a watermark would discard an
   in progress board because the player looked at a list.
4. **The resolved day is the authority, never a timer.** A backgrounded tab has
   throttled timers, so `visibilitychange` re-resolves the day and reloads when
   it moved.
5. **Inside the manifest horizon, a missing chunk is a message, never a generated
   board.** Generating one would hand that player a private board on a day every
   other player shares. Past the horizon, generation is correct and the result is
   labelled unrated.
6. **The tutorial session never writes results.** It is its own session mode
   precisely so that every write path asks the question once.
7. **Service worker.** Cache first for the app shell, stale while revalidate for
   `/data/`, network only otherwise. No `skipWaiting`, no automatic reload: a
   player mid board must not have the page swapped underneath them. It never
   caches itself. The cache name is stamped at build time and carries a build id,
   because `index.html` has no content hash.
8. **The precache list is generated, never hand written.** It comes from the
   emitted bundle through `tools/sw-manifest.ts`. If a new asset must be cached,
   make the build emit it rather than adding a literal string.
9. **The worker has its own TypeScript program**, `tsconfig.sw.json`, and is
   checked by `npm run typecheck:sw`. The main program excludes `src/sw`.
10. **The about page ships no JavaScript** and carries its own stylesheet copy on
    purpose. Do not give it a script entry to save a few kilobytes of CSS: that
    trade pulls in the whole engine chunk.
11. **Prefetch runs when the browser is idle**, never inside the load path. It is
    the largest download on the page and the first paint must not wait for it.
