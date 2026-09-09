# AGENTS.md

This repository's full agent instructions live in
[`.github/copilot-instructions.md`](.github/copilot-instructions.md). Read that
file first, then `ARCHITECTURE.md`.

The short version, for any coding agent working here:

- `ARCHITECTURE.md` is the source of truth. It carries the file manifest and
  every numbered design decision. A change that contradicts a numbered decision
  is not yours to make: stop and report the conflict.
- The layer rule holds absolutely. `src/core` then `src/engine` then `src/ui`
  then `src/contract` then `src/games/*` then `src/shell` and `src/hub`. Imports
  point downward only, the engine never imports a game, a game never imports
  another game. `npm run depcheck` enforces it.
- No runtime dependencies, no framework, no analytics, no server. Static output
  only. All player state is in `localStorage`.
- Determinism is the product. No `Math.random`, no clock reads in Layers 0 and 1,
  and never hand edit anything under `data/`.
- Write the failing test first. Never weaken a test to make a suite green.
- The gate before any claim of done: `npm run typecheck`,
  `npm run typecheck:tools`, `npm run typecheck:sw`, `npm run depcheck`,
  `npm test`, the relevant `*:verify` script, `npm run build`, `npm run budget`.
  Paste the output.
- Do not use dashes as punctuation in anything you write.
