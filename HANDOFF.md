# HANDOFF

The note passed from one conversation to the next. It says where the project
stands, what this conversation must do, what must not be done, and where every
file this conversation needs lives. It is rewritten at the end of every phase
and it describes exactly one conversation: the next one.

| Field | Value |
|---|---|
| Written | 2026-09-18, at the end of the three ROTATE LOCK corrections |
| For the conversation | **Charter Phase 13: DIFFERENCE RELAY**, game five of eight |
| Phase scheme | Charter phases, Section 9 of the project instructions, with PHASE-13-PLAN.md as amended by ARCHITECTURE2.md. The v3 migration phases are complete |
| Before any work | Check section 3, then settle section 4's one open design decision |
| Next after this | TURN TABLE, RING BALANCE, then ORDER OF OPERATIONS, each in its own conversation |

---

## 1. Reading order

Read these before doing anything, in this order, and nothing else unless a
section below names it.

1. **HANDOFF.md**, this file.
2. **ARCHITECTURE2.md**. The last two entries of section 56, "Charter Phase 13,
   ROTATE LOCK" and "Charter Phase 13, the three ROTATE LOCK corrections". Then
   section 3 (the contract), 9 to 18 (difficulty, verification, decomposition and
   symmetry, telemetry, share grammar, leak checks, artifact, fingerprint),
   section 21 (the ORDER adapter), 27 and 35 (the ordering game family), 44 (the
   authoring contract), 45 (the gate), 46's DIFFERENCE RELAY note and 54.
3. **ARCHITECTURE.md**. Presentation decisions, Contract decisions, Template
   decisions, the Build model, Suite decisions and the File manifest.
4. **BACKLOG.md**, most of all the two "Logged in charter Phase 13" sections.

Then **NEW_GAME.md**, the procedure, and **ROTATE-LOCK.md**, the worked example
of a v3 design document.

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

**The three ROTATE LOCK engine corrections are done, 2026-09-18.** The per game
accent renders, the header shows every display name in the slate whole at 360
pixels, and `src/ui/listCursor.ts` is the ORDER adapter with ROTATE LOCK's tray
retrofitted onto it. ARCHITECTURE2.md section 56 has the measurements. Nothing
is owed from that work except the two BACKLOG items it logged.

**Green baseline to regress against,** measured 2026-09-18:

| Gate | Result |
|---|---|
| Typecheck | `tsconfig.json`, `tsconfig.tools.json`, `tsconfig.sw.json` |
| Dependency check | layers verified |
| Tests | 72 files, 940 tests |
| Verifiers | POKER GRID 365 boards, CIPHER 365 days, VECTOR 365 puzzles, ROTATE LOCK 365 days in about 49 s |
| Production build | `engine-v2.js`, 30,412 bytes, 61 exports |
| Byte budget | Hub 17.8, POKER GRID 28.0, CIPHER 25.9, VECTOR 28.2, About 3.5 KB gzipped |
| Certification | `npm run certify -- --check`: three games production safe, every committed record unchanged |
| Offline smoke | Hub, POKER GRID, CIPHER and VECTOR from cache on a second visit past the practice board, no console error, 2026-09-18 |

---

## 3. Preconditions to check first

1. **The corrections are committed and CI passed.** They touch five source files
   and three test files and no `.github` file, so there is no patch to apply.
2. **Whether the owner has run MANUAL-CHECKS.md for ROTATE LOCK.** If yes, record
   it as a `manual` step in `GAME_PLANS["rotate-lock"]`, flip the registry row to
   `live`, move `ENGINE_VERSION` to 3 because that build is the first to ship a
   live game importing the list cursor, run `npm run certify`, and commit
   `data/rotate-lock/certification.json`. If no, it stays planned and nothing
   here depends on it.
3. **The baseline in section 2 still holds.** Run it before changing anything.

---

## 4. The task: DIFFERENCE RELAY, game five of eight

Through NEW_GAME.md, under requirement 7.4's zero engine changes rule, ending in
a defect report. Its id, path, epoch and hue are fixed in `src/shell/registry.ts`:
`difference-relay`, `/difference-relay/`, 2026-01-05, hue 68. Its `bucketCount`,
`hasWinLoss`, `stateVersion` and one line rule in that row are provisional and
are corrected in the change that builds it, the way ROTATE LOCK's were. The
scaffold adopts the planned row, template decision 10:
`npm run new-game -- --id difference-relay`.

**What the documents already settle**, ARCHITECTURE2 sections 27, 35 and 46:

| Piece | What is named |
|---|---|
| Concept | Order numbers under adjacent difference constraints |
| Input | The ORDER adapter, which now exists as `src/ui/listCursor.ts` |
| Verification | Permutation enumeration plus deduction. Exhaustive, so uniqueness is EXACT and nothing is a beam |
| Difficulty | Forced depth |
| Share | Attempt ladder or composite |
| Telemetry | Action chronology plus a fingerprint |
| Family risk, section 35 | Symmetric score surfaces and brute force feeling difficulty |

### 4.1 The one open design decision, settle it in the design document first

**The stress test is whether deduction fairness can be kept stricter than mere
uniqueness**, and it turns on a choice the documents do not make: **is the board
perfect information or not.** The two are not interchangeable and the whole game
follows from the answer.

- **Perfect information.** Every tile value and every mark is visible, exactly
  one ordering satisfies them, and the declared deduction model reaches it
  without a guess. Then a careful player always finishes on the first
  submission, so an attempt ladder has no distribution and the failure model has
  to be a continuum, which is ROTATE LOCK's shape again: a move count against an
  exact par. Distinct in substrate, not in scoring feel.
- **Imperfect information.** Some marks are hidden. The hidden marks are real
  constraints the player cannot read, and the only way to learn about them is to
  commit an ordering and see how far the relay gets before a gap fails. Then the
  attempt ladder that section 46 names is real, `hasWinLoss` is true as the
  registry already says, and **deduction fairness has a mechanical definition
  worth writing**: the declared model, given the visible marks plus the prefix
  feedback from every previous relay, must reach the unique ordering inside the
  attempt budget without ever guessing, and a board where it cannot is rejected
  by a screen. That is strictly stronger than uniqueness and is the thing this
  game exists to prove.

Recommended: **imperfect information**, because it is the only one of the two
where the stress test has any content, and because it is what makes the attempt
ladder of section 46 and the registry's `hasWinLoss: true` consistent. The cost
to name honestly in the design document is that the cognitive mode then sits
near CIPHER's deduction from feedback; the distinction to defend is that
CIPHER's feedback is a count over a code and this one is a **position**, the
depth the relay reached, over an ordering.

Whichever is chosen, the design document settles it in section 10.5's style with
a declared fairness claim, and ROTATE-LOCK.md 10.5 is the precedent for stating
plainly what the game does **not** claim.

### 4.2 Deliverables

NEW_GAME.md section 2: `DIFFERENCE-RELAY.md` answering all 28 items of
ARCHITECTURE2 section 44, then rules, generator plus two tools plus the 365 day
manifest, module, leak probes with positive controls, renderer on the list
cursor, the plan row in `tools/certify.ts`, and the defect report.

**Size.** The design document and the game are each well over 300 lines. Per the
efficiency protocol, say what is about to be produced in one line and wait.

---

## 5. The requirements mapped to what exists

| Requirement | Exists today as | Notes |
|---|---|---|
| ORDER input | `src/ui/listCursor.ts`, `tests/ui/listCursor.test.ts` | New. Focus, selection by identity, swap, cancel, declared verb, `cursor.keys` for the `InputDescriptor` |
| Worked adoption of it | `src/games/rotate-lock/render.ts` | The tray, retrofitted |
| Scaffold | `tools/new-game.ts`, `tests/tools/new-game.test.ts` | Adopts the planned row |
| Procedure | NEW_GAME.md | Sections 2, 3, 6 and 12 |
| Worked v3 game | `src/games/rotate-lock/`, `ROTATE-LOCK.md` | Nine files, three tools, seven test files |
| Exhaustive enumeration precedent | `src/games/rotate-lock/solver.ts`, `tools/rotate-lock-verify.ts` | Two independent searches |
| Gate plan | `newGamePlan` and `GAME_PLANS` in `tools/certify.ts` | ROTATE LOCK's row is the worked example |
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
| src/ui/listCursor.ts | The ORDER adapter this game consumes |
| src/games/rotate-lock/, tools/rotate-lock-*.ts, data/rotate-lock/ | The newest game |

---

## 7. How to work in this environment

1. **The workspace shell cannot mount the repository**, a Windows update of
   2026-09-08: `device_bash` fails with "no Plan9 drive shares mounted". Read and
   write the owner's tree with `device_list_dir`, `device_stage_files` and
   `device_commit_files`. List `src`, `tests`, `tools` and `data` separately; a
   recursive listing of the root overflows on `node_modules`.
2. **Run the real gates in the cloud container.** A shallow clone of GitHub
   `main` then `npm ci` is about a minute. Check `.git/refs/heads/main` in the
   owner's tree against `origin/main` first: on 2026-09-17 origin was one
   documentation commit ahead of the owner's checkout.
3. **Pushing from the container is refused** unless the repository is in the
   session's authorised sources. Otherwise write the files into the owner's tree
   and hand them the commit and push commands.
4. **The bridge cannot write under `.github` and cannot delete.** Deliver those
   changes as a patch file in the repository root and tell the owner to
   `git apply` and delete it.
5. **Pass `expectedMtimeMs`** from staging for every file already in the tree.
6. **`npm run certify` needs git** and must be started through npm. Use
   `-- --check` to evaluate without rewriting records.
7. **Headless Chromium** is at `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`
   and the global Playwright package at
   `/home/claude/.npm-global/lib/node_modules/playwright` drives it against
   `vite preview --outDir dist --port 4173`. Stop the server with
   `fuser -k 4173/tcp`.
8. **A planned game cannot enter a release build.** `npm run build:harness`,
   which is `vite build --mode development`, builds every target including the
   planned ones into `dist`, and is the way to render a new game at 360 pixels.
   Never patch the target list in the tree itself.
9. **A screenshot at 360 pixels is evidence no automated check produces**, and
   measuring in the page is better than guessing: both ROTATE LOCK defects 1 and
   2 were invisible to every gate, and the size ladder that fixed defect 2 was
   wrong until the rendered widths were measured.
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
