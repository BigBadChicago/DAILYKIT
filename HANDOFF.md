# HANDOFF

The note passed from one conversation to the next. It says where the project
stands, what this conversation must do, what must not be done, and where every
file this conversation needs lives. It is rewritten at the end of every phase
and it describes exactly one conversation: the next one.

| Field | Value |
|---|---|
| Written | 2026-09-20, after WORD LADDER was designed and built in one conversation |
| Built on | Base commit `96950b5` ("Merge pull request #9 from BigBadChicago/claude/word-ladder-prep"), branch `claude/word-ladder-build`, commit subject "WORD LADDER design and build" |
| For the conversation | **Charter Phase 13: PANGRAM design**, game eight of twelve, the design document only |
| Phase scheme | Charter phases, Section 9 of the project instructions. The v3 migration phases are complete |
| Before any work | There is no PANGRAM prep file. PANGRAM starts from the section 46 note, the LETTER TRAIL and WORD LADDER precedents, and its own reproduced measurements |
| Next after this | The PANGRAM build, then FIVE LETTERS, then TURN TABLE, RING BALANCE, ORDER OF OPERATIONS, each in its own conversation |

---

## 1. Reading order

First, clone `main` into the container; section 7 item 1 has the commands and
the merge check. The project file copies are not the code and may be stale.

Then read these before doing anything, in this order, and nothing else unless a
section below names it.

1. **HANDOFF.md**, this file.
2. **ARCHITECTURE2.md**. The section 46 PANGRAM note, section 3 (the contract),
   9 to 18 (difficulty, verification, decomposition and symmetry, telemetry, share
   grammar, leak checks, artifact, fingerprint), section 21 (input families),
   section 44 (the authoring contract) and 45 (the gate). Read the section 56
   entries "Charter Phase 13, LETTER TRAIL design" and "Charter Phase 13, WORD
   LADDER design and build" as the two worked word game precedents.
3. **WORD-LADDER.md**. The most recent worked word game design, and the one that
   settled the family word source: the four word games do not converge, WORD
   LADDER uses ENABLE intersected with SCOWL/ESDB, LETTER TRAIL uses wordfreq. It
   also shows the exact-measure-first discipline, the search ball difficulty
   integer, the independent verifier, and the runtime word asset byte cost. PANGRAM
   cites it where the word game family should agree.
4. **LETTER-TRAIL.md**. The first worked word game design: it abandoned an
   aspirational uniqueness claim after measuring it, and ships no runtime validation
   list. PANGRAM must decide its own validation model the same way.
5. **ARCHITECTURE.md**. Presentation, Contract, Template, Build model, Suite
   decisions, and the File manifest.
6. **BACKLOG.md**, most of all the "four word games" entries and the two source
   word list decision recorded 2026-09-20.

Then **NEW_GAME.md**, the procedure, and both **ROTATE-LOCK.md** and
**DIFFERENCE-RELAY.md** as worked v3 design references.

Precedence: the working tree, then ARCHITECTURE2.md, then ARCHITECTURE.md, then
the project instructions. The project instructions' Section 0 still says eight
games; the architecture documents amend it to twelve. If this file disagrees with
ARCHITECTURE2.md, this file is stale; say so.

This conversation is the PANGRAM design; the owner has waived per turn
confirmation for the run, so state the phase in one line and proceed.

---

## 2. Where the project stands

**Suite.** Twelve games in `src/shell/registry.ts`: POKER GRID, VECTOR, CIPHER
(live); ROTATE LOCK, DIFFERENCE RELAY, WORD LADDER (built, planned, each waiting on
its manual mobile check and go live patch); LETTER TRAIL (designed, not yet built);
PANGRAM, FIVE LETTERS (planned word games, not yet designed); TURN TABLE, RING
BALANCE, ORDER OF OPERATIONS (planned, deferred behind the word games).

**WORD LADDER is designed and built in the patch that carries this handoff.**
WORD-LADDER.md is the design; the game is a full v3 module with generator, an
independent verifier, a calibration study, a 365 day manifest, tests, and its wiring
into the registry (planned), vite, certify GAME_PLANS, and npm scripts. It ships
planned: its offline smoke and manual mobile checks are the gate refusing stubs, and
going live is a separate patch after the owner's UAT. The prep file was absorbed and
deleted. The family word source decision is settled and recorded (section 12 of the
design, section 56 migration log, BACKLOG.md): WORD LADDER, PANGRAM and FIVE LETTERS
use SCOWL/ESDB, LETTER TRAIL uses wordfreq, and the four never share one list.

**Green baseline to regress against,** measured 2026-09-20 in the container on
`claude/word-ladder-build` at base `96950b5`, with WORD LADDER built:

| Gate | Result |
|---|---|
| Typecheck | three tsconfigs, zero errors |
| Dependency check | layers verified |
| Tests | 82 files, 1,049 tests (66 new for WORD LADDER) |
| Verifiers | POKER GRID, CIPHER, VECTOR, ROTATE LOCK, DIFFERENCE RELAY, WORD LADDER, each 365 days |
| Production build | `engine-v2.js` about 30.4 KB; word-ladder excluded, being planned |
| Byte budget | Hub 18.1, POKER GRID 28.3, CIPHER 26.2, VECTOR 28.5, About 3.5 KB; WORD LADDER 32.9 KB measured in a throwaway live build |
| Certification | `npm run certify`: three live games production safe; word-ladder not evaluated, being planned |

---

## 3. Preconditions to check first

1. **The WORD LADDER patch merged.** WORD-LADDER.md is on `main`,
   `src/games/word-ladder/` exists, `data/word-ladder/` has accepted.txt,
   familiar.txt, the manifest and study.json, and WORD-LADDER-PREP.md is gone. If
   not, say so.
2. **The baseline in section 2 still holds.** A PANGRAM design is documents only, so
   it should; confirm if anything downstream is touched.

Nothing about ROTATE LOCK, DIFFERENCE RELAY or WORD LADDER going live is this
conversation's work; leave all three planned unless the owner says a manual check
passed.

---

## 4. The task: PANGRAM design, game eight of twelve

Go straight to PANGRAM.md, the design document only, no game code, as the WORD
LADDER conversation did once it found its prep unmerged. There is no PANGRAM prep
file to absorb. The design answers every item of ARCHITECTURE2 section 44 and
reproduces its own measurements in the container before adopting any number.

What the design must settle, at least:

1. **The rule and the substrate.** The registry one line rule is "Make words from
   seven letters, always using the centre letter, and find the word that uses all
   seven." The substrate is a seven letter set with one required centre letter; the
   pangram is the word using all seven. Decide the exact scoring: how partial words
   score, whether length matters, and what the target is.
2. **The word source.** PANGRAM uses SCOWL/ESDB, per the settled family decision,
   not wordfreq. It is a word game that must validate free player words, so like
   WORD LADDER it ships a runtime accepted list; measure its byte cost. Decide the
   accepted word length range.
3. **Generation and the daily letter set.** How a day's seven letters are drawn so
   that at least one pangram exists and enough words are makeable, and how the set
   is verified. This is the generation acceptance measurement.
4. **The difficulty integer, seven band resolution, and the named fallback.** As
   every game: an emergent integer that fills seven bands, proved, with a fallback
   if it collapses. Candidate integers: the count of makeable words, or the count
   of pangrams.
5. **The fairness and any uniqueness claims,** stated exactly as the verifier will
   prove them, never aspirational.
6. **The deny list**, owner reviewed, applied to the accepted list, as WORD LADDER
   did.
7. **Input at the 44 pixel floor.** PANGRAM needs only seven letter keys, so the
   floor is met easily; the BACKLOG note says do not lay them out as a honeycomb of
   seven hexagons (trade dress).
8. **Failure model, buckets, share grammar, telemetry patterns and leak checks,**
   the contract every game meets. The registry row for pangram has provisional
   values (hue 208, a bucket count, hasWinLoss); the design states the correct
   values and the build corrects the row.

Deliverable: PANGRAM.md, the ASSETS.md rows it needs (or a note deferring the exact
committed files to the build), any ARCHITECTURE2 section 46 amendment and a section
56 design entry, and the rewritten HANDOFF.md for the PANGRAM build. No game code.

**Size.** PANGRAM.md is well over 300 lines. The owner has waived the wait, so
produce it, but still gather and show the reproduced measurements before writing the
prose that depends on them.

---

## 5. The requirements mapped to what exists

| Requirement | Exists today as | Notes |
|---|---|---|
| Word game design precedent, SCOWL source | WORD-LADDER.md, `src/games/word-ladder/` | Runtime accepted list, deny list, exact measure first, independent verifier |
| Word game design precedent, validation model | LETTER-TRAIL.md | Chose to ship no runtime dictionary; PANGRAM must decide its own |
| Runtime word asset pattern | `src/games/word-ladder/words.ts`, `tools/word-ladder-generate.ts` | Committed list embedded as source, derived offline from ENABLE and ESDB |
| SCOWL/ESDB derivation | the WORD LADDER tools and `data/word-lists/deny.txt` | The family source; PANGRAM derives its own list the same way |
| Keyboard input | `src/games/word-ladder/render.ts` | A letter set keyboard as a renderer concern under custom input |
| Manifest codec | `src/engine/manifest-codec.ts` | Light obfuscation of the day's letters |
| Scaffold, gate plan | `tools/new-game.ts`, `GAME_PLANS` in `tools/certify.ts` | For the build |

---

## 6. Where everything is

| File | What it is |
|---|---|
| HANDOFF.md | This file |
| WORD-LADDER.md | The most recent worked word game design and build |
| LETTER-TRAIL.md | The first worked word game design |
| ARCHITECTURE2.md | Active architecture, v3 contract, gate, concept notes, migration and phase log |
| ARCHITECTURE.md | The v2 record, the file manifest, every settled decision |
| ASSETS.md | Every shipped asset, and the word game build time and runtime word data rows |
| BACKLOG.md | Everything deliberately not built, including the two source word list decision |
| NEW_GAME.md | The authoring procedure, for the build |
| ROTATE-LOCK.md, DIFFERENCE-RELAY.md | Worked v3 design references |
| src/games/word-ladder/ | The worked word game code to model PANGRAM's build on later |
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
   `git switch -c claude/pangram-design`. Record the commit the clone checked out;
   it is the next handoff's base.
3. **Set a local git identity before committing** (the container has none):
   `git config user.email "claude@dailykit.local" && git config user.name "Claude"`.
4. **Deliver when every automated gate is green.** A documents only design does not
   change code, so run typecheck, the dependency check and `npm run certify` to
   prove no regression, and confirm only the intended documents changed. A design
   plus build (as WORD LADDER became) runs the full gate: typecheck (three configs),
   depcheck, the whole test suite, the game verifier, build, budget, and certify.
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
5. **Before running ship, the owner clears any uncommitted scratch.** `git clean`
   scoped to named paths, never a bare clean, and only after confirming the scratch
   exists in no commit.
6. **Pushing from the container is not possible and is not attempted.**
7. **A planned game cannot enter a release build.** To measure a planned game's page
   at 360 pixels, build with the certify build mode after temporarily marking it
   live in a throwaway copy of the tree, as the WORD LADDER budget was measured, or
   use `npm run build:harness`. Never commit the live flip.
8. **ESDB and ENABLE stay offline.** Neither CI nor the browser fetches or builds
   them; derived lists are committed with the ESDB notice, which ships on the About
   page.

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
7. Settled designs are not reopened: the LETTER TRAIL and WORD LADDER designs and
   the POKER GRID locked decisions stand. The two source word list decision stands.
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
