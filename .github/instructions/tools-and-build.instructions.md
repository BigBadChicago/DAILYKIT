---
name: Tools, build, and CI
description: Rules for the Node only tooling, the bundler configuration, and the workflows
applyTo: "tools/**,vite.config.ts,vitest.config.ts,tsconfig*.json,.github/workflows/**,package.json"
---

`tools/` runs in Node only and is never bundled into a browser build. The build
configuration is the single place a game becomes shippable.

## Rules

1. **Generation and verification are separate processes.** A bug that writes a
   bad board and a bug that fails to notice one must not be able to be the same
   bug. Verification re-derives every stored field from the board rather than
   re-reading it.
2. **Never regenerate a whole horizon to fix one day.** Use the range variables,
   for example `POKER_GRID_FROM` and `POKER_GRID_TO`. A full run takes over an
   hour and rewrites verified data.
3. **A month is written the moment it closes**, so a failure late in a run does
   not throw away the boards already earned.
4. **The allow list in `vite.config.ts` is how a game ships.** Adding an entry
   there and its `src/shell/entries/<id>.ts` file is the whole build surface of a
   game. `toy-tap` and the share harness are excluded from production
   deliberately and permanently.
5. **A release is one build.** All entries in one pass, because that is the only
   construction that computes a shared engine chunk across them. `GAME=<id> vite
   build` writes to `dist-dev/` and is a development convenience, never a deploy.
6. **`ENGINE_VERSION` and `SW_REVISION` are deliberate levers.** Bumping either
   invalidates caches for every player. Do not touch them to work around a
   caching symptom.
7. **The build must stay deterministic.** Two consecutive builds of an unchanged
   tree produce identical file names and an identical `sw-manifest.json`. The
   service worker cache name depends on it.
8. **CI order is the gate order.** typecheck, typecheck:tools, typecheck:sw,
   depcheck, test, the verify scripts, build, budget. A new check goes into
   `.github/workflows/ci.yml` in the position where its failure is most
   informative.
9. **`npm run budget` reads `dist/`.** It must run after a build, and it fails
   over 150 KB gzipped for any page.
10. **Adding a dependency is a constraint change**, not a commit. Propose it with
    the reason and wait.
