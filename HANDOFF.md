# HANDOFF

The note passed from one conversation to the next. It says where the project
stands, what this conversation must do, what must not be done, and where every
file this conversation needs lives. It is rewritten at the end of every phase
and it describes exactly one conversation: the next one.

| Field | Value |
|---|---|
| Written | 2026-09-19, at the end of DIFFERENCE RELAY |
| For the conversation | **Charter Phase 13: TURN TABLE**, game six of eight |
| Phase scheme | Charter phases, Section 9 of the project instructions, with PHASE-13-PLAN.md as amended by ARCHITECTURE2.md. The v3 migration phases are complete |
| Before any work | Check section 3, then settle section 4's open design decisions in the design document first |
| Next after this | RING BALANCE, then ORDER OF OPERATIONS, each in its own conversation |

---

## 1. Reading order

Read these before doing anything, in this order, and nothing else unless a
section below names it.

1. **HANDOFF.md**, this file.
2. **ARCHITECTURE2.md**. The last section 56 entry, "Charter Phase 13, DIFFERENCE
   RELAY", then section 3 (the contract), 9 to 18 (difficulty, verification,
   decomposition and symmetry, telemetry, share grammar, leak checks, artifact,
   fingerprint), section 21 (input families), 27 and 35 (the spatial route family),
   the section 46 TURN TABLE note, 44 (the authoring contract) and 45 (the gate).
3. **ARCHITECTURE.md**. Presentation decisions, Contract decisions, Template
   decisions, the Build model, Suite decisions and the File manifest.
4. **BACKLOG.md**, most of all the two DIFFERENCE RELAY and ROTATE LOCK sections.

Then **NEW_GAME.md**, the procedure, and both **ROTATE-LOCK.md** and
**DIFFERENCE-RELAY.md**, the two worked v3 design documents. ROTATE LOCK is the
precedent for a spatial route game, which is what TURN TABLE is.

Precedence: the working tree, then ARCHITECTURE2.md, then ARCHITECTURE.md, then
the project instructions. If this file disagrees with ARCHITECTURE2.md, this
file is stale; say so.

State in one line which phase this conversation is and wait for confirmation.

---

## 2. Where the project stands

**Suite.** Eight games in `src/shell/registry.ts`. Three live: POKER GRID,
VECTOR, CIPHER. ROTATE LOCK and DIFFERENCE RELAY built and `planned`, each
waiting on its manual mobile check. Three planned and unbuilt: TURN TABLE, RING
BALANCE, ORDER OF OPERATIONS.

**DIFFERENCE RELAY is built and green, 2026-09-19,** under the zero engine
changes rule with zero engine changes wanted. Its design document is
DIFFERENCE-RELAY.md, its manifest and study are committed, and its verifier
agrees with the generator over 365 days. ARCHITECTURE2.md section 56 has the
record. Nothing is owed from it except its two manual checks and the BACKLOG
items it logged.

**Green baseline to regress against,** measured 2026-09-19 on a clone of
`origin/main` plus this change:

| Gate | Result |
|---|---|
| Typecheck | `tsconfig.json`, `tsconfig.tools.json`, `tsconfig.sw.json` |
| Dependency check | layers verified, no engine source touched |
| Tests | 75 files, 977 tests |
| Verifiers | POKER GRID, CIPHER, VECTOR, ROTATE LOCK, DIFFERENCE RELAY, each 365 days |
| Production build | `engine-v2.js`, 30.41 KB, unchanged |
| Byte budget | Hub 17.8, POKER GRID 28.0, CIPHER 25.9, VECTOR 28.2, About 3.5 KB gzipped; DIFFERENCE RELAY 27.4 on the harness build |
| Certification | `npm run certify -- --check`: three live games production safe, every committed record unchanged |

---

## 3. Preconditions to check first

1. **DIFFERENCE RELAY is delivered as a patch, not pushed.** The container cannot
   push. The owner applies the patch and pushes; confirm `origin/main` carries
   the DIFFERENCE RELAY files before building on top, or build on the same base
   the patch was cut from and rebase.
2. **Whether the owner has run the manual checks for ROTATE LOCK or DIFFERENCE
   RELAY.** For each that is done, record the `manual` steps, flip the registry
   row to `live`, move `ENGINE_VERSION` to 3 on the first live game that imports
   the list cursor, run `npm run certify`, and commit that game's
   `certification.json`. If neither is done, both stay planned and nothing here
   depends on them.
3. **The baseline in section 2 still holds.** Run it before changing anything.

---

## 4. The task: TURN TABLE, game six of eight

Through NEW_GAME.md, under requirement 7.4's zero engine changes rule, ending in
a defect report. Its id, path, epoch and hue are fixed in `src/shell/registry.ts`:
`turn-table`, `/turn-table/`, 2026-01-05, hue 108. Its `bucketCount`,
`hasWinLoss`, `stateVersion` and one line rule in that row are provisional and
are corrected in the change that builds it. The scaffold adopts the planned row:
`npm run new-game -- --id turn-table`.

**What the documents already settle**, ARCHITECTURE2 sections 27, 35 and 46:

| Piece | What is named |
|---|---|
| Concept | Rotate route tiles under checkpoint constraints |
| Input | Custom rotation actions |
| Verification | Orientation enumeration plus a graph connectivity check |
| Difficulty | Propagation work |
| Share | Spatial replay artifact |
| Family, section 35 | Spatial route games, risk visual density and accidental decomposition |

### 4.1 The open design decisions, settle them in the design document first

TURN TABLE is a **spatial route game**, the same family as ROTATE LOCK, so the
list cursor of `src/ui/listCursor.ts` may not fit at all. The primary stress
test of section 46 is **compact rendering and touch and keyboard parity**. The
design document must settle: the board shape and tile set at 360 pixels; whether
input is per tile rotation (custom, like ROTATE LOCK's rotate verb) or the list
cursor; the exact win and loss model, since the registry provisionally says
`hasWinLoss: false` while a single connectivity check reads like a pass or fail;
and the difficulty measure, propagation work, made a countable emergent integer
with seven band resolution, the DIFFERENCE RELAY lesson being that a measure with
too few values collapses a band.

### 4.2 Deliverables

NEW_GAME.md section 2: `TURN-TABLE.md` answering all 28 items of ARCHITECTURE2
section 44, then rules, generator plus two tools plus the 365 day manifest,
module, leak probes with positive controls, renderer, the plan row in
`tools/certify.ts`, the CI verify step, and the defect report.

**Size.** The design document and the game are each well over 300 lines. Per the
efficiency protocol, say what is about to be produced in one line and wait.

---

## 5. The requirements mapped to what exists

| Requirement | Exists today as | Notes |
|---|---|---|
| Rotation input | ROTATE LOCK's rotate verb on the list cursor | May or may not fit a lattice of tiles; the design decides |
| ORDER input | `src/ui/listCursor.ts` | Available if TURN TABLE turns out to be an ordering |
| Grid input | `src/ui/gridCursor.ts` | For a lattice of tiles, the likelier fit |
| Scaffold | `tools/new-game.ts` | Adopts the planned row |
| Procedure | NEW_GAME.md | Sections 2, 3, 6 and 12 |
| Worked v3 route game | `src/games/rotate-lock/`, `ROTATE-LOCK.md` | Route solver, independent verifier, custom input |
| Worked v3 deduction game | `src/games/difference-relay/`, `DIFFERENCE-RELAY.md` | Full enumeration, minimax fairness, list cursor |
| Manifest codec | `src/engine/manifest-codec.ts` via a per game codec | ROTATE LOCK and DIFFERENCE RELAY each wrote a thin codec |
| Gate plan | `newGamePlan` and `GAME_PLANS` in `tools/certify.ts` | DIFFERENCE RELAY's row is the newest worked example |
| CI | `.github/workflows/ci.yml` | A verifier step per game; the bridge cannot write `.github`, so deliver the change inside the patch |

---

## 6. Where everything is

| File | What it is |
|---|---|
| HANDOFF.md | This file |
| ARCHITECTURE2.md | Active architecture, v3 contract, gate, concept notes, migration and phase log |
| ARCHITECTURE.md | The v2 record, the file manifest, every settled decision |
| BACKLOG.md | Everything deliberately not built |
| NEW_GAME.md | The authoring procedure |
| ROTATE-LOCK.md, DIFFERENCE-RELAY.md | The two v3 design documents |
| PHASE-13-PLAN.md | The five games. Build order superseded per game as each is written |
| MANUAL-CHECKS.md | The device checklist, still to be run for ROTATE LOCK and DIFFERENCE RELAY |
| src/ui/listCursor.ts, src/ui/gridCursor.ts | The two input adapters |
| src/games/rotate-lock/, src/games/difference-relay/ | The two newest games |

---

## 7. How to work in this environment

1. **The workspace shell cannot mount the repository**, a Windows update of
   2026-09-08: `device_bash` fails with "no Plan9 drive shares mounted". Read the
   owner's tree with `device_list_dir` and `device_stage_files`, and write with
   `device_commit_files` when the bridge is up. List `src`, `tests`, `tools` and
   `data` separately; a recursive listing of the root overflows on `node_modules`.
2. **Run the real gates in a cloud clone.** A shallow clone of GitHub `main` then
   `npm ci` is about a minute. `origin/main` may be ahead of the owner's checkout,
   and it may not yet carry DIFFERENCE RELAY if the patch is unapplied; check.
3. **Pushing from the container is refused** unless the repository is an
   authorised source. Otherwise commit in the clone and deliver a patch and a
   bundle for the owner to apply and push.
4. **The bridge cannot write under `.github` and cannot delete.** Deliver those
   changes inside the patch and tell the owner to apply it.
5. **`npm run certify` needs git** and must be started through npm. Use
   `-- --check` to evaluate without rewriting records.
6. **`npm run <id>:calibrate`, `:generate`, `:verify`** run through npm, which is
   the allowed path in this environment; a bare `npx tsx tools/...` is blocked.
   `node --import tsx tools/<file>.ts` runs a throwaway script.
7. **A planned game cannot enter a release build.** `npm run build:harness` builds
   every target including planned ones into `dist`, and is the way to render a new
   game at 360 pixels and measure its page. Never patch the target list in the tree.
8. **A screenshot at 360 pixels is evidence no automated check produces.** TURN
   TABLE's stress test is exactly compact rendering and touch parity, so the
   manual check matters more here than usual.

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

1. Reading order
2. Where the project stands, with the measured green baseline
3. Preconditions the owner was asked to complete
4. The task: goal, approved decisions, deliverables, size, open questions
5. The map from the phase's requirements to what already exists
6. Where everything is
7. How to work in this environment
8. Rules that bind every conversation
9. Keeping this file

History does not belong here. The detailed record of what a phase did lives in
ARCHITECTURE2.md section 56; this file only points at it.
