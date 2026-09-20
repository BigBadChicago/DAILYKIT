# HANDOFF

The note passed from one conversation to the next. It says where the project
stands, what this conversation must do, what must not be done, and where every
file this conversation needs lives. It is rewritten at the end of every phase
and it describes exactly one conversation: the next one.

| Field | Value |
|---|---|
| Written | 2026-09-19, after the LETTER TRAIL design document and its amendments were delivered, before the game is built |
| Built on | Base commit `3b3b6605cd68c45b252510c16c7a322441ce0504` ("Merge pull request #7 from BigBadChicago/claude/delivery-pipeline"), branch `claude/letter-trail-design`, commit subject "LETTER TRAIL design document and amendments" |
| For the conversation | **Charter Phase 13: LETTER TRAIL build**, game six of twelve |
| Phase scheme | Charter phases, Section 9 of the project instructions, with LETTER-TRAIL.md as the settled design. The v3 migration phases are complete |
| Before any work | Read LETTER-TRAIL.md in full; the design is settled and is not reopened. Then scaffold and build through NEW_GAME.md |
| Next after this | WORD LADDER, PANGRAM, FIVE LETTERS, then TURN TABLE, RING BALANCE, ORDER OF OPERATIONS, each in its own conversation |

---

## 1. Reading order

First, clone `main` into the container; section 7 item 1 has the commands and
the merge check. The project file copies are not the code and may be stale.

Then read these before doing anything, in this order, and nothing else unless a
section below names it.

1. **HANDOFF.md**, this file.
2. **LETTER-TRAIL.md**. The settled design document for the game being built. It
   answers every section 44 item, settles the six handoff 4.1 decisions, and in
   section 0 records why the section 46 full cover uniqueness claim was abandoned.
   The design is not reopened; the build implements it and calibrates the one open
   number, the difficulty measure of its section 14.
3. **ARCHITECTURE2.md**. The section 56 entry "Charter Phase 13, LETTER TRAIL
   design", the amended section 46 LETTER TRAIL note, then section 3 (the contract),
   9 to 18 (difficulty, verification, decomposition and symmetry, telemetry, share
   grammar, leak checks, artifact, fingerprint), section 21 (input families),
   section 35's word graph family, 44 (the authoring contract) and 45 (the gate).
4. **ARCHITECTURE.md**. Presentation decisions, Contract decisions, Template
   decisions, the Build model, Suite decisions and the File manifest.
5. **BACKLOG.md**, most of all "Logged at the slate amendment, four word games"
   and the DIFFERENCE RELAY section.

Then **NEW_GAME.md**, the procedure, and both **ROTATE-LOCK.md** and
**DIFFERENCE-RELAY.md**, the two worked v3 design documents, as build references.

Precedence: the working tree, then ARCHITECTURE2.md, then ARCHITECTURE.md, then
the project instructions. The project instructions' Section 0 still says eight
games; the architecture documents amend it to twelve. If this file disagrees with
ARCHITECTURE2.md, this file is stale; say so.

State in one line which phase this conversation is and wait for confirmation,
unless the owner has already waived confirmation for the run.

---

## 2. Where the project stands

**Suite.** Twelve games in `src/shell/registry.ts`, in this order: POKER GRID,
VECTOR, CIPHER (live); ROTATE LOCK, DIFFERENCE RELAY (built, planned, each waiting
on its manual mobile check); LETTER TRAIL, WORD LADDER, PANGRAM, FIVE LETTERS
(planned, the next four in build order); TURN TABLE, RING BALANCE, ORDER OF
OPERATIONS (planned, deferred behind the word games).

**The LETTER TRAIL design is settled, 2026-09-19,** and delivered as a documents
only patch: LETTER-TRAIL.md, six ASSETS.md rows, the section 46 amendment and the
section 56 entry. No game code, no registry edit, no tests were written; the build
is this conversation. ARCHITECTURE2.md section 56 "Charter Phase 13, LETTER TRAIL
design" has the record and the finding.

**Key settled facts the build implements** (from LETTER-TRAIL.md, do not
relitigate): themed known word sets, not a unique full cover; the answer list is
ENABLE intersected with wordfreq top 30000, both commercial safe, offline only, no
runtime validation list; a reviewed stop list is subtracted at curation; board is 6
by 5, seven words including a span; span uniqueness is the fairness claim; no win or
loss, bucket count 8; the one line rule and bucket count are corrected on the
registry row during the build. The difficulty measure, decoy word count, is a
hypothesis the build must recalibrate on themed boards, with span length plus theme
breadth as the named fallback if a band collapses.

**Green baseline to regress against,** measured 2026-09-19 on a clone of
`origin/main` (the documents only patch does not change it, because it touches no
code):

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

1. **The design patch was merged.** The base commit in the header is in `main`'s
   history and a commit with the header's subject follows it (section 7 item 1). If
   not, the branch `claude/letter-trail-design` was never merged: stop and say so.
   LETTER-TRAIL.md, the six ASSETS.md rows, the section 46 amendment and the section
   56 design entry must all be present.
2. **Whether the owner has run the manual checks for ROTATE LOCK or DIFFERENCE
   RELAY.** For each that is done, record the `manual` steps, flip the registry row
   to `live`, move `ENGINE_VERSION` to 3 on the first live game that imports the list
   cursor, run `npm run certify`, and commit that game's `certification.json`. If
   neither is done, both stay planned and are left untouched.
3. **Whether the accent contrast correction from the 2026-09-19 review was
   approved.** It is an engine change and cannot happen inside LETTER TRAIL under the
   zero engine changes rule. Hue 48 inherits the defect; the game ships on it as is
   and the correction is a separate conversation. This was left unanswered at the
   design phase; confirm before the build if it changes.
4. **The baseline in section 2 still holds.** Run it before changing anything.

---

## 4. The task: LETTER TRAIL build, game six of twelve

Build the game LETTER-TRAIL.md specifies, through NEW_GAME.md, under requirement
7.4's zero engine changes rule, ending in a defect report. Its id, path, epoch and
hue are fixed in `src/shell/registry.ts`: `letter-trail`, `/letter-trail/`,
2026-01-05, hue 48. The scaffold adopts the planned row:
`npm run new-game -- --id letter-trail`.

### 4.1 What the build corrects and calibrates

1. **Registry row.** Correct `bucketCount` 4 to 8 and tighten the one line rule to
   name the theme and the spanning word, in the same change that builds the game
   (the module test holds them together). `hasWinLoss: false` and `stateVersion: 1`
   stay.
2. **Difficulty calibration.** Decoy word count is a hypothesis. Recalibrate it on
   themed boards and confirm seven band resolution. If it collapses a band, switch
   to the section 14 fallback (span length plus theme breadth) and recalibrate. A
   collapsed band blocks certification.
3. **Themes.** Author the one time theme set (about 24 to 52 themes) and the stop
   list, as build inputs under `data/letter-trail/`, never served. The ASSETS.md
   rows already name them.
4. **The abstraction test.** Prove whether the grid cursor can build an eight
   adjacency path with no engine change (design section 5 anticipates yes but does
   not claim it). The defect report comes after the build.

### 4.2 Deliverables

NEW_GAME.md section 2: scaffold, rules with complete tests, generator plus two
tools plus the 365 day themed manifest, module, leak probes with positive controls,
renderer, the plan row in `tools/certify.ts`, the CI verify step, and the defect
report. The game ships planned; making it live is a later patch after its UAT.

**Size.** The game is well over 300 lines. Per the efficiency protocol, say what is
about to be produced in one line and wait, unless the owner has waived it.

---

## 5. The requirements mapped to what exists

| Requirement | Exists today as | Notes |
|---|---|---|
| Grid input | `src/ui/gridCursor.ts` | Cell cursor with onActivate; the renderer builds the path on top, design section 5 |
| Exact search precedent | `src/games/difference-relay/solver.ts`, `src/games/rotate-lock/solver.ts` | Uniqueness proofs with independent verifiers |
| Scaffold | `tools/new-game.ts` | Adopts the planned row |
| Procedure | NEW_GAME.md | Sections 2, 3, 6 and 12 |
| Manifest codec | `src/engine/manifest-codec.ts` via a per game codec | Light obfuscation of the answer words, paths and theme label |
| Gate plan | `newGamePlan` and `GAME_PLANS` in `tools/certify.ts` | DIFFERENCE RELAY's row is the newest worked example |
| Word list and themes | Named in ASSETS.md, not yet produced | ENABLE ∩ wordfreq, offline only; themes and stop list authored in the build |
| CI | `.github/workflows/ci.yml` | A verifier step per game, delivered inside the patch |

---

## 6. Where everything is

| File | What it is |
|---|---|
| HANDOFF.md | This file |
| LETTER-TRAIL.md | The settled LETTER TRAIL design document |
| ARCHITECTURE2.md | Active architecture, v3 contract, gate, concept notes, migration and phase log |
| ARCHITECTURE.md | The v2 record, the file manifest, every settled decision |
| ASSETS.md | Every shipped asset and, for LETTER TRAIL, the build time only word data rows |
| BACKLOG.md | Everything deliberately not built |
| NEW_GAME.md | The authoring procedure |
| ROTATE-LOCK.md, DIFFERENCE-RELAY.md | The two worked v3 design documents, build references |
| MANUAL-CHECKS.md | The device checklist, still to be run for ROTATE LOCK and DIFFERENCE RELAY |
| src/ui/listCursor.ts, src/ui/gridCursor.ts | The two input adapters |
| src/shell/registry.ts | The twelve game slate |
| tools/ship.ps1 | The owner's one command delivery: branch, apply, commit, push, pull request link |
| uat/ | The owner's UAT scripts per game and the UAT workbook |

---

## 7. How to work in this environment

All development, coding, generation and testing happen in the container. The owner
runs only the manual device checks, UAT and the one delivery command.

1. **Start from a fresh clone of `main`.** The repository is public and cloning
   needs no credentials:

   ```
   git clone -q https://github.com/BigBadChicago/DAILYKIT.git dk && cd dk
   git merge-base --is-ancestor <base commit from the header> HEAD && echo BASE_OK
   git log --format=%s <base commit>..HEAD | grep -Fx "<subject from the header>"
   npm ci
   ```

   Both checks must pass before any work. A commit id cannot be predicted for a
   delivery, because the owner's `git am` makes a new commit and GitHub may merge
   with another, so the handoff names the base and the subject rather than the
   delivered commit's id. `main` may also carry the owner's own commits after the
   base; that is normal.
2. **Work on a local branch named for the work,** for example
   `git switch -c claude/letter-trail`, from the commit the clone checked out.
   Record that commit's full id: it becomes the next handoff's base commit.
3. **Deliver when every automated gate is green,** never before: typecheck, the
   dependency check, all tests, every verifier, the build, the byte budget and
   `npm run certify -- --check`. Commit everything, including the rewritten
   HANDOFF.md, as one commit with a message that says what changed and why, then:

   ```
   git format-patch -1 --base=<recorded base commit> --stdout > /mnt/user-data/outputs/<n>.patch
   ```

   `<n>` is lowercase words joined by hyphens and becomes the branch `claude/<n>`.
   Present the patch and tell the owner to run, from the repository root:

   ```
   powershell -ExecutionPolicy Bypass -File tools\ship.ps1 <path to the patch>
   ```

   The script creates the branch from the base commit, applies and commits the
   patch, pushes the branch to origin and prints the pull request link. It refuses a
   dirty tree, a patch with no base commit, and a branch name already in use, and if
   the patch does not apply it restores the owner's checkout and pushes nothing. CI
   runs on the pull request, a second green run not produced here.
4. **Pushing from the container is not possible and is not attempted.** The
   container holds no credentials for the owner's GitHub account, and must not.
5. **New games ship planned.** The gate refuses a live game without its manual
   steps. After the owner's UAT passes, making the game live is its own small patch
   through the same pipeline.
6. **`npm run certify` needs git** and must be started through npm. Use
   `-- --check` to evaluate without rewriting records.
7. **`npm run <id>:calibrate`, `:generate`, `:verify`** run through npm.
   `node --import tsx tools/<file>.ts` runs a throwaway script.
8. **A planned game cannot enter a release build.** `npm run build:harness` builds
   every target including planned ones into `dist`, and is the way to render a new
   game at 360 pixels and measure its page. Never patch the target list in the tree.
9. **A screenshot at 360 pixels is evidence no automated check produces.** A letter
   grid is the densest board in the suite, so measure it in the page at 360 pixels
   rather than trusting the stylesheet.
10. **wordfreq is a build time only dependency.** It produces the answer list in the
    list preparation step and is never shipped in the browser. Installing it in the
    container is fine; it must not enter a release bundle.

---

## 8. Rules that bind every conversation

1. One phase per conversation. When it completes, rewrite this file for the next one
   and tell the owner to open a new conversation.
2. Name the phase scheme every time: charter Phase N or v3 migration phase N.
3. No dashes as punctuation in prose, comments, commit messages or documents.
   Hyphens inside compound words are fine.
4. No preamble, no recap, no alternatives unless asked. Batch questions at the end.
   End with a numbered list of decisions and the single next action.
5. Before producing more than about 300 lines, say what in one line and wait, unless
   the owner has waived it for the run.
6. Never reconstruct charter text that cannot be read. Ask.
7. The locked POKER GRID decisions are not restated, justified or reopened. The
   settled LETTER TRAIL design is likewise not reopened.
8. Anything outside the phase goes to BACKLOG.md with a one line rationale.
9. Every file added or repurposed is recorded in the architecture documents.
10. v3 telemetry is the player's own run log on device. Any proposal that sends it
    anywhere is refused.
11. The code comes from a fresh clone of GitHub `main`, never from the project file
    copies, and every delivery is one patch shipped through `tools/ship.ps1`
    (section 7). The rewritten HANDOFF.md travels inside that patch and names its
    base commit, branch and subject.

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
