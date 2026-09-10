# PHASE 12 FIXES

Review of Phase 12 against `PHASE-12-PLAN.md`, at commit `8cc0f76`.

The tool, the guide, and the tests exist. `typecheck`, `typecheck:tools` and
`depcheck` pass. Six items are open. Close them in order; 1 and 6 are the ones
that would reach game three.

## Fix 1. The demo game was committed instead of removed

`scaffold-check` is in the tree: `src/games/scaffold-check/`,
`src/shell/entries/scaffold-check.ts` and `.html`,
`tests/games/scaffold-check/`, a registry entry at `src/shell/registry.ts`, and
a `TARGETS` entry in `vite.config.ts`.

Plan section 6 step 5 requires the files removed, the two marker insertions
reverted, and `git status` clean. The proof of the tool is the acceptance
transcript, not a sixth game left in the repository.

**Do:** remove all six locations, then `npm test` and `git status`.

## Fix 2. Two registry tests fail while the demo is present

Predicted by reading, not observed, because Vitest cannot run in the review
environment. Confirm both before and after fix 1.

- `tests/shell/registry.test.ts` line 11 asserts `SUITE_GAMES` has length 5.
  There are now six entries.
- The same file asserts every game after POKER GRID carries epoch
  `2026-01-05`. The `scaffold-check` entry carries `2026-01-01`.

Both come from fix 1. Neither test is wrong.

## Fix 3. The full gate was not run

The handover reported focused scaffold tests plus typecheck and depcheck. The
gate in section 6 of `.github/copilot-instructions.md` is not optional and its
order is not optional. Fix 2 exists precisely because a focused run cannot see a
suite level assertion.

**Do:** run typecheck, typecheck:tools, typecheck:sw, depcheck, test,
poker-grid:verify, cipher:verify, build, budget. Paste the output.

## Fix 4. The section 11 self check was not answered

Eleven items, each answered yes with evidence or no with a reason. Item 4 asks
for a clean `git status` and item 9 asks for `git diff --stat` showing no engine
file changed except the two markers. Both would have caught fix 1.

## Fix 5. The emitted `TARGETS` block is misindented

`vite.config.ts` lines 86 to 91: the key line and its fields sit at the same
indentation, where the sibling entries use two spaces for the key and four for
the fields. Fix the emitted text in `tools/new-game.ts` so a scaffolded entry
does not reformat on the next edit to that file.

## Fix 6. The emitted registry entry uses the wrong epoch

The committed entry carries `epoch: { year: 2026, month: 1, day: 1 }`. Every
game after POKER GRID starts on the first Monday of the epoch year,
`2026-01-05`, which is why the registry test asserts it. Confirm whether the
value comes from the tool's emitted text; if so, correct it in
`tools/new-game.ts`. This one survives the demo's removal and would put game
three on the wrong weekday band.

## Done when

- [x] Fixes 1, 5, 6 applied, 2 confirmed, 3 and 4 pasted.
- [x] `ARCHITECTURE.md` phase log row for Phase 12 says done, with what shipped.
- [x] No `scaffold-check` string anywhere except this file and
      `PHASE-12-PLAN.md`, both naming it as the acceptance example.

## Closed 2026-09-10

All six worked. Fix 2 resolved to one failing assertion rather than two, because
fix 6 corrected the epoch the tool emits, so only the `SUITE_GAMES` length
assertion failed while the demo was present. A seventh item surfaced from self
check item 7 and was fixed with the rest: the dash check in
`tests/tools/new-game.test.ts` flagged every ` - ` in source, which is
arithmetic, and would have failed POKER GRID and CIPHER. It now reads prose
only. Both new behaviours carry tests, and `insertAtMarker` was extracted from
`patchConfigFiles` so the indentation fix is testable.

An eighth item was raised and closed on the same day: the scaffold's share block
returned three `best` tokens whatever happened, so a loss shared a perfect
result. It now derives its rows from the taps and its title from the outcome,
with the generated module test asserting both.
