# HANDOFF

The note passed from one conversation to the next. It says where the project
stands, what this conversation must do, what must not be done, and where every
file this conversation needs lives. It is rewritten at the end of every phase
and it describes exactly one conversation: the next one.

| Field | Value |
|---|---|
| Written | 2026-09-20, after PANGRAM was designed and built in one conversation |
| Built on | Base commit `9b0e9b2` ("Merge pull request #10 from BigBadChicago/claude/word-ladder-design-and-build"), branch `claude/pangram-design-and-build`, commit subject "PANGRAM design and build" |
| For the conversation | **Charter Phase 13: FIVE LETTERS design and build**, game nine of twelve, design through delivery in one run |
| Phase scheme | Charter phases, Section 9 of the project instructions. The v3 migration phases are complete |
| Before any work | There is no FIVE LETTERS prep file. It starts from the section 46 note, the WORD LADDER and PANGRAM precedents, and its own reproduced measurements |
| Next after this | The LETTER TRAIL build (its design exists), then TURN TABLE, RING BALANCE, ORDER OF OPERATIONS, each in its own conversation, each design through delivery |

---

## 1. Reading order

First, clone `main` into the container; section 7 item 1 has the commands and
the merge check. The project file copies are not the code and may be stale.

Then read these, in this order, and nothing else unless a section below names it.
Read only the named sections of the long documents: the run has a finite tool
budget, and reading whole files is what exhausts it.

1. **HANDOFF.md**, this file.
2. **ARCHITECTURE2.md**: the section 46 FIVE LETTERS note, section 44 (the
   authoring contract), and the two section 56 entries "Charter Phase 13, PANGRAM
   design and build" and "Standing rule". Sections 3, 9 to 18 and 21 only where a
   decision turns on them.
3. **PANGRAM.md**: the most recent worked word game, design and build. It shows
   the whole template in one document, the measure first discipline, the
   independent verifier that imports only the codec, and the manifest carried
   answer list.
4. **WORD-LADDER.md**, sections 0, 5, 11, 12 and 30: the ESDB family source, the
   single list discipline, and the alphabetical seven across keyboard, which is
   the 44 pixel floor answer FIVE LETTERS' 26 keys need.
5. **CIPHER.md**, its feedback rules only: FIVE LETTERS reuses CIPHER's slot
   pattern and overlaps its cognitive mode, which the design must address.
6. **BACKLOG.md**, the entries logged 2026-09-19 and 2026-09-20.

Precedence: the working tree, then ARCHITECTURE2.md, then ARCHITECTURE.md, then
the project instructions. If this file disagrees with ARCHITECTURE2.md, this file
is stale; say so.

---

## 2. Where the project stands

**Suite.** Twelve games in `src/shell/registry.ts`: POKER GRID, VECTOR, CIPHER
(live); ROTATE LOCK, DIFFERENCE RELAY, WORD LADDER, PANGRAM (built, planned, each
waiting on its manual mobile check and go live patch); LETTER TRAIL (designed, not
built); FIVE LETTERS (planned, not designed); TURN TABLE, RING BALANCE, ORDER OF
OPERATIONS (planned, deferred behind the word games).

**PANGRAM is designed and built in the patch that carries this handoff.** See the
section 56 entry. Its finding: the browser ships no dictionary, each day's answers
travel in its manifest chunk. It ships planned.

**Open items another game's work must not trip over** (BACKLOG.md): WORD LADDER
still accepts five newly denied rungs and makes an invalid share on an immediate
reveal, both to fix before it goes live; PANGRAM's horizon must be extended before
2027-01-04; the family deny list's 67 new entries await owner review.

**Green baseline to regress against,** measured 2026-09-20 in the container on
`claude/pangram-build` at base `9b0e9b2`:

| Gate | Result |
|---|---|
| Typecheck | three tsconfigs, zero errors |
| Dependency check | layers verified |
| Tests | 89 files, 1,112 tests |
| Verifiers | POKER GRID, CIPHER, VECTOR, ROTATE LOCK, DIFFERENCE RELAY, WORD LADDER, PANGRAM, each 365 days |
| Production build | `engine-v2.js` about 30.4 KB; planned games excluded |
| Byte budget | Hub 18.1, POKER GRID 28.3, CIPHER 26.2, VECTOR 28.5, About 4.0 KB; PANGRAM 27.1 KB and WORD LADDER 32.9 KB in throwaway certify builds |
| Certification | `npm run certify`: three live games production safe |

VECTOR's verifier takes about 100 seconds and ROTATE LOCK's about 55. A single
container command is cut off at 300 seconds, so run verifiers one per command or
detached with `setsid nohup` and a log file, never all in one command.

---

## 3. Preconditions to check first

1. **The PANGRAM patch merged.** PANGRAM.md is on `main`, `src/games/pangram/`
   exists, `data/pangram/` holds the lists, study and thirteen manifest files. If
   not, say so and stop.
2. **The baseline in section 2 still holds.**

Nothing about any planned game going live is this conversation's work.

---

## 4. The task: FIVE LETTERS, design through delivery

One uninterrupted run, pre approved (section 8 rule 5): write FIVE-LETTERS.md,
build the game on the v3 contract, test it, run the full gate, and package the
patch.

What the design must settle, at least:

1. **The rule and the feedback.** The registry rule is "Find the five letter word
   in six guesses, each letter marked right, present or absent." Settle duplicate
   letter feedback exactly and prove it in tests.
2. **The word source.** SCOWL/ESDB, the settled family decision, never wordfreq.
   An answer list (familiar, curated by size level) and a larger guess list. The
   guess list must validate free guesses in the browser, so unlike PANGRAM it
   ships; measure its gzipped cost against the 150 KB page budget, and consider
   whether the manifest carrying answers only is enough.
3. **The deny list.** The family file `data/word-lists/deny.txt`, owner reviewed,
   subtracted from both lists; extend it for five letter words from a probe.
4. **Difficulty.** An emergent integer across seven bands with a named fallback.
   Section 46 suggests remaining candidates after an ideal opening; measure it.
5. **The cognitive mode overlap with CIPHER.** State it plainly; the accepted
   lineup deviation stands, but the design must say what distinguishes the two.
6. **Input at the 44 pixel floor.** 26 keys at 360 pixels: QWERTY ten across
   fails at about 31 pixels; WORD LADDER's alphabetical seven across passes at
   about 46. Decide and measure.
7. **Failure model, buckets, share grammar, telemetry, leak probes.** Correct the
   provisional registry row (hue 288, bucket count, hasWinLoss) in the build.
8. **The shared keyboard question.** WORD LADDER logged it; PANGRAM said no. FIVE
   LETTERS decides whether a keyboard widget is extracted, and if so it is an
   engine change logged as a defect, not done silently.

Deliverable: FIVE-LETTERS.md, the complete game, tools, data, tests, the ASSETS,
BACKLOG, ARCHITECTURE and ARCHITECTURE2 updates, MANUAL-CHECKS.md section 8, this
file rewritten for the LETTER TRAIL build, and `five-letters-design-and-build.patch`.

---

## 5. The requirements mapped to what exists

| Requirement | Exists today as | Notes |
|---|---|---|
| Whole template, design and build in one run | PANGRAM.md, `src/games/pangram/` | Measure first, single list, codec only verifier |
| Rebuildable word lists | `tools/pangram-words.ts` | Parameterise or copy for five letters; ESDB and ENABLE stay offline |
| Runtime word list asset | `src/games/word-ladder/words.ts` | Committed list embedded as source |
| 26 key keyboard at the floor | `src/games/word-ladder/render.ts` | Alphabetical seven across |
| Feedback with duplicates | `src/games/cipher/` | Exact and misplaced counts, not per position |
| Manifest codec | `src/engine/manifest-codec.ts` | Light obfuscation of the answer |
| Scaffold, gate plan | `tools/new-game.ts`, `GAME_PLANS` in `tools/certify.ts` | `npm run new-game -- --id five-letters` adopts the planned row |

---

## 6. Where everything is

| File | What it is |
|---|---|
| HANDOFF.md | This file |
| PANGRAM.md | The most recent worked word game, design and build |
| WORD-LADDER.md, LETTER-TRAIL.md | The earlier word game designs |
| ARCHITECTURE2.md | Active architecture, v3 contract, gate, concept notes, migration and phase log |
| ARCHITECTURE.md | The v2 record, the file manifest, every settled decision |
| ASSETS.md | Every shipped asset and every word list row |
| BACKLOG.md | Everything deliberately not built |
| NEW_GAME.md | The authoring procedure; section 2 carries the one run rule |
| MANUAL-CHECKS.md | The owner's device checks; section 7 is PANGRAM |
| tools/ship.ps1 | The owner's one command delivery |

---

## 7. How to work in this environment

All development happens in the container. The owner runs only manual device
checks, UAT and the one delivery command.

1. **Start from a fresh clone of `main`:**

   ```
   git clone -q https://github.com/BigBadChicago/DAILYKIT.git dk && cd dk
   git merge-base --is-ancestor 9b0e9b2 HEAD && echo BASE_OK
   git log --format=%s 9b0e9b2..HEAD | grep -Fx "PANGRAM design and build"
   npm ci
   ```

   Both checks must pass before any work. Record the commit the clone checked out;
   it is this run's base and the next handoff's base.
2. **Work on a local branch,** for example `git switch -c claude/five-letters-build`.
3. **Set a local git identity:** `git config user.email "claude@dailykit.local" && git config user.name "Claude"`.
4. **Word list inputs.** ESDB from `https://codeload.github.com/en-wl/wordlist/tar.gz/1e5b7d3`
   and ENABLE from `https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt`
   (md5 33f2b09e2d9dfb732fa16b5f05a5a8d1), both reachable from the container,
   both kept out of the repository.
5. **The full gate before packaging:** typecheck (three configs), depcheck, the
   whole test suite, every verifier (one per command, see section 2), build,
   budget, the game's page measured in a throwaway copy with the row set live and
   `DAILYKIT_CERTIFY_BUILD=1 npx vite build` then `npx tsx tools/budget.ts
   dist-certify`, and `npm run certify`. Never commit the live flip.
6. **Deliver:** commit everything, including this file rewritten, as one commit,
   then

   ```
   git format-patch -1 --base=<recorded base> --stdout > /mnt/user-data/outputs/<n>.patch
   ```

   and prove it applies with `git apply --check` in a fresh clone at the base.
   The owner runs, from the repository root:

   ```
   powershell -ExecutionPolicy Bypass -File tools\ship.ps1 <path to the patch>
   ```
7. **Pushing from the container is not possible and is not attempted.**
8. **A planned game cannot enter a release build.** Item 5 is how its page is
   measured.

---

## 8. Rules that bind every conversation

1. One phase per conversation. When it completes, rewrite this file for the next
   one and tell the owner to open a new conversation.
2. Name the phase scheme every time: charter Phase N or v3 migration phase N.
3. No dashes as punctuation in prose, comments, commit messages or documents.
   Hyphens inside compound words are fine.
4. No preamble, no recap, no alternatives unless asked. End with a numbered list of
   decisions and the single next action.
5. **A game's conversation runs design through delivery in one uninterrupted
   pass, pre approved, with no stops and no questions,** ending only when the
   delivery patch is ready for the owner to ship. The owner's sole action is the
   `tools/ship.ps1` command. Where any document says to pause, split at a phase
   boundary, wait for sign off, or wait before long output, that is superseded:
   decide with judgment, record the decision and its reason, and keep moving.
   Only a genuine unresolvable contradiction in the source documents or a hard
   technical impossibility halts the run. Still show reproduced measurements in
   the design document before the prose that depends on them. Going live is a
   separate later patch after the owner's manual checks. Set by the owner
   2026-09-20; FIVE LETTERS, the LETTER TRAIL build, TURN TABLE, RING BALANCE and
   ORDER OF OPERATIONS all inherit it.
6. Never reconstruct charter text that cannot be read. Ask only if rule 5's halt
   condition is met.
7. Settled designs are not reopened: LETTER TRAIL, WORD LADDER and PANGRAM, the
   POKER GRID locked decisions, and the two source word list decision.
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
4. The task: goal, what must be settled, deliverable
5. The map from requirements to what exists
6. Where everything is
7. How to work in this environment
8. Rules that bind every conversation
9. Keeping this file

History belongs in ARCHITECTURE2.md section 56, not here. This file only points.
