# HANDOFF

The note passed from one conversation to the next. It says where the project
stands, what this conversation must do, what must not be done, and where every
file this conversation needs lives. It is rewritten at the end of every phase
and it describes exactly one conversation: the next one.

| Field | Value |
|---|---|
| Written | 2026-09-16, at the end of v3 migration phase 5 part B |
| For the conversation | **v3 migration phase 6: retire the v2 contract and move the scaffold to v3** |
| Phase scheme | v3 migration phases, ARCHITECTURE2.md section 56. Not a charter phase |
| Charter phase in parallel | Charter Phase 13 is still open and untouched by this work |
| Next after this | The first new game on v3, in its own conversation, after the owner names it |

---

## 1. Reading order

Read these before doing anything, in this order, and nothing else unless a
section below names it for this phase.

1. **HANDOFF.md**, this file. Where things stand and what to do.
2. **ARCHITECTURE2.md**. The active architecture. For this phase read section 3
   (core contracts), section 44 (new game authoring contract), section 45 (the
   gate, including its as built note), section 54 (definition of done for a new
   game), and all of section 56, whose phase 5 entry records parts A and B and
   whose phase 6 entry is the scope of this conversation.
3. **ARCHITECTURE.md**. The v2 record. For this phase the Contract decisions,
   the Template decisions, the Build model and the File manifest matter most.
4. **BACKLOG.md**. Everything deliberately not built. Check it before proposing
   anything that sounds new.

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

**v3 migration log, section 56.**

| Phase | What | Status |
|---|---|---|
| 1 | v3 contract and engine seams, additive | Done 2026-09-13 |
| 2 | VECTOR on v2 and v3 at once | Done 2026-09-13 |
| Slate reconciliation | Composition A, eight games, ROTATE LOCK rename | Done 2026-09-13 |
| 3 | CIPHER on v2 and v3 at once | Done 2026-09-13 |
| 4 | POKER GRID on v2 and v3 at once | Done 2026-09-16 |
| 5 part A | Shell, hub and daily card read v3 only; one share composer | Done 2026-09-16 |
| 5 part B | Certification gate as a CI job | Done 2026-09-16 |
| **6** | **Retire the v2 contract and move the scaffold to v3** | **This conversation** |

**What part B left in place.**

- `tools/certify.ts` holds a plan per live game in `GAME_PLANS`, and writes or
  checks `data/<game>/certification.json`. All three records are production safe.
- `vite.config.ts` admits a game target only through its record. A game target
  with `productionSafe: true` makes the build throw.
- `manual-mobile-check` is pending under `manual-mobile-2026-09-16`, which covers
  the three live games only and expires 2026-12-15.
- The records hash their outcomes, and each step's evidence names test files by
  path. **Moving, renaming or deleting a test file a plan names changes a record.**
  Phase 6 will edit module tests and `tests/shell/share-context.test.ts`; if a
  path changes, update `GAME_PLANS`, rerun `npm run certify`, and commit the
  records with the change.
- VECTOR's index now uses the shell's shape. It was unloadable past the practice
  board before part B.

**Green baseline to regress against,** measured at the end of part B:

| Gate | Result |
|---|---|
| Typecheck | `tsc --noEmit` for `tsconfig.json`, `tsconfig.tools.json`, `tsconfig.sw.json` |
| Dependency check | `tools/depcheck.ts`, layers verified |
| Tests | 62 files, 818 tests |
| POKER GRID verifier | 365 boards, about 9 seconds, now including the duplicate check |
| CIPHER verifier | 365 days, about 2 seconds |
| VECTOR verifier | 365 puzzles, 91,526 uniqueness nodes, about 100 seconds |
| Production build | Engine chunk `engine-v2.js` |
| Byte budget | Hub 17.6, POKER GRID 27.8, CIPHER 25.7, VECTOR 28.1, About 3.4 KB gzipped |
| Certification | `npm run certify` about three minutes, three games production safe; `certify --check --from-ci` passes |
| Offline smoke | Hub 8 cards, POKER GRID 35 cards, CIPHER 6 keys, VECTOR 36 cells, all from cache with the server stopped |

---

## 3. Preconditions to check first

Handed to the owner at the end of part B. Confirm them in the working tree
before any work, and stop and ask if any is not done.

1. **Patch applied**: `phase5-partB-github.patch`, which updates
   `.github/workflows/ci.yml` (adds `vector:verify` and
   `npm run certify -- --check --from-ci`) and
   `.github/instructions/tools-and-build.instructions.md`. The bridge refuses to
   write under `.github`. Without it `tests/tools/certify.test.ts` fails, because
   it asserts ci.yml runs every script a gate plan names.
2. **Empty directory removed**: `src/games/toy-tap/`, left empty in part A.
3. **Committed**: the part B change set, including the three
   `data/<game>/certification.json` files, and a CI run on it that passed.

---

## 4. The task: v3 migration phase 6

**Goal.** One contract. v2 is deleted, every game's default export is its v3
module, and a new game scaffolds on v3 with a certification plan, so the first
new game is authored against exactly what the shell reads.

**Scope, from ARCHITECTURE2.md section 56.**

1. Delete the v2 `GameModule`, `defineGame` and `ShareBlock`.
2. Delete each game's `bucketOf`, `shareBlock` and default v2 export; make each
   `*V3` export the default, and update the entries.
3. Rewrite `tools/new-game.ts` and NEW_GAME.md to scaffold v3.
4. Rewrite the byte identity tests in `tests/shell/share-context.test.ts` against
   fixed strings, since the v2 block they compare against will be gone.
5. The gate's side of authoring: the scaffold adds a `GAME_PLANS` row for a new
   game, and NEW_GAME.md says a game ships only through its own record.

**Size.** Expected over 300 lines. Per the efficiency protocol, state what is
about to be produced in one line and wait for confirmation before writing it.

**Open questions to resolve with the owner before writing code.** Not answered
in the documents; ask, do not reconstruct.

1. Whether `src/contract/types.ts` types still used by v3, such as `MountContext`
   and `GameView`, move into `src/contract/v3/` or stay where they are with the
   v2 module type removed around them.
2. Whether the scaffold writes a `GAME_PLANS` row directly, through a new
   insertion marker in `tools/certify.ts`, or prints the row for the author to
   paste.
3. What the scaffold's stub plan marks for steps a stub cannot pass, given that a
   new game is never covered by the manual mobile exemption and must not ship.
4. Whether `ENGINE_VERSION` moves to 3, since deleting v2 exports changes the
   engine chunk's exports again.

---

## 5. Phase 6 requirements mapped to what exists

| Requirement | Exists today as | Notes |
|---|---|---|
| v2 module type | `src/contract/game-module.ts`, `defineGame` | `src/engine/storage.ts` names `bucketOf` in a comment only |
| v2 share block type | `ShareBlock` in `src/core/types.ts` | Marked for phase 6 in part A |
| Game v2 surfaces | `bucketOf`, `shareBlock`, default export in `src/games/{poker-grid,cipher,vector}/module.ts` | Held equal to the outcome by each module test |
| v3 module | `src/contract/v3/game-module.ts`, `defineGameV3`, `pokerGridV3`, `cipherV3`, `vectorV3` | Shell and entries already mount these |
| Fixture | `src/games/toy-v3/module.ts`, `tests/contract/v3-toy.test.ts` | Already v3 only |
| Scaffold | `tools/new-game.ts`, `tests/tools/new-game.test.ts`, NEW_GAME.md | Still v2; inserts `productionSafe: false`, which stays correct |
| Byte identity tests | `tests/shell/share-context.test.ts` | Compare against v2 `shareBlock`, rewrite to fixed strings |
| v2 references in tests | `tests/games/{cipher,poker-grid,vector}/module.test.ts`, `tests/games/cipher/telemetry.test.ts` | |
| Gate plans | `GAME_PLANS` in `tools/certify.ts` | Evidence names test paths; see section 2 |

---

## 6. Where everything is

### Documents in the project and the repo root

| File | What it is |
|---|---|
| HANDOFF.md | This file |
| ARCHITECTURE2.md | Active architecture, v3 contract, gate, migration log |
| ARCHITECTURE.md | v2 record, file manifest, every settled decision |
| BACKLOG.md | Everything not built and why |
| PHASE-13-PLAN.md | Charter Phase 13 specification, not this phase |
| POKER-GRID.md, CIPHER.md, VECTOR/ | Per game design documents |
| NEW_GAME.md | Game authoring procedure, still v2, rewritten in this phase |
| MANUAL-CHECKS.md | The Section 10.7 checklist with a results table, never run |

### Source relevant to this phase

| Path | Why |
|---|---|
| src/contract/game-module.ts, src/contract/types.ts | The v2 contract to delete |
| src/contract/v3/game-module.ts, types.ts | The contract that remains |
| src/core/types.ts | `ShareBlock` |
| src/engine/storage.ts | A comment naming `bucketOf` |
| src/games/<game>/module.ts | v2 surfaces and exports |
| src/shell/entries/*.ts | Import the `*V3` exports by name |
| tools/new-game.ts | The scaffold |
| tools/certify.ts | `GAME_PLANS`, evidence paths |
| vite.config.ts | `ENGINE_VERSION`, `TARGETS` |
| tests/shell/share-context.test.ts | Byte identity tests |

---

## 7. How to work in this environment

1. **The workspace shell cannot mount the repository.** A Windows update released
   2026-09-08 breaks it: `device_bash` fails with "no Plan9 drive shares
   mounted". Read and write the tree with `device_list_dir`,
   `device_stage_files` and `device_commit_files`.
2. **Run the real gates in the cloud container.** Stage `src`, `tests`, `tools`,
   `data`, `static`, the three tsconfigs, `package.json`, `package-lock.json`,
   `vite.config.ts`, `vitest.config.ts` and `.github/workflows`, then `npm ci`
   and run every gate in section 2's baseline. Staging does not put file contents
   into context. Commit the tree to git inside the container before editing so
   the final diff is exact, and add `node_modules`, `dist`, `dist-dev` and
   `dist-certify` to its `.gitignore` first.
3. **`npm run certify` needs git** for `certifiedCommit`. The container's commits
   are not the owner's, so after certifying set `certifiedCommit` in each record
   to the owner's HEAD, read from `.git/refs/heads/main` by staging it. The field
   is outside the hash.
4. **Committing back.** Pass `expectedMtimeMs` from staging for every modified
   file so a newer edit by the owner is never overwritten.
5. **The bridge cannot write under `.github` and cannot delete.** Deliver
   `.github` changes as a patch file and list deletions for the owner.
6. **Headless Chromium** is at `/opt/pw-browsers` and the global Playwright
   package works against `vite preview`. A smoke check must go past the practice
   board: visit each game twice, or offline after a first visit, because a first
   visit never reads the manifest. Stop the preview server with
   `fuser -k 4173/tcp`, never `pkill -f`, which matches the calling shell.
7. **Project copies of the documents go stale.** After a phase, write
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
