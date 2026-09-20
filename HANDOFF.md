# HANDOFF

The note passed from one conversation to the next. It says where the project
stands, what this conversation must do, what must not be done, and where every
file this conversation needs lives. It is rewritten at the end of every phase
and it describes exactly one conversation: the next one.

| Field | Value |
|---|---|
| Written | 2026-09-19, after the LETTER TRAIL design merged (PR #8) and the WORD LADDER preparation evidence was gathered |
| Built on | Base commit `dcd4409` ("Merge pull request #8 from BigBadChicago/claude/letter-trail-design"), branch `claude/word-ladder-prep`, commit subject "WORD LADDER preparation evidence" |
| For the conversation | **Charter Phase 13: WORD LADDER design**, game seven of twelve, the design document only |
| Phase scheme | Charter phases, Section 9 of the project instructions. The v3 migration phases are complete |
| Before any work | Read WORD-LADDER-PREP.md in full; it is measured input, not decisions. The design document confirms or overturns each item with its own evidence, then absorbs the file and deletes it in the same change |
| Next after this | The WORD LADDER build, then PANGRAM, FIVE LETTERS, then TURN TABLE, RING BALANCE, ORDER OF OPERATIONS, each in its own conversation |

---

## 1. Reading order

First, clone `main` into the container; section 7 item 1 has the commands and
the merge check. The project file copies are not the code and may be stale.

Then read these before doing anything, in this order, and nothing else unless a
section below names it.

1. **HANDOFF.md**, this file.
2. **WORD-LADDER-PREP.md**. The measured evidence gathered before this
   conversation so the design starts from numbers, not from the section 46 note
   alone. It is input, not decisions: every "proposed" item is for the design
   document to confirm or overturn with its own reproduced measurements. Its
   section 4 lists the open questions the design must answer.
3. **ARCHITECTURE2.md**. The section 46 WORD LADDER note and its preparation
   evidence line, section 3 (the contract), 9 to 18 (difficulty, verification,
   decomposition and symmetry, telemetry, share grammar, leak checks, artifact,
   fingerprint), section 21 (input families), section 35's word graph family, 44
   (the authoring contract) and 45 (the gate). Read the section 56 entries
   "Charter Phase 13, LETTER TRAIL design" (the precedent for a word game design)
   and the DIFFERENCE RELAY entry.
4. **LETTER-TRAIL.md**. The one worked word game design document, and the direct
   precedent: it abandoned the section 46 full cover uniqueness claim after
   measuring it, chose ENABLE intersected with wordfreq as its familiarity source,
   ships no runtime validation list, and settled a themed known set model. WORD
   LADDER's design cites it where the family should agree, above all on the
   familiarity source (see the design task, item 4).
5. **ARCHITECTURE.md**. Presentation, Contract, Template, Build model, Suite
   decisions, and the File manifest (which now lists WORD-LADDER-PREP.md as
   transient).
6. **BACKLOG.md**, most of all "Logged at the slate amendment, four word games".

Then **NEW_GAME.md**, the procedure, and both **ROTATE-LOCK.md** and
**DIFFERENCE-RELAY.md** as worked v3 design references.

Precedence: the working tree, then ARCHITECTURE2.md, then ARCHITECTURE.md, then
the project instructions. The project instructions' Section 0 still says eight
games; the architecture documents amend it to twelve. If this file disagrees with
ARCHITECTURE2.md, this file is stale; say so.

This conversation is the WORD LADDER design; the owner has waived per turn
confirmation for the run, so state the phase in one line and proceed.

---

## 2. Where the project stands

**Suite.** Twelve games in `src/shell/registry.ts`: POKER GRID, VECTOR, CIPHER
(live); ROTATE LOCK, DIFFERENCE RELAY (built, planned, each waiting on its manual
mobile check); LETTER TRAIL (designed, not yet built), WORD LADDER, PANGRAM, FIVE
LETTERS (planned word games); TURN TABLE, RING BALANCE, ORDER OF OPERATIONS
(planned, deferred behind the word games).

**LETTER TRAIL is designed and merged (PR #8),** documents only: LETTER-TRAIL.md,
the ASSETS rows, the section 46 amendment, the section 56 design entry. Its build
is a separate conversation, not this one. Its lasting relevance to WORD LADDER is
the familiarity source decision and the "no runtime validation list" precedent.

**WORD LADDER preparation is merged in this same patch as this handoff:**
WORD-LADDER-PREP.md plus a file manifest row and a section 46 evidence line. The
prep proposes four letter words, ESDB 50 accepted over ESDB 35 familiar, exact par
with an all familiar shortest path, the search ball as the banded difficulty
integer, an alphabetical keyboard for the 44 pixel floor, an owner reviewed deny
list, and the accepted list as the only runtime asset. All of it is a hypothesis
for the design to test.

**Green baseline to regress against,** measured 2026-09-19 on a clone of
`origin/main` at the LETTER TRAIL merge. The WORD LADDER design is documents only
and does not change it:

| Gate | Result |
|---|---|
| Typecheck | three tsconfigs |
| Dependency check | layers verified |
| Tests | 75 files, 983 tests |
| Verifiers | POKER GRID, CIPHER, VECTOR, ROTATE LOCK, DIFFERENCE RELAY, each 365 days |
| Production build | `engine-v2.js` about 30.4 KB |
| Byte budget | Hub 18.1, POKER GRID 28.3, CIPHER 26.2, VECTOR 28.5, About 3.5 KB gzipped |
| Certification | `npm run certify -- --check`: three live games production safe |

---

## 3. Preconditions to check first

1. **The prep patch merged.** WORD-LADDER-PREP.md is present on `main`, the file
   manifest row is in ARCHITECTURE.md, and the section 46 evidence line is in
   ARCHITECTURE2.md. If not, say so.
2. **The LETTER TRAIL design is present** (LETTER-TRAIL.md, section 56 entry), so
   the family familiarity source decision can cite it.
3. **The baseline in section 2 still holds.** The design is documents only, so it
   should; confirm if anything downstream is touched.

Nothing about ROTATE LOCK or DIFFERENCE RELAY going live is this conversation's
work; leave both planned unless the owner says a manual check passed.

---

## 4. The task: WORD LADDER design, game seven of twelve

Write WORD-LADDER.md, the design document only, no game code, exactly as LETTER
TRAIL's design conversation did. It answers every item of ARCHITECTURE2 section 44
and the open questions in WORD-LADDER-PREP.md section 4, and it reproduces the
prep's measurements in the container before adopting any number. The prep's seeds
and probe are named so the generator can match them.

What the design must settle, at least:

1. **Confirm or overturn each prep proposal with reproduced evidence.** Word
   length four, ESDB 50 over ESDB 35, exact par with an all familiar shortest path,
   the search ball as the banded integer with par and detours as levers. A number
   the design cannot reproduce is not used.
2. **The difficulty integer, and prove seven band resolution.** Par alone has four
   values and collapses the bands, the DIFFERENCE RELAY lesson. The search ball is
   the proposal; it is a hypothesis until the design shows it tracks human
   difficulty and fills seven bands, with a named fallback if it does not.
3. **The uniqueness and fairness claims the verifier will prove,** stated exactly
   as SOLVABLE and one fairness claim, never an aspirational claim. Par exactness
   depends on one accepted list; the prep's F2 shows why. The verifier is
   independent and never imports the generator.
4. **The family familiarity source.** LETTER TRAIL uses ENABLE intersected with
   wordfreq; the prep proposes ESDB. Settle whether WORD LADDER matches LETTER
   TRAIL, adopts ESDB, and whether the four word games converge on one source with
   one ASSETS.md entry and one notice. Games may not import from each other, so a
   shared list is a tools step that writes each game's own copy. This is prep open
   question 3 and it is the one cross game decision the design must not defer.
5. **The deny list**, owner reviewed, applied to every list, per prep F7. ENABLE
   and ESDB both contain slurs and vulgar words; a probe found seven of twenty in
   ESDB 50. Recorded in ASSETS.md.
6. **Input at the 44 pixel floor**, the alphabetical keyboard of prep F5, measured
   in the page at 360 pixels, not trusted from the stylesheet.
7. **Failure model, buckets, share grammar, telemetry patterns and leak checks,**
   the same contract every game meets. The registry row's provisional values are
   corrected in the build, not here, but the design states the correct values.

Deliverable: WORD-LADDER.md, the ASSETS.md rows it needs (or a note that the
family source decision defers them to the build), any ARCHITECTURE2 section 46
amendment and a section 56 design entry, and the deletion of WORD-LADDER-PREP.md
in the same change once the design has absorbed what it keeps. The prep exists only
until the design supersedes it.

**Size.** WORD-LADDER.md is well over 300 lines. The owner has waived the wait, so
produce it, but still gather and show the reproduced measurements before writing
the prose that depends on them.

---

## 5. The requirements mapped to what exists

| Requirement | Exists today as | Notes |
|---|---|---|
| Exact shortest path and par precedent | `src/games/difference-relay/solver.ts` | Breadth first search with an independent verifier |
| Word game design precedent | LETTER-TRAIL.md | Familiarity source, no runtime validation list, themed known set |
| Keyboard or grid input | `src/ui/gridCursor.ts`, `src/ui/listCursor.ts` | An alphabetical key grid is a renderer concern on gridCursor |
| Scaffold and procedure | `tools/new-game.ts`, NEW_GAME.md | For the build, not this design |
| Manifest codec | `src/engine/manifest-codec.ts` | Light obfuscation of start, goal and par route |
| Word lists | ENABLE and ESDB, named in WORD-LADDER-PREP.md | Offline only; the design sets the family source |
| Gate plan | `GAME_PLANS` in `tools/certify.ts` | For the build |

---

## 6. Where everything is

| File | What it is |
|---|---|
| HANDOFF.md | This file |
| WORD-LADDER-PREP.md | The measured evidence for WORD LADDER, transient, deleted when the design absorbs it |
| LETTER-TRAIL.md | The worked word game design precedent |
| ARCHITECTURE2.md | Active architecture, v3 contract, gate, concept notes, migration and phase log |
| ARCHITECTURE.md | The v2 record, the file manifest, every settled decision |
| ASSETS.md | Every shipped asset, and the LETTER TRAIL build time word data rows |
| BACKLOG.md | Everything deliberately not built |
| NEW_GAME.md | The authoring procedure, for the build |
| ROTATE-LOCK.md, DIFFERENCE-RELAY.md | Worked v3 design references |
| tools/ship.ps1 | The owner's one command delivery |

---

## 7. How to work in this environment

All development happens in the container. The owner runs only manual device
checks, UAT and the one delivery command.

1. **Start from a fresh clone of `main`:**

   ```
   git clone -q https://github.com/BigBadChicago/DAILYKIT.git dk && cd dk
   git merge-base --is-ancestor <base commit from the header> HEAD && echo BASE_OK
   git log --format=%s <base commit>..HEAD | grep -Fx "<subject from the header>"
   npm ci
   ```

   Both checks must pass before any work. The handoff names the base and the
   subject, not the delivered commit id, because the owner's `git am` makes a new
   commit. `main` may carry the owner's own commits after the base; that is normal.
2. **Work on a local branch named for the work,** for example
   `git switch -c claude/word-ladder-design`. Record the commit the clone checked
   out; it is the next handoff's base.
3. **Set a local git identity before committing** (the container has none):
   `git config user.email "claude@dailykit.local" && git config user.name "Claude"`.
4. **Deliver when every automated gate is green.** A documents only design does not
   change code, so run typecheck, the dependency check and `npm run certify --
   --check` to prove no regression, and confirm only the intended documents changed.
   Commit everything including the rewritten HANDOFF.md as one commit, then:

   ```
   git format-patch -1 --base=<recorded base commit> --stdout > /mnt/user-data/outputs/<n>.patch
   ```

   `<n>` is lowercase words joined by hyphens and becomes the branch `claude/<n>`.
   Verify the patch applies onto its base with `git apply --check`, present it, and
   tell the owner to run, from the repository root:

   ```
   powershell -ExecutionPolicy Bypass -File tools\ship.ps1 <path to the patch>
   ```

   The script branches from the base, applies and commits the patch, pushes, and
   prints the pull request link. It refuses a dirty tree and a patch with no base.
5. **Before running ship, the owner clears any uncommitted scratch** (a stray
   `new-game` scaffold, for instance). `git clean` scoped to named paths, never a
   bare clean, and only after confirming the scratch exists in no commit.
6. **Pushing from the container is not possible and is not attempted.**
7. **A planned game cannot enter a release build;** `npm run build:harness` builds
   all targets including planned ones for measuring a page at 360 pixels.
8. **ESDB and ENABLE stay offline.** Neither CI nor the browser fetches or builds
   them; derived lists are committed with the ESDB notice, per prep section 1.

---

## 8. Rules that bind every conversation

1. One phase per conversation. When it completes, rewrite this file for the next
   one and tell the owner to open a new conversation.
2. Name the phase scheme every time: charter Phase N or v3 migration phase N.
3. No dashes as punctuation in prose, comments, commit messages or documents.
   Hyphens inside compound words are fine.
4. No preamble, no recap, no alternatives unless asked. End with a numbered list of
   decisions and the single next action.
5. The owner has waived the wait before long output for this run; still show
   reproduced evidence before prose that depends on it.
6. Never reconstruct charter text that cannot be read. Ask.
7. Settled designs are not reopened: the LETTER TRAIL design and the POKER GRID
   locked decisions stand.
8. Anything outside the phase goes to BACKLOG.md with a one line rationale.
9. Every file added or repurposed is recorded in the architecture documents.
10. v3 telemetry is the player's own run log on device. Any proposal that sends it
    anywhere is refused.
11. The code comes from a fresh clone of GitHub `main`, never the project file
    copies, and every delivery is one patch through `tools/ship.ps1`. The rewritten
    HANDOFF.md travels inside that patch and names its base commit, branch and
    subject.

---

## 9. Keeping this file

Rewrite it, do not append, at the end of every phase. Keep the section numbers:

1. Reading order
2. Where the project stands, with the measured green baseline
3. Preconditions
4. The task: goal, what must be settled, deliverable, size
5. The map from requirements to what exists
6. Where everything is
7. How to work in this environment
8. Rules that bind every conversation
9. Keeping this file

History belongs in ARCHITECTURE2.md section 56, not here. This file only points.
