# DailyKit

DailyKit is a static daily game suite. The first game is POKER GRID, a five by
seven board game where every move clears five connected cards that form a poker
hand. Puzzle data is generated offline and verified into monthly manifest
chunks; the browser never needs a server-side game service.

## Development

```text
npm ci
npm run typecheck
npm run typecheck:tools
npm run depcheck
npm test
npm run poker-grid:verify
```

`npm test` runs the Vitest suite, including jsdom tests for the presentation
kit. `npm run depcheck` enforces the layer rule from `ARCHITECTURE.md` and keeps
games isolated from one another.

## Puzzle data

The checked-in horizon is under `data/poker-grid/`. To regenerate a range,
set `POKER_GRID_FROM` and `POKER_GRID_TO` and run:

```text
npm run poker-grid:generate
npm run poker-grid:verify
```

Generation is an offline operation and can take a while. Verification is kept
as a separate process so a generation defect cannot also hide in verification.

## Structure

- `src/core`: deterministic primitives and shared types
- `src/engine`: persistence, scheduling, statistics, sharing, and lifecycle
- `src/ui`: framework-free presentation components
- `src/contract`: the game module boundary
- `src/games`: game logic and renderers
- `tools`: offline generation, verification, calibration, and CI checks
- `tests`: unit and integration coverage

The browser shell and hub are scheduled for a later phase. See
`ARCHITECTURE.md` for the phase log and complete file manifest.
