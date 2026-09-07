# MISSING FROM THIS EXPORT

This tree was assembled in the Phase 4 conversation. It contains every file that
conversation produced or had in hand, at its manifest path. The files below are
listed in ARCHITECTURE.md but were produced in the Phase 3 conversation and were
not available to reconstruct. Copy them in from your existing repo. Delete this
file once the tree is whole.

| Path | Phase |
|---|---|
| package.json | 0 |
| tsconfig.json | 0 |
| tsconfig.tools.json | 0 |
| vite.config.ts | 0 |
| vitest.config.ts | 0 |
| README.md | 0 |
| .github/workflows/ci.yml | 0 |
| .github/workflows/generate.yml | 0 |
| src/core/rng.ts | 3 |
| src/core/seed.ts | 3 |
| src/core/date.ts | 3 |
| src/engine/tiers.ts | 3 |
| src/engine/telemetry.ts | 3 |
| src/engine/storage.ts | 3 |
| src/engine/stats.ts | 3 |
| src/engine/state-machine.ts | 3 |
| src/engine/scheduler.ts | 3 |
| src/engine/share.ts | 3 |
| src/games/toy-tap/module.ts | 1 |
| tools/rngvectors.ts | 3 |
| tests/core/rng.vectors.ts | 3 |
| tests/core/rng.test.ts | 3 |
| tests/core/seed.test.ts | 3 |
| tests/core/date.test.ts | 3 |
| tests/engine/storage.test.ts | 3 |
| tests/engine/stats.test.ts | 3 |
| tests/engine/state-machine.test.ts | 3 |
| tests/engine/share.test.ts | 3 |
| tests/engine/scheduler.test.ts | 3 |

`package.json` needs `jsdom` added to devDependencies for the Layer 2 tests:

```json
  "devDependencies": {
    "typescript": "^5.6.0",
    "vite": "^5.4.0",
    "vitest": "^2.1.0",
    "jsdom": "^25.0.0"
  }
```

`vitest.config.ts` needs no change. Environment is selected per file by the
`// @vitest-environment jsdom` docblock, so Layers 0 and 1 keep running in Node.
