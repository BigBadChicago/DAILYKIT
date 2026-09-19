# HANDOFF

The note passed from one conversation to the next. It says where the project
stands, what this conversation must do, what must not be done, and where every
file this conversation needs lives. It is rewritten at the end of every phase
and it describes exactly one conversation: the next one.

| Field | Value |
|---|---|
| Written | 2026-09-19, at the slate amendment that made four word games the next four |
| For the conversation | **Charter Phase 13: LETTER TRAIL**, game six of twelve |
| Phase scheme | Charter phases, Section 9 of the project instructions, with PHASE-13-PLAN.md as amended by ARCHITECTURE2.md. The v3 migration phases are complete |
| Before any work | Check section 3, then settle section 4's open design decisions in the design document first |
| Next after this | WORD LADDER, PANGRAM, FIVE LETTERS, then TURN TABLE, RING BALANCE, ORDER OF OPERATIONS, each in its own conversation |

---

## 1. Reading order

Read these before doing anything, in this order, and nothing else unless a
section below names it.

1. **HANDOFF.md**, this file.
2. **ARCHITECTURE2.md**. The last two section 56 entries, "Charter Phase 13,
   DIFFERENCE RELAY" and "Slate amendment: four word games", then section 3 (the
   contract), 9 to 18 (difficulty, verification, decomposition and symmetry,
   telemetry, share grammar, leak checks, artifact, fingerprint), section 21
   (input families), 35's word graph family, the section 46 LETTER TRAIL note, 44
   (the authoring contract) and 45 (the gate).
3. **ARCHITECTURE.md**. Presentation decisions, Contract decisions, Template
   decisions, the Build model, Suite decisions and the File manifest.
4. **BACKLOG.md**, most of all "Logged at the slate amendment, four word games"
   and the DIFFERENCE RELAY section.

Then **NEW_GAME.md**, the procedure, and both **ROTATE-LOCK.md** and
**DIFFERENCE-RELAY.md**, the two worked v3 design documents.

Precedence: the working tree, then ARCHITECTURE2.md, then ARCHITECTURE.md, then
the project instructions. The project instructions' Section 0 still says eight
games; the architecture documents amend it to twelve. If this file disagrees with
ARCHITECTURE2.md, this file is stale; say so.

State in one line which phase this conversation is and wait for confirmation.

---

## 2. Where the project stands

**Suite.** Twelve games in `src/shell/registry.ts`, in this order: POKER GRID,
VECTOR, CIPHER (live); ROTATE LOCK, DIFFERENCE RELAY (built, planned, each
waiting on its manual mobile check); LETTER TRAIL, WORD LADDER, PANGRAM, FIVE
LETTERS (planned, the next four in build order); TURN TABLE, RING BALANCE, ORDER
OF OPERATIONS (planned, deferred behind the word games).

**The slate amendment is done, 2026-09-19.** Four planned registry rows, the
daily card row width moved from eight to six so twelve games make two even rows,
and the tests and documents that name the slate. ARCHITECTURE2.md section 56 has
the record.

**Green baseline to regress against,** measured 2026-09-19 on a clone of
`origin/main` plus the amendment:

| Gate | Result |
|---|---|
| Typecheck | `tsconfig.json`, `tsconfig.tools.json`, `tsconfig.sw.json` |
| Dependency check | layers verified |
| Tests | 75 files, 983 tests |
| Verifiers | POKER GRID, CIPHER, VECTOR, ROTATE LOCK, DIFFERENCE RELAY, each 365 days |
| Production build | `engine-v2.js` about 30.4 KB |
| Byte budget | Hub 18.1, POKER GRID 28.3, CIPHER 26.2, VECTOR 28.5, About 3.5 KB gzipped |
| Certification | `npm run certify -- --check`: three live games production safe |

---

## 3. Preconditions to check first

1. **The slate amendment is on `origin/main`.** It was delivered as a patch;
   confirm `src/shell/registry.ts` has the `letter-trail` row before building.
2. **Whether the owner has run the manual checks for ROTATE LOCK or DIFFERENCE
   RELAY.** For each that is done, record the `manual` steps, flip the registry
   row to `live`, move `ENGINE_VERSION` to 3 on the first live game that imports
   the list cursor, run `npm run certify`, and commit that game's
   `certification.json`. If neither is done, both stay planned.
3. **Whether the accent contrast correction from the 2026-09-19 review was
   approved.** It is an engine change and cannot happen inside LETTER TRAIL under
   the zero engine changes rule. If it is approved and not yet done, it goes
   first, in its own conversation.
4. **The baseline in section 2 still holds.** Run it before changing anything.

---

## 4. The task: LETTER TRAIL, game six of twelve

Through NEW_GAME.md, under requirement 7.4's zero engine changes rule, ending in
a defect report. Its id, path, epoch and hue are fixed in `src/shell/registry.ts`:
`letter-trail`, `/letter-trail/`, 2026-01-05, hue 48. Its `bucketCount`,
`hasWinLoss`, `stateVersion` and one line rule are provisional and are corrected
in the change that builds it. The scaffold adopts the planned row, checked
2026-09-19: `npm run new-game -- --id letter-trail`.

**The concept, as the owner chose it:** a grid of letters that hides a set of
themed or unthemed words, found by tracing chains of touching letters, with every
letter used exactly once, and one word that spans the board. The genre name
belongs to another product; this game does not use it, and its layout must not
copy that product's trade dress.

**What the documents already settle**, ARCHITECTURE2 sections 35 and 46:

| Piece | What is named |
|---|---|
| Input | GRID adapter, path selection under eight way adjacency |
| Verification | Exact placement search over the answer list; the full cover must be unique |
| Difficulty | Extraneous word count and placement ambiguity, one emergent integer |
| Share | Found order token rows, no letters, no positions |
| Family, section 35 | Word graph games, risk translation debt and vocabulary fairness |

### 4.1 The open design decisions, settle them in the design document first

1. **No daily editor.** A theme in the source genre is written by a person every
   day, which the zero daily content cost rule forbids. Either the game is
   unthemed, or themes come from a one time curated set of word groups whose
   generator recombines them. Say which, and prove the second does not repeat a
   board within the manifest horizon.
2. **The word list.** Name the answer list and the validation list, their
   license, their size gzipped against the per game budget, and how offensive
   and obscure words are removed once. Record it for ASSETS.md.
3. **Board shape at 360 pixels.** Grid dimensions, letter size and the 44 pixel
   floor for a cell that is also a path node, and how a drag path is drawn and
   announced.
4. **Touch and keyboard path building on `src/ui/gridCursor.ts`.** Whether the
   grid cursor can build a path without an engine change. If it cannot, that is
   the defect this game exists to find.
5. **Failure model and hints.** Whether the game can be lost, how non answer
   words found along the way count, and whether they buy hints.
6. **Difficulty as a countable integer with seven band resolution.** The
   DIFFERENCE RELAY lesson is that a measure with too few distinct values
   collapses a band.

### 4.2 Deliverables

NEW_GAME.md section 2: `LETTER-TRAIL.md` answering all 28 items of ARCHITECTURE2
section 44, then rules, generator plus two tools plus the 365 day manifest,
module, leak probes with positive controls, renderer, the plan row in
`tools/certify.ts`, the CI verify step, and the defect report.

**Size.** The design document and the game are each well over 300 lines. Per the
efficiency protocol, say what is about to be produced in one line and wait.

---

## 5. The requirements mapped to what exists

| Requirement | Exists today as | Notes |
|---|---|---|
| Grid input | `src/ui/gridCursor.ts` | Cell selection; path building is the open question |
| Guess and feedback loop | `src/games/cipher/` | Slot entry and keyboard handling, useful for FIVE LETTERS later |
| Exact search precedent | `src/games/difference-relay/solver.ts`, `src/games/rotate-lock/solver.ts` | Uniqueness proofs with independent verifiers |
| Scaffold | `tools/new-game.ts` | Adopts the planned row |
| Procedure | NEW_GAME.md | Sections 2, 3, 6 and 12 |
| Manifest codec | `src/engine/manifest-codec.ts` via a per game codec | Light obfuscation of the answer words |
| Gate plan | `newGamePlan` and `GAME_PLANS` in `tools/certify.ts` | DIFFERENCE RELAY's row is the newest worked example |
| Word list | Nothing yet | The first asset of its kind; ASSETS.md row required |
| CI | `.github/workflows/ci.yml` | A verifier step per game, delivered inside the patch |

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
| PHASE-13-PLAN.md | Its build order is superseded by the note at its top |
| MANUAL-CHECKS.md | The device checklist, still to be run for ROTATE LOCK and DIFFERENCE RELAY |
| src/ui/listCursor.ts, src/ui/gridCursor.ts | The two input adapters |
| src/shell/registry.ts | The twelve game slate |

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
8. **A screenshot at 360 pixels is evidence no automated check produces.** A
   letter grid is the densest board in the suite, so measure it in the page at
   360 pixels rather than trusting the stylesheet.

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
