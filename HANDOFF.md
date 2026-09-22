# HANDOFF

The note passed from one conversation to the next. It says where the project
stands, what this conversation must do, what must not be done, and where every
file this conversation needs lives. It is rewritten at the end of every phase
and it describes exactly one conversation: the next one.

| Field | Value |
|---|---|
| Written | 2026-09-22, after an interruption that pushed five built games live |
| Built on | Base commit `fcace772ae5b8c83e5e26e9461c6b726d990579d` ("handoff break in process to push games live"), branch `claude/five-games-live`, commit subject "five games pushed live, ahead of manual mobile check" |
| For the conversation | **Charter Phase 13: LETTER TRAIL build**, resumed, game six in slate order and the last word game, build through delivery in one run from its settled design |
| Phase scheme | Charter phases, Section 9 of the project instructions. The v3 migration phases are complete |
| Before any work | LETTER-TRAIL.md is the settled design, written 2026-09-19. It is built as written; it is not redesigned |
| Next after this | TURN TABLE, RING BALANCE, ORDER OF OPERATIONS, each in its own conversation, each design through delivery |

---

## 0. What happened since the last LETTER TRAIL handoff

The owner broke into that conversation in chat, mid run, asking which built
games sat on `live` versus `planned`, then directed the five built and gated
games live now, skipping the manual mobile device check. Nothing about LETTER
TRAIL changed. See ARCHITECTURE2.md section 56, "Charter Phase 13 interruption:
five games pushed live," for the full account.

---

## 1. Reading order

First, clone `main` into the container; section 7 item 1 has the commands and
the merge check. The project file copies are not the code and may be stale.

Then read these, in this order, and nothing else unless a section below names it.
Read only the named sections of the long documents: the run has a finite tool
budget, and reading whole files is what exhausts it. Use `grep -n '^## '` to find
a section's line range and `sed -n` to read just that range.

1. **HANDOFF.md**, this file.
2. **LETTER-TRAIL.md**, whole: it is the specification being built. Section 0 is
   the finding that shaped it; sections 5, 6, 9, 12, 14 and 21 are the ones the
   code follows most closely.
3. **ARCHITECTURE2.md**: the section 46 LETTER TRAIL note, section 44 (the
   authoring contract), and the section 56 entries "Charter Phase 13, FIVE LETTERS
   design and build" and "Charter Phase 13 interruption: five games pushed live."
   Sections 3, 9 to 18 and 21 only where a decision turns on them.
4. **FIVE-LETTERS.md** sections 0, 5, 9 and 30, and `src/games/five-letters/`:
   the most recent worked word game, design and build, with the codec only
   verifier, the exhaustive study, the measured keyboard and the leak probes with
   positive controls.
5. **PANGRAM.md** sections 0 and 12, and `src/games/pangram/`: the manifest
   carried answer list, which is LETTER TRAIL's shape too (its words are checked
   against the day's baked set).
6. **BACKLOG.md**, the entries logged 2026-09-19, 2026-09-20, 2026-09-21 and
   2026-09-22.

Precedence: the working tree, then ARCHITECTURE2.md, then ARCHITECTURE.md, then
the project instructions. If this file disagrees with ARCHITECTURE2.md, this file
is stale; say so.

---

## 2. Where the project stands

**Suite.** Twelve games in `src/shell/registry.ts`: POKER GRID, VECTOR, CIPHER,
ROTATE LOCK, DIFFERENCE RELAY, WORD LADDER, PANGRAM, FIVE LETTERS (all eight
live); LETTER TRAIL (designed, not built); TURN TABLE, RING BALANCE, ORDER OF
OPERATIONS (planned, not designed).

**Two open gate exemptions, both for `manual-mobile-check` only,** in
`src/engine/certification.ts`: `manual-mobile-2026-09-16` for POKER GRID,
CIPHER, VECTOR, expiring 2026-12-15; `manual-mobile-2026-09-22` for ROTATE
LOCK, DIFFERENCE RELAY, WORD LADDER, PANGRAM, FIVE LETTERS, expiring
2026-12-21. Neither is this conversation's work to close; do not touch them
unless LETTER TRAIL's own build needs the mechanism.

**Open items another game's work must not trip over** (BACKLOG.md):

- WORD LADDER still accepts five newly denied rungs and makes an invalid share on
  an immediate reveal.
- PANGRAM still accepts seven words denied for FIVE LETTERS.
- PANGRAM's and FIVE LETTERS' horizons must be extended before 2027-01-04.
- The family deny list's 67 PANGRAM and 34 FIVE LETTERS additions await owner
  review.
- MANUAL-CHECKS.md has no dedicated section yet for ROTATE LOCK, DIFFERENCE
  RELAY or WORD LADDER; only a placeholder Section 9. Needed before
  2026-12-21.

**LETTER TRAIL uses a different word source on purpose.** ENABLE intersected with
wordfreq's top 30,000, not SCOWL/ESDB (ARCHITECTURE2 section 56, "two family word
sources"; BACKLOG.md). The deny list still applies to it. wordfreq is a Python
package; `pip install wordfreq --break-system-packages` reaches pypi from the
container. It is a build time input only and is never committed.

**Green baseline to regress against,** measured 2026-09-22 in the container on
`claude/five-games-live` at base `fcace772`:

| Gate | Result |
|---|---|
| Typecheck | three tsconfigs, zero errors |
| Dependency check | layers verified |
| Tests | 95 files, 1,169 tests |
| Verifiers | all eight live games, each 365 days |
| Production build | real `npm run build` admits all eight live games with the service worker |
| Byte budget | About 4.0, hub 18.6, CIPHER 26.7, PANGRAM 27.5, DIFFERENCE RELAY 27.7, POKER GRID 28.8, ROTATE LOCK 29.3, VECTOR 29.0, WORD LADDER 33.4, FIVE LETTERS 38.6 KB gzipped |
| Certification | all eight live games production safe |

**Run the gate with `tools/gate.sh`.** A single container command is cut off at
300 seconds, and the whole gate takes about eight to ten minutes now that eight
verifiers run (VECTOR's about 70 seconds, ROTATE LOCK's about 65, PANGRAM and
DIFFERENCE RELAY each a few seconds, the tests about 130). So start it detached
and poll the log:

```
setsid nohup npm run gate > /tmp/gate.log 2>&1 < /dev/null &
cat /tmp/gate.log
```

It prints one PASS or FAIL line per step, finds every `:verify` script in
package.json, including a new game's, keeps each step's full output in
`/tmp/gate.<step>.log`, and ends with `DONE status 0` when green.

---

## 3. Preconditions to check first

1. **The five games live patch merged.** `src/shell/registry.ts` shows ROTATE
   LOCK, DIFFERENCE RELAY, WORD LADDER, PANGRAM and FIVE LETTERS as `"live"`,
   and `data/*/certification.json` exists for all eight live games. If not,
   say so and stop.
2. **The baseline in section 2 still holds.**

Nothing about the two open exemptions or the missing MANUAL-CHECKS.md sections
is this conversation's work.

---

## 4. The task: LETTER TRAIL, build through delivery

One uninterrupted run, pre approved (section 8 rule 5): build the game on the v3
contract exactly as LETTER-TRAIL.md specifies, reproduce every number the design
records before relying on it, test it, run the full gate, and package the patch.

What the build must settle, at least:

1. **Reproduce the design's measurements first.** The word list counts of its
   section 12 (12,522 words, the length bands), its generation acceptance, its
   band edges and its section 30 figures. A number that does not reproduce is
   recorded in LETTER-TRAIL.md as an as built note with the reproduced value and
   the reason, never silently replaced. Only a finding that makes the design
   unbuildable halts the run (section 8 rule 5).
2. **The word source.** ENABLE intersected with wordfreq, as designed, minus
   `data/word-lists/deny.txt`. Write a rebuildable derivation tool, as
   `tools/pangram-words.ts` and `tools/five-letters-words.ts` are, recording the
   wordfreq version.
3. **The deny list.** Probe the answer list for offensive substrings, as PANGRAM
   and FIVE LETTERS did, and extend the family file for any length the design
   uses; list every addition in the design's as built notes for owner review.
4. **Where the words travel.** LETTER TRAIL checks words against the day's baked
   set, so the browser ships no dictionary; follow PANGRAM's manifest carried
   list, in monthly chunks.
5. **The independent verifier imports only the codec,** as PANGRAM's and FIVE
   LETTERS' do.
6. **Input at the 44 pixel floor, measured.** Headless Chromium works in the
   container: `npm i playwright-core@1.56.1` in a scratch directory, launch
   `/opt/pw-browsers/chromium-1194/chrome-linux/chrome`, serve a throwaway certify
   build with `npx vite preview --outDir dist-certify`, close the help dialog, and
   read cell sizes at 360 by 740. FIVE-LETTERS.md section 5 shows the method.
7. **Telemetry, leak probes with positive controls, and the registry row**
   (hue 48, four buckets, `hasWinLoss` false): check each against the built
   module and correct any that disagree. Hue 48 carries the accent contrast defect
   in BACKLOG.md; measure white text on its fill and fix within the game's CSS if
   it fails AA.
8. **The certification plan.** Follow the shape `tools/certify.ts` now carries
   for ROTATE LOCK, DIFFERENCE RELAY, WORD LADDER, PANGRAM and FIVE LETTERS:
   `newGamePlan` for the automatable steps, an `n/a` with a design citation for
   decomposition and symmetry where the design says there is nothing to split,
   and leave `offline-smoke` and `manual-mobile-check` as the stub's empty
   lists (a skip, which the gate refuses) unless the owner directs otherwise in
   chat. Do not add a `GateExemption` for LETTER TRAIL without that direction:
   the two on file each name the games they cover and neither extends by
   default.

Deliverable: the complete game, tools, data, tests, LETTER-TRAIL.md's as built
notes, the ASSETS, BACKLOG, ARCHITECTURE and ARCHITECTURE2 updates, MANUAL-CHECKS.md
section 10, this file rewritten for TURN TABLE, and
`letter-trail-build.patch`.

---

## 5. The requirements mapped to what exists

| Requirement | Exists today as | Notes |
|---|---|---|
| Whole word game template, design and build | FIVE-LETTERS.md, `src/games/five-letters/`; PANGRAM.md, `src/games/pangram/` | Measure first, one list, codec only verifier |
| Manifest carried answers | `src/games/pangram/pangram-codec.ts`, `tools/pangram-generate.ts` | Monthly chunks |
| Rebuildable word lists | `tools/five-letters-words.ts` | Offline only; inputs never committed |
| Exhaustive or seeded study rerun by a test | `tools/five-letters-calibrate.ts`, `tests/games/five-letters/generator.test.ts` | |
| Leak probes with positive controls | `tests/games/five-letters/telemetry.test.ts` | |
| Detached full gate | `tools/gate.sh`, `npm run gate` | |
| Scaffold, gate plan | `tools/new-game.ts`, `GAME_PLANS` in `tools/certify.ts` | `npm run new-game -- --id letter-trail` adopts the planned row |
| A second, later `GateExemption`, if a game must ship ahead of its device check | `src/engine/certification.ts`, `GATE_EXEMPTIONS` | Dated, named, expiring; never fabricate a `manual` pass instead |

---

## 6. Where everything is

| File | What it is |
|---|---|
| HANDOFF.md | This file |
| LETTER-TRAIL.md | The settled design being built |
| FIVE-LETTERS.md, PANGRAM.md, WORD-LADDER.md | The built word game designs |
| ARCHITECTURE2.md | Active architecture, v3 contract, gate, concept notes, migration and phase log |
| ARCHITECTURE.md | The v2 record, the file manifest, every settled decision |
| ASSETS.md | Every shipped asset and every word list row |
| BACKLOG.md | Everything deliberately not built |
| NEW_GAME.md | The authoring procedure; section 2 carries the one run rule, section 5 the gate |
| MANUAL-CHECKS.md | The owner's device checks; sections 7 and 8 are PANGRAM and FIVE LETTERS, section 9 is a placeholder for the three games pushed live 2026-09-22 |
| tools/ship.ps1 | The owner's one command delivery |

---

## 7. How to work in this environment

All development happens in the container. The owner runs only manual device
checks, UAT and the one delivery command.

1. **Start from a fresh clone of `main`:**

   ```
   git clone -q https://github.com/BigBadChicago/DAILYKIT.git dk && cd dk
   git merge-base --is-ancestor fcace772 HEAD && echo BASE_OK
   git log --format=%s fcace772..HEAD | grep -Fx "five games pushed live, ahead of manual mobile check"
   npm ci
   ```

   Both checks must pass before any work. Record the commit the clone checked out;
   it is this run's base and the next handoff's base.
2. **Work on a local branch,** for example `git switch -c claude/letter-trail-build`.
3. **Set a local git identity:** `git config user.email "claude@dailykit.local" && git config user.name "Claude"`.
4. **Word list inputs.** ENABLE from `https://raw.githubusercontent.com/dolph/dictionary/master/enable1.txt`
   (md5 33f2b09e2d9dfb732fa16b5f05a5a8d1) and wordfreq from pypi, both kept out of
   the repository. ESDB, for reference, is at
   `https://codeload.github.com/en-wl/wordlist/tar.gz/1e5b7d3`.
5. **The full gate before packaging:** `npm run gate` detached (section 2), then
   the game's page measured in a throwaway copy with the row set live and
   `DAILYKIT_CERTIFY_BUILD=1 npx vite build` then `npx tsx tools/budget.ts
   dist-certify`. Never commit the live flip.
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
   measured; a throwaway, uncommitted patch to `releasable()` in a scratch copy
   of the tree is how a release shaped build with the service worker is
   measured for offline smoke, as recorded for ROTATE LOCK and for the four
   games pushed live 2026-09-22.

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
   separate later patch after the owner's manual checks, unless the owner
   directs otherwise in chat, as happened 2026-09-22. Set by the owner
   2026-09-20; the LETTER TRAIL build, TURN TABLE, RING BALANCE and ORDER OF
   OPERATIONS all inherit it. FIVE LETTERS ran under it.
6. Never reconstruct charter text that cannot be read. Ask only if rule 5's halt
   condition is met.
7. Settled designs are not reopened: LETTER TRAIL, WORD LADDER, PANGRAM and FIVE
   LETTERS, the POKER GRID locked decisions, and the two source word list decision.
8. Anything outside the phase goes to BACKLOG.md with a one line rationale.
9. Every file added or repurposed is recorded in the architecture documents.
10. v3 telemetry is the player's own run log on device. Any proposal that sends it
    anywhere is refused.
11. The code comes from a fresh clone of GitHub `main`, never the project file
    copies, and every delivery is one patch through `tools/ship.ps1`. The rewritten
    HANDOFF.md travels inside that patch and names its base commit, branch and
    subject.
12. A gate exemption is a dated, named, expiring entry in `GATE_EXEMPTIONS`,
    never a fabricated `manual` pass. It names exactly the games and the step
    it covers and does not extend to a game it does not name. Set 2026-09-22,
    after the five games were pushed live that way.

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
