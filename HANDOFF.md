# HANDOFF

The note passed from one conversation to the next. It says where the project
stands, what this conversation must do, what must not be done, and where every
file this conversation needs lives. It is rewritten at the end of every phase
and it describes exactly one conversation: the next one.

| Field | Value |
|---|---|
| Written | 2026-09-17, at the end of charter Phase 13's ROTATE LOCK build |
| For the conversation | **Charter Phase 13: DIFFERENCE RELAY**, preceded by the three ROTATE LOCK engine corrections |
| Phase scheme | Charter phases, Section 9 of the project instructions, with PHASE-13-PLAN.md as amended by ARCHITECTURE2.md. The v3 migration phases are complete |
| Before any work | Check section 3, then ask section 4's open questions |
| Next after this | The sixth game, in its own conversation |

---

## 1. Reading order

Read these before doing anything, in this order, and nothing else unless a
section below names it.

1. **HANDOFF.md**, this file.
2. **ARCHITECTURE2.md**. Section 56's last entry, "Charter Phase 13, ROTATE
   LOCK", for the defect report the corrections come from. Then, for the game:
   section 3 (the contract), 9 to 18 (difficulty, verification, decomposition and
   symmetry, telemetry, share grammar, leak checks, artifact, fingerprint),
   section 21 (the ORDER adapter), 27 and 35 (the ordering game family), 44 (the
   authoring contract), 45 (the gate), 46's DIFFERENCE RELAY note and 54.
3. **ARCHITECTURE.md**. Presentation decisions, Contract decisions, Template
   decisions, the Build model, Suite decisions and the File manifest.
4. **BACKLOG.md**, most of all "Logged in charter Phase 13, ROTATE LOCK".

Then **NEW_GAME.md**, the procedure, and **ROTATE-LOCK.md**, the worked example
of a v3 design document and the only game authored through that procedure.

Precedence: the working tree, then ARCHITECTURE2.md, then ARCHITECTURE.md, then
the project instructions. If this file disagrees with ARCHITECTURE2.md, this
file is stale; say so.

State in one line which phase this conversation is and wait for confirmation.

---

## 2. Where the project stands

**Suite.** Eight games in `src/shell/registry.ts`. Three live: POKER GRID,
VECTOR, CIPHER. ROTATE LOCK built and `planned`, waiting on its manual mobile
check. Four planned and unbuilt: DIFFERENCE RELAY, TURN TABLE, RING BALANCE,
ORDER OF OPERATIONS.

**ROTATE LOCK, charter Phase 13, done 2026-09-17.** Nine source files, three
tools, a verified 365 day horizon, a calibration study, seven test files and a
plan row, built with zero engine changes. Its defect report is the input to this
conversation's first task.

**Green baseline to regress against,** measured 2026-09-17:

| Gate | Result |
|---|---|
| Typecheck | `tsconfig.json`, `tsconfig.tools.json`, `tsconfig.sw.json` |
| Dependency check | layers verified |
| Tests | 69 files, 909 tests |
| Verifiers | POKER GRID, CIPHER, VECTOR (about 100 s), ROTATE LOCK (about 53 s), 365 days each |
| Production build | `engine-v2.js`, 30,262 bytes |
| Byte budget | Hub 17.6, POKER GRID 27.8, CIPHER 25.7, VECTOR 28.0, About 3.4 KB gzipped; ROTATE LOCK 28.3 in a certification build |
| Certification | `npm run certify -- --check`: three games production safe, every committed record unchanged |

---

## 3. Preconditions to check first

1. **The ROTATE LOCK branch is merged into main and CI passed on it.** The branch
   is `charter-phase-13-rotate-lock`. It carries the `.github` changes, applied
   by the owner from `phase13-github.patch`, so CI runs `rotate-lock:verify`.
2. **Whether the owner has run MANUAL-CHECKS.md for ROTATE LOCK.** If yes, the
   first work of this conversation is to record it as a `manual` step in
   `GAME_PLANS["rotate-lock"]`, flip the registry row to `live`, run
   `npm run certify`, and commit `data/rotate-lock/certification.json`. If no, it
   stays planned and nothing here depends on it.
3. **The baseline in section 2 still holds.** Run it before changing anything, so
   a later failure is attributable.

---

## 4. The task

Two pieces, in this order, because requirement 7.4 puts the corrections after
the report and before the next game is built.

### 4.1 The three ROTATE LOCK corrections

Each one is an engine change and none of them may be made while a game is being
built, which is why they come first. After each, rebuild and re-run the gates in
section 2 for every game.

1. **No game renders its own accent.** `applyAccent` in `src/ui/theme.ts` sets
   `--dk-accent-hue` on the game root, but `--dk-accent` and `--dk-focus` are
   declared on `:root` in `src/ui/chrome.css`, where `var()` resolves against the
   root's hue, 210, so all four games draw the same blue. Redeclare the accent
   derived colours, in every theme and contrast layer, on the element that
   receives the hue. This is a live defect in the three shipped games.
   **The offline smoke and a 360 pixel screenshot of every game are owed after
   it**, because nothing automated sees a colour.
2. **The header truncates a display name at 360 pixels.** ROTATE LOCK reads
   "ROTATE ..." beside the four chrome icons, and DIFFERENCE RELAY is longer.
3. **No ORDER list cursor in the presentation kit.** ARCHITECTURE2 section 21
   names the ORDER adapter as reusable and `src/ui/` has none, so CIPHER and
   ROTATE LOCK each wrote their own list keyboard model. Build
   `src/ui/listCursor.ts` with focus, select, swap and a declared pass through
   verb, retrofit ROTATE LOCK's tray onto it, and keep CIPHER's behaviour
   identical whether or not it adopts it. **Doing this now is what lets
   DIFFERENCE RELAY, an ORDER game, consume it without an engine change during
   its build.**

Record the corrections in ARCHITECTURE2.md section 56 under the ROTATE LOCK
entry, as the phases before this one did.

### 4.2 DIFFERENCE RELAY, game five of eight

Then the game, through NEW_GAME.md, under requirement 7.4's zero engine changes
rule, ending in a defect report.

**Why this game next.** PHASE-13-PLAN.md section 1.1 put it first of the five as
the test of the v3 authoring path; ROTATE LOCK took that role instead, by the
owner's decision of 2026-09-17, so DIFFERENCE RELAY is now the first ordering
game and the first consumer of the list cursor. Its id, path, epoch and hue are
fixed in `src/shell/registry.ts`: `difference-relay`, `/difference-relay/`,
2026-01-05, hue 68. Its `bucketCount`, `hasWinLoss`, `stateVersion` and one line
rule in that row are provisional and are corrected in the change that builds it,
the way ROTATE LOCK's were.

**What the documents already settle**, ARCHITECTURE2 sections 27, 35 and 46:

| Piece | What is named |
|---|---|
| Concept | Order numbers under adjacent difference constraints |
| Input | The ORDER adapter |
| Verification | 6! permutation enumeration plus deduction. Exhaustive, so uniqueness is EXACT and nothing is a beam |
| Difficulty | Forced depth |
| Share | Attempt ladder or composite |
| Telemetry | Action chronology plus a fingerprint |
| Family risk, section 35 | Symmetric score surfaces and brute force feeling difficulty |

**The stress test, and the real work of this game:** whether **deduction fairness
can be kept stricter than mere uniqueness**. A board with one solution that a
human can only reach by guessing satisfies uniqueness and fails fairness.
DIFFERENCE RELAY is where that distinction gets a mechanical definition: a
declared deduction model, a solver that applies only that model's rules, and a
screen that rejects a board the model cannot finish without a guess. ROTATE LOCK
deliberately did not claim this, ROTATE-LOCK.md 10.5, so there is no precedent in
the tree to copy. Settle it in the design document before any code.

**Deliverables**, NEW_GAME.md section 2: `DIFFERENCE-RELAY.md` answering all 28
items of section 44, then rules, generator plus two tools plus the manifest,
module, leak probes with positive controls, renderer, plan row, and the defect
report.

### 4.3 Open questions for the owner, ask before code

1. **One conversation or two.** The corrections and the game are two phases by
   the one phase per conversation rule. Doing 4.1 and stopping is the rule as
   written; doing both in one conversation is what the owner asked for on
   2026-09-17. Confirm which.
2. **Defect 2:** wrap the header title to two lines, or step the size down past a
   length?
3. **Defect 3:** does CIPHER adopt the list cursor in this change, or does it
   keep its own model until it is touched for another reason?
4. **ROTATE LOCK going live**, section 3.2.

**Size.** The design document and the game are each well over 300 lines. Per the
efficiency protocol, say what is about to be produced in one line and wait.

---

## 5. The requirements mapped to what exists

| Requirement | Exists today as | Notes |
|---|---|---|
| Accent and chrome | `src/ui/theme.ts`, `src/ui/chrome.css`, `src/ui/header.ts` | Corrections 1 and 2 |
| List input | `src/games/rotate-lock/render.ts` tray, `src/games/cipher/render.ts` keys | The two models correction 3 generalises |
| Scaffold | `tools/new-game.ts`, `tests/tools/new-game.test.ts` | `npm run new-game -- --id difference-relay` adopts the planned row, template decision 10 |
| Procedure | NEW_GAME.md | Sections 2, 3, 6 and 12 |
| Worked v3 game | `src/games/rotate-lock/`, `ROTATE-LOCK.md` | Nine files, three tools, seven test files |
| Exhaustive enumeration precedent | `src/games/rotate-lock/solver.ts`, `tools/rotate-lock-verify.ts` | Two independent searches, one in the browser and one in CI |
| Gate plan | `newGamePlan` and `GAME_PLANS` in `tools/certify.ts` | Override a step's key after the spread; ROTATE LOCK's row is the worked example |
| Exemptions | `GATE_EXEMPTIONS` in `src/engine/certification.ts` | None covers a new game, and none is to be added |
| CI | `.github/workflows/ci.yml` | A live game's verifier must run before the certify step. The bridge cannot write `.github`; deliver a patch |

---

## 6. Where everything is

| File | What it is |
|---|---|
| HANDOFF.md | This file |
| ARCHITECTURE2.md | Active architecture, v3 contract, gate, concept notes, migration and phase log |
| ARCHITECTURE.md | The v2 record, the file manifest, every settled decision |
| BACKLOG.md | Everything deliberately not built |
| NEW_GAME.md | The authoring procedure |
| ROTATE-LOCK.md | The first v3 design document |
| PHASE-13-PLAN.md | The five games. Its build order is superseded for ROTATE LOCK only |
| MANUAL-CHECKS.md | The device checklist, never run |
| src/games/rotate-lock/, tools/rotate-lock-*.ts, data/rotate-lock/ | The newest game |

---

## 7. How to work in this environment

1. **The workspace shell cannot mount the repository**, a Windows update of
   2026-09-08: `device_bash` fails with "no Plan9 drive shares mounted". Read and
   write the owner's tree with `device_list_dir`, `device_stage_files` and
   `device_commit_files`. List `src`, `tests`, `tools` and `data` separately; a
   recursive listing of the root overflows on `node_modules`.
2. **Run the real gates in the cloud container.** A clone of GitHub `main` is the
   fastest start when the owner's tree matches it: check
   `.git/refs/heads/main` by staging it. Then `npm ci` and every gate in
   section 2.
3. **Pushing from the container is refused** unless the repository is in the
   session's authorised sources. Otherwise write the files into the owner's tree
   and hand them the commit and push commands.
4. **The bridge cannot write under `.github` and cannot delete.** Deliver those
   changes as a patch file in the repository root, as `phase13-github.patch` did,
   and tell the owner to `git apply` and delete it.
5. **Pass `expectedMtimeMs`** from staging for every file already in the tree, so
   a newer edit by the owner is never overwritten. Compare a staged file's git
   hash against the commit before overwriting it.
6. **`npm run certify` needs git** and must be started through npm. The
   container's commits are not the owner's, so set `certifiedCommit` to the
   owner's HEAD afterwards.
7. **Headless Chromium** is at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
   and the global Playwright package drives it against `vite preview`. Visit each
   page twice so the smoke passes the practice board, then set the context
   offline and revisit. Stop the server with `fuser -k 4173/tcp`.
8. **A planned game cannot enter a release build.** To smoke or budget one, patch
   the target list in a throwaway copy of the tree, never in the tree itself.
9. **A screenshot at 360 pixels is evidence no automated check produces.** Both
   of ROTATE LOCK's first two defects were invisible to every gate and visible in
   one screenshot.
10. **Project copies of the documents go stale.** After a phase, write
    ARCHITECTURE2.md, ARCHITECTURE.md, BACKLOG.md and HANDOFF.md back to the
    project as well as the repository.

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