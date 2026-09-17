# HANDOFF

The note passed from one conversation to the next. It says where the project
stands, what this conversation must do, what must not be done, and where every
file this conversation needs lives. It is rewritten at the end of every phase
and it describes exactly one conversation: the next one.

| Field | Value |
|---|---|
| Written | 2026-09-17, at the end of charter Phase 13's ROTATE LOCK build |
| For the conversation | **Charter Phase 13: the ROTATE LOCK engine corrections**, requirement 7.4's correction step |
| Phase scheme | Charter phases, Section 9 of the project instructions, with PHASE-13-PLAN.md as amended by ARCHITECTURE2.md. The v3 migration phases are complete |
| Before any work | Check section 3, then ask section 4's open questions |
| Next after this | The second new game, in its own conversation |

---

## 1. Reading order

1. **HANDOFF.md**, this file.
2. **ARCHITECTURE2.md**. For this phase: section 56's last entry, "Charter Phase
   13, ROTATE LOCK", above all its defect report; sections 21, 22 and 45.
3. **ARCHITECTURE.md**. Presentation decisions, the Suite decisions, template
   decision 10 and the File manifest.
4. **BACKLOG.md**, "Logged in charter Phase 13, ROTATE LOCK".

Then **ROTATE-LOCK.md** sections 5 and 13, and **MANUAL-CHECKS.md**.

Precedence: the working tree, then ARCHITECTURE2.md, then ARCHITECTURE.md, then
the project instructions. If this file disagrees with ARCHITECTURE2.md, this
file is stale; say so.

State in one line which phase this conversation is and wait for confirmation.

---

## 2. Where the project stands

**Suite.** Eight games in `src/shell/registry.ts`. Three live: POKER GRID, VECTOR,
CIPHER. ROTATE LOCK built and planned. Four planned and unbuilt: DIFFERENCE
RELAY, TURN TABLE, RING BALANCE, ORDER OF OPERATIONS.

**ROTATE LOCK.** Rules, route solver, generator, 365 day manifest, calibration
study, independent verifier, v3 module, telemetry with four leak probes and
positive controls, renderer, help, seven test files, plan row. Every automated
gate probe passes with the row set live in a copy of the tree; the gate refuses
it on `manual-mobile-check` alone, so the row stays planned. Offline smoke is
recorded in its plan.

**Scaffold.** `npm run new-game -- --id <id>` adopts a planned registry row,
template decision 10.

**Green baseline to regress against**, 2026-09-17:

| Gate | Result |
|---|---|
| Typecheck | `tsconfig.json`, `tsconfig.tools.json`, `tsconfig.sw.json` |
| Dependency check | layers verified |
| Tests | 69 files, 909 tests |
| Verifiers | POKER GRID, CIPHER, VECTOR (about 100 s), ROTATE LOCK (about 53 s), 365 each |
| Production build | `engine-v2.js`, 30,262 bytes |
| Byte budget | Hub 17.6, POKER GRID 27.8, CIPHER 25.7, VECTOR 28.0, About 3.4 KB; ROTATE LOCK 28.3 in a certification build |
| Certification | `npm run certify -- --check`: three games production safe, records unchanged |

---

## 3. Preconditions to check first

1. **The ROTATE LOCK change set is in the owner's tree and committed**, with a
   CI run that passed. It includes `.github/workflows/ci.yml` and
   `.github/instructions/tools-and-build.instructions.md`, which the bridge
   cannot write; confirm both.
2. **Whether the owner has run MANUAL-CHECKS.md for ROTATE LOCK.** If yes, the
   first work is recording it as a `manual` step in `GAME_PLANS["rotate-lock"]`,
   flipping the registry row to `live`, running `npm run certify` and committing
   `data/rotate-lock/certification.json`. If no, it stays planned; the
   corrections below do not depend on it.

---

## 4. The task: correct the engine for the ROTATE LOCK defects

Requirement 7.4: the report comes first and the corrections after, and every
existing game is rebuilt against them before the next game starts. The three
defects, ARCHITECTURE2.md section 56:

1. **No game renders its accent.** `--dk-accent` resolves at `:root` against hue
   210. Redeclare the accent colours where `applyAccent` writes the hue. Affects
   all four games; re-run the offline smoke and screenshot each at 360 pixels.
2. **The header truncates long names at 360 pixels.**
3. **An ORDER list cursor in `src/ui/`**, adopted by ROTATE LOCK's tray and, if
   it fits without a behavior change, CIPHER's keys.

Then close the registry test's two loops into one, BACKLOG.md.

**Open questions for the owner, ask before code.**

1. For defect 2: wrap the title to two lines, or shrink it past a length?
2. For defect 3: build the list cursor now with ROTATE LOCK as its only consumer,
   or defer it to the next ORDER game as its second consumer?
3. Which game is second: the plan's order says DIFFERENCE RELAY.

**Size.** Defect 1 is small; defect 3 is the largest. State what is about to be
produced in one line before anything over about 300 lines.

---

## 5. The requirements mapped to what exists

| Requirement | Exists today as |
|---|---|
| Accent | `src/ui/theme.ts` `applyAccent`, `src/ui/chrome.css` |
| Header | `src/ui/header.ts`, `src/ui/chrome.css` |
| ORDER input | `src/games/rotate-lock/render.ts` tray, `src/games/cipher/render.ts` keys, `src/ui/gridCursor.ts` as the grid precedent |
| Accessibility evidence | `tests/games/*/render.test.ts`, `tests/ui/a11y.test.ts` |
| Gate | `tools/certify.ts` `GAME_PLANS`, `src/engine/certification.ts` |

---

## 6. Where everything is

| File | What it is |
|---|---|
| ROTATE-LOCK.md | The first v3 design document, all 28 items of section 44 |
| NEW_GAME.md | The authoring procedure, with adoption |
| PHASE-13-PLAN.md | The five games; its order predates the ROTATE LOCK first decision |
| MANUAL-CHECKS.md | The device checklist, never run |
| src/games/rotate-lock/ | The newest game and the reference for a custom input tray |
| tools/rotate-lock-*.ts | Generate, verify, calibrate |
| data/rotate-lock/ | Manifest and study; no certification record yet |

---

## 7. How to work in this environment

1. The workspace shell may not mount the repository; read and write the owner's
   tree with `device_list_dir`, `device_stage_files` and `device_commit_files`,
   or work in a clone of GitHub `main` in the cloud container when the owner's
   tree matches it.
2. Run the real gates in the cloud container: `npm ci`, then every gate in
   section 2.
3. `npm run certify` needs git and must be started through npm; set
   `certifiedCommit` to the owner's HEAD after certifying.
4. Pass `expectedMtimeMs` when committing back. The bridge cannot write under
   `.github` or delete; deliver those as a patch and a list.
5. Headless Chromium is at `/opt/pw-browsers/chromium-1194`; the global
   Playwright package drives it against `vite preview`. Visit each game twice so
   the smoke passes the practice board. Stop the server with `fuser -k 4173/tcp`.
6. A planned game cannot enter a release build. To smoke one, patch the target
   list in a throwaway copy, never in the tree.
7. A screenshot at 360 pixels is evidence the automated checks do not produce;
   both defects 1 and 2 were found only that way.
8. After a phase, write ARCHITECTURE2.md, ARCHITECTURE.md, BACKLOG.md and
   HANDOFF.md back to the project as well as the repo.

---

## 8. Rules that bind every conversation

1. One phase per conversation. When it completes, rewrite this file for the next
   one and tell the owner to open a new conversation.
2. Name the phase scheme every time: charter Phase N or v3 migration phase N.
3. No dashes as punctuation in prose, comments, commit messages or documents.
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
numbers:

1. Reading order
2. Where the project stands, with the measured green baseline
3. Preconditions the owner was asked to complete
4. The task: goal, approved decisions, open questions, size
5. The map from the phase's requirements to what already exists
6. Where everything is
7. How to work in this environment
8. Rules that bind every conversation
9. Keeping this file

History does not belong here. The record of what a phase did lives in
ARCHITECTURE2.md section 56.
