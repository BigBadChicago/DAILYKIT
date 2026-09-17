# HANDOFF

The note passed from one conversation to the next. It says where the project
stands, what this conversation must do, what must not be done, and where every
file this conversation needs lives. It is rewritten at the end of every phase
and it describes exactly one conversation: the next one.

| Field | Value |
|---|---|
| Written | 2026-09-17, at the end of v3 migration phase 6 |
| For the conversation | **The first new game on v3**, charter Phase 13 work under the v3 contract, after the owner names the game |
| Phase scheme | Charter phases, Section 9 of the project instructions, with PHASE-13-PLAN.md as amended by ARCHITECTURE2.md. The v3 migration phases are complete |
| Before any work | The owner names the game and answers section 4's open questions |
| Next after this | The second new game, in its own conversation |

---

## 1. Reading order

Read these before doing anything, in this order, and nothing else unless a
section below names it for this phase.

1. **HANDOFF.md**, this file. Where things stand and what to do.
2. **ARCHITECTURE2.md**. The active architecture. For this phase read section 3
   (core contracts), sections 9 to 18 (difficulty, verification, decomposition
   and symmetry, telemetry, share grammar, leak checks, artifact, fingerprint),
   section 44 (authoring contract), section 45 (the gate), section 46 (the named
   game's concept note), section 54 (definition of done), and section 56's
   phase 6 entry.
3. **ARCHITECTURE.md**. The v2 record and the settled decisions. For this phase
   the Contract decisions, the Template decisions (7 to 9 are new), the Build
   model, the Suite decisions and the File manifest matter most.
4. **BACKLOG.md**. Everything deliberately not built. Check it before proposing
   anything that sounds new.

Then **NEW_GAME.md**, which is the procedure this conversation follows.

Precedence when they disagree: the working tree outranks every document, then
ARCHITECTURE2.md, then ARCHITECTURE.md, then the project instructions. If this
file disagrees with ARCHITECTURE2.md, ARCHITECTURE2.md is right and this file
is stale; say so.

State in one line which phase this conversation is and wait for confirmation.

---

## 2. Where the project stands

**Suite.** Eight games in `src/shell/registry.ts`. Three live: POKER GRID,
CIPHER, VECTOR. Five planned and unbuilt: DIFFERENCE RELAY, TURN TABLE, RING
BALANCE, ORDER OF OPERATIONS, ROTATE LOCK.

**v3 migration log, ARCHITECTURE2.md section 56. Complete.**

| Phase | What | Status |
|---|---|---|
| 1 | v3 contract and engine seams, additive | Done 2026-09-13 |
| 2 | VECTOR on v2 and v3 at once | Done 2026-09-13 |
| Slate reconciliation | Composition A, eight games, ROTATE LOCK rename | Done 2026-09-13 |
| 3 | CIPHER on v2 and v3 at once | Done 2026-09-13 |
| 4 | POKER GRID on v2 and v3 at once | Done 2026-09-16 |
| 5 part A | Shell, hub and daily card read v3 only; one share composer | Done 2026-09-16 |
| 5 part B | Certification gate as a CI job | Done 2026-09-16 |
| 6 | v2 contract deleted, scaffold on v3 with a plan row | Done 2026-09-17 |

**What phase 6 left in place.**

- `GameModuleV3` and `defineGameV3` in `src/contract/v3/game-module.ts` are the
  only contract. Each game module default exports its v3 module.
- `npm run new-game -- --id <id> --name "<NAME>" --hue <0-359>` writes a v3 game,
  four tests, and three rows: registry `planned`, build target
  `productionSafe: false`, and `"<id>": { ...newGamePlan("<id>") }` in
  `GAME_PLANS`.
- `newGamePlan` leaves five steps as empty probe lists, which the gate refuses:
  `difficulty-calibration`, `decomposition-check`, `symmetry-check`,
  `offline-smoke`, `manual-mobile-check`. The game ships only when its own
  record is production safe. No exemption covers it.
- `certify` runs npm scripts without a shell and must be started as
  `npm run certify`.
- `ENGINE_VERSION` is still 2; `engine-v2.js` did not change by a byte.
- `manual-mobile-2026-09-16` covers the three live games only and expires
  2026-12-15.

**Green baseline to regress against,** measured at the end of phase 6:

| Gate | Result |
|---|---|
| Typecheck | `tsc --noEmit` for `tsconfig.json`, `tsconfig.tools.json`, `tsconfig.sw.json` |
| Dependency check | `tools/depcheck.ts`, layers verified |
| Tests | 62 files, 833 tests |
| POKER GRID verifier | 365 boards |
| CIPHER verifier | 365 days |
| VECTOR verifier | 365 puzzles, about 100 seconds |
| Production build | Engine chunk `engine-v2.js`, 30,262 bytes |
| Byte budget | Hub 17.6, POKER GRID 27.8, CIPHER 25.7, VECTOR 28.0, About 3.4 KB gzipped |
| Certification | `npm run certify` about three minutes, three games production safe, every committed record unchanged by phase 6 |
| Offline smoke | Hub, POKER GRID, CIPHER and VECTOR from cache on a second visit past the practice board, no console error, 2026-09-17 |

---

## 3. Preconditions to check first

Handed to the owner at the end of phase 6. Confirm them in the working tree
before any work, and stop and ask if any is not done.

1. **Patch applied**: `phase6-github.patch`, which updates
   `.github/copilot-instructions.md`, `.github/instructions/contract`, `games`
   and `tools-and-build`, and `.github/prompts/onboard.prompt.md` to the v3
   names. The bridge refuses to write under `.github`.
2. **Deleted**: `src/contract/game-module.ts`. The bridge cannot delete. Until it
   is gone the typecheck still passes, because nothing imports it, but it is a
   v2 contract in the tree.
3. **Committed**: the phase 6 change set, and a CI run on it that passed. Read
   `.git/refs/heads/main` once at the start to confirm the commit.

---

## 4. The task: the first new game on v3

**Goal.** One game from the five planned, built through NEW_GAME.md from the
design document to a committed production safe record, under the zero engine
changes rule of requirement 7.4, with a defect report at the end.

**Open questions to resolve with the owner before writing code.** Not answered
in the documents; ask, do not reconstruct.

1. **Which game.** DIFFERENCE RELAY, TURN TABLE, RING BALANCE, ORDER OF
   OPERATIONS or ROTATE LOCK. ARCHITECTURE2.md section 46 has a concept note for
   each.
2. **The scaffold refuses every planned id.** `validateGameId` refuses an id
   already in `SUITE_GAMES`, and all five are there as `planned` rows, so
   `npm run new-game -- --id rotate-lock` fails. Phase 6 found this and left it
   for the owner (ARCHITECTURE2.md section 56, "Found and not fixed"). The
   choice: the scaffold adopts an existing planned row and its provisional
   `bucketCount`, `hasWinLoss` and `stateVersion`, and skips the registry
   insertion; or the author deletes the planned row before scaffolding. The first
   is a change to `tools/new-game.ts`, which is tooling and not engine source.
3. **How much of the design document comes first.** Section 44 lists 28 items.
   Whether this conversation writes the whole design document and stops for
   approval before the scaffold, per the charter's one phase per conversation
   rule, or carries through the build.

**Size.** Expected well over 300 lines. Per the efficiency protocol, state what
is about to be produced in one line and wait for confirmation before writing it.

---

## 5. The requirements mapped to what exists

| Requirement | Exists today as | Notes |
|---|---|---|
| Contract | `src/contract/v3/game-module.ts`, `src/contract/types.ts`, `src/contract/v3/types.ts` | `MountContext` and `GameView` stay in `contract/types.ts` |
| Scaffold | `tools/new-game.ts`, `tests/tools/new-game.test.ts` | See open question 2 |
| Procedure | NEW_GAME.md | Sections 2, 3, 6 and 12 |
| Gate plan | `newGamePlan` and `GAME_PLANS` in `tools/certify.ts` | Override a step's key after the spread |
| Exemptions | `GATE_EXEMPTIONS` in `src/engine/certification.ts` | None covers a new game |
| Build admission | `vite.config.ts` reads `data/<id>/certification.json` | A target's `productionSafe` is always false |
| CI | `.github/workflows/ci.yml` | A live game's `<id>:verify` must run before the certify step; the certify test enforces it |
| Share grammar and leak checks | `src/engine/share-grammar.ts`, `src/engine/artifact.ts`, `src/engine/share-leak.ts` | Nine lines, seven rows, eight tokens, same width |
| Smallest complete references | the scaffold output, `src/games/toy-v3/module.ts` | Real games in NEW_GAME.md section 10 |

---

## 6. Where everything is

### Documents in the project and the repo root

| File | What it is |
|---|---|
| HANDOFF.md | This file |
| ARCHITECTURE2.md | Active architecture, v3 contract, gate, migration log |
| ARCHITECTURE.md | v2 record, file manifest, every settled decision |
| BACKLOG.md | Everything not built and why |
| NEW_GAME.md | The authoring procedure, rewritten for v3 in phase 6 |
| PHASE-13-PLAN.md | Charter Phase 13 specification; its game list predates composition A |
| POKER-GRID.md, CIPHER.md, VECTOR/ | Per game design documents, the shape a new one follows |
| MANUAL-CHECKS.md | The Section 10.7 checklist with a results table, never run |

### Source relevant to this phase

| Path | Why |
|---|---|
| src/contract/v3/game-module.ts | The contract |
| src/shell/registry.ts | The planned row for the chosen game |
| tools/new-game.ts | The scaffold |
| tools/certify.ts | `newGamePlan`, `GAME_PLANS` |
| src/engine/certification.ts | Gate steps and refusals |
| vite.config.ts | `TARGETS`, release admission |
| src/games/vector/ | The most recent full game, generator and verifier tools beside it |

---

## 7. How to work in this environment

1. **The workspace shell cannot mount the repository.** A Windows update released
   2026-09-08 breaks it: `device_bash` fails with "no Plan9 drive shares
   mounted". Read and write the tree with `device_list_dir`,
   `device_stage_files` and `device_commit_files`. A recursive listing of the
   repository root overflows on `node_modules` and `.git`; list `src`, `tests`,
   `tools` and `data` separately.
2. **Run the real gates in the cloud container.** Stage `src`, `tests`, `tools`,
   `data`, `static`, the three tsconfigs, `package.json`, `package-lock.json`,
   `vite.config.ts`, `vitest.config.ts` and `.github/workflows`, then `npm ci`
   and run every gate in section 2's baseline. Staging does not put file contents
   into context. Commit the tree to git inside the container before editing so
   the final diff is exact, and add `node_modules`, `dist`, `dist-dev` and
   `dist-certify` to its `.gitignore` first.
3. **`npm run certify` needs git** for `certifiedCommit`, and must be started
   through npm. The container's commits are not the owner's, so after
   certifying set `certifiedCommit` in each new or changed record to the owner's
   HEAD, read from `.git/refs/heads/main` by staging it. The field is outside the
   hash.
4. **Checking the owner's tree for changes without git.** Stage `.git/index`
   and compare git blob hashes of staged files against it; `.git` holds over a
   thousand loose objects and is too large to stage whole.
5. **Committing back.** Pass `expectedMtimeMs` from staging for every modified
   file so a newer edit by the owner is never overwritten.
6. **The bridge cannot write under `.github` and cannot delete.** Deliver
   `.github` changes as a patch file and list deletions for the owner.
7. **Headless Chromium** is at `/opt/pw-browsers` and the global Playwright
   package works against `vite preview`. A smoke check must go past the practice
   board: visit each game twice, or offline after a first visit. Stop the preview
   server with `fuser -k 4173/tcp`, never `pkill -f`.
8. **Recording a fixed expectation.** When a test must pin output that a deleted
   or changed path produced, run the old path first with a temporary probe test,
   record the values, then change the code.
9. **Project copies of the documents go stale.** After a phase, write
   ARCHITECTURE2.md, ARCHITECTURE.md, BACKLOG.md and HANDOFF.md back to the
   project as well as the repo.

---

## 8. Rules that bind every conversation

1. One phase per conversation. When it completes, rewrite this file for the next
   one and tell the owner to open a new conversation.
2. Name the phase scheme every time: charter Phase N or v3 migration phase N.
3. No dashes as punctuation in prose, comments, commit messages or documents.
   Hyphens inside compound words are fine.
4. No preamble, no recap, no alternatives unless asked. Batch questions at the
   end. End with a numbered list of decisions and the single next action.
5. Before producing more than about 300 lines, say what in one line and wait.
6. Never reconstruct charter text that cannot be read. Ask.
7. The locked POKER GRID decisions are not restated, justified or reopened.
8. Anything outside the phase goes to BACKLOG.md with a one line rationale.
9. Every file added or repurposed is recorded in the architecture documents.
10. v3 telemetry is the player's own run log on device. Any proposal that sends
    it anywhere is refused.

---

## 9. Keeping this file

Rewrite it, do not append to it, at the end of every phase. Keep the section
numbers so a reader always finds the same thing in the same place:

1. Reading order, naming the sections of the architecture documents this phase needs
2. Where the project stands, with the migration table and the measured green baseline
3. Preconditions the owner was asked to complete
4. The task: goal, approved decisions, deliverables, size, open questions
5. The map from the phase's requirements to what already exists
6. Where everything is
7. How to work in this environment
8. Rules that bind every conversation
9. Keeping this file

History does not belong here. The detailed record of what a phase did lives in
ARCHITECTURE2.md section 56; this file only points at it.
