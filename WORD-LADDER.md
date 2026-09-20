# WORD LADDER

Game seven of twelve. Design document, charter Phase 13. Written on the v3
contract from its first line, following LETTER TRAIL as the worked word game
precedent and DIFFERENCE RELAY as the worked shortest path precedent.

This document supersedes WORD-LADDER-PREP.md, which is deleted in the same change.
Every "proposed" item in the prep is confirmed or overturned below against
measurements reproduced in the container on 2026-09-19. A number the design could
not reproduce is not used. The reproductions are recorded in section 30.

---

## 0. The finding that shapes everything

Par is exact only when the accepted list and the par list are the same list. If
the game accepted every ENABLE word but computed par over a familiar subset, a
player using obscure words would beat par on more than half of all pairs (prep
F2, reproduced at 53.9%), and the verifier could no longer claim par is the
optimum. So WORD LADDER computes par as the exact shortest path over the one
accepted list, and screens every board so that at least one shortest path uses
only familiar words. Par is then both exact and reachable with an ordinary
vocabulary, and "under par" cannot happen, which removes a bucket. This is the
same discipline LETTER TRAIL learned when it abandoned its section 46 full cover
uniqueness claim after measuring it: state only the claim the verifier can prove.

---

## 1. One sentence rule

Change one letter at a time to climb from the start word to the goal word in as
few steps as you can.

This is the rule already stored in the registry row and it fits the hub listing,
requirement 7.1.6.

---

## 2. Cognitive mode

Deduction over a word graph: search and pathfinding through a space of one letter
edits, held against poker knowledge's spatial planning and the pure feedback
deduction of the Wordle family. It is the word graph family's search mode, not the
categorisation mode of LETTER TRAIL nor the arithmetic mode of the deferred number
games. The accepted deviation of the current lineup (BACKLOG.md, the four word
games share the language substrate) stands; the distinct cognitive mode rule is
knowingly not satisfied and is not relitigated.

---

## 3. Substrate and its hardest substrate gate

Substrate: the language, as a graph of four letter words under the one letter
change relation. The hardest substrate gate is the accepted word list shipped as a
runtime asset inside the per game byte budget, which is exactly the stress test
ARCHITECTURE2 section 46 names for this game. LETTER TRAIL ships no runtime
validation list because its words are checked against the day's baked intended
set; WORD LADDER cannot, because a player types free words that must be validated
in the browser. Section 12 measures the cost and confirms it fits.

---

## 4. Session length

Two to four minutes, the middle of the suite. A four rung ladder is a minute of
thought; a seven rung ladder with detours rewards five. It sits between the under
one minute games and the long games, as the slate's session length spread
requires (requirement 7.1.2, satisfied at the suite level, not per game).

---

## 5. Input model

`custom` input, pointer `tap`, the game owning its own keys. The board is a
current word plus a keyboard, not a lattice, so `ui/gridCursor` (a lattice) and
`ui/listCursor` (identity swap of ordered items) both fail to fit, and the game
declares `custom` exactly as DIFFERENCE RELAY does. This is not an engine defect:
the input families of ARCHITECTURE2 section 21 already anticipate a game that owns
its own keyboard, and `custom` is the declaration for it.

Interaction, from prep F5 confirmed in section 12:

1. The current word is shown as four cells. Tap a cell to arm it, then tap a
   letter on the keyboard to change that position. The resulting word is submitted
   as a rung the moment it forms an accepted word one letter from the previous
   rung. A physical keyboard types the whole four letter word and Enter submits.
2. The keyboard is alphabetical, seven across by four rows, because a QWERTY row
   of ten keys at 360 pixels gives 31.2 pixels a key, below the 44 pixel floor
   (prep F5, reproduced), while the alphabetical seven across gives 46.3 pixels,
   which passes. The ladder does not need QWERTY: a rung changes one letter, so
   there is no muscle memory to preserve.
3. A rung that is not an accepted word is refused with "not in the word list", the
   genre's expected refusal (section 17). A rung that changes more than one letter,
   or zero, is refused before the list is even consulted.
4. Undo removes the last rung. Reveal ends the session and shows the par route
   (section 18).

The 44 pixel floor is a build measurement in the page at 360 pixels, not trusted
from the stylesheet (prep F5, section 12), and the render test asserts the key
count and grid so a later restyle that breaks the floor fails loudly.

---

## 6. Puzzle generator strategy

Seeded generation, one RNG stream per puzzle, no salts, the seam VECTOR, ROTATE
LOCK and DIFFERENCE RELAY use. A manifest of 365 verified days is baked; runtime
generation is the fallback past the horizon.

The generator, per day:

1. Build the one letter change graph over the accepted list once (a few
   milliseconds, section 12).
2. Draw a start word from the familiar list. Run breadth first search to every
   reachable accepted word, recording the shortest distance and, on a second pass,
   whether a shortest path using only familiar words exists.
3. Draw a goal word from the familiar words at distance par, where par is in the
   band 4 to 7, whose shortest path can be realised through familiar words alone.
4. Measure the difficulty integer (section 14) and accept the day only if its band
   matches the weekday band (the suite's weekly curve).
5. Record the levers applied (section 6a) so difficulty is auditable.

### 6a. The levers

Difficulty is measured after the fact (section 14), never set. The levers that
bias which boards are drawn, recorded per day in the manifest:

- **Par**, 4 to 7. Early week draws par 4 to 5, late week 6 to 7.
- **Detour count**, the number of rungs that must step away from the goal letter
  by letter (par minus the count of positions where start and goal already
  differ). Early week draws 0 or 1 detours, late week 2 or more. The detour
  distribution is 0: 12%, 1: 41%, 2: 29%, 3: 16%, 4 or 5: 2% (prep F4).

Levers bias the draw; the band is decided by the measured difficulty integer.

---

## 7. Measured generation acceptance rate

Reproduced in the container (section 30). Screening familiar start and goal pairs
for par 4 to 7 with an all familiar shortest path, over the accepted list:

- ESDB 50 accepted, ESDB 35 familiar: 52.0% of sampled familiar pairs pass the par
  and familiar path screen (prep F3 measured 59.2%; the reproduction is lower
  because it requires both endpoints familiar and the reproduced ESDB 50 is
  slightly wider, both of which depress the ratio; the direction and magnitude
  hold).

A 365 day horizon is reachable well inside the attempt ceiling: at 52% pair
acceptance before the band screen, and roughly one band in seven wanted per day,
the generator finds each day in a few thousand attempts, comparable to DIFFERENCE
RELAY. The build's manifest run records the exact attempt tally per day and the
acceptance accounting by reject reason, as the other games do.

---

## 8. State space census

The accepted graph is about 2,340 nodes with mean 7.6 neighbours (section 30), so
about 8,900 directed edges. Breadth first search from any node visits the whole
largest component (about 93% of nodes) in linear time, a few milliseconds. A run's
state is the ladder so far: a list of accepted words from start, each one letter
from the last. The reachable state space of a run is bounded by the graph, and the
verifier enumerates the shortest path structure exhaustively per day (section 9),
so there is no beam and no "best known" label anywhere; par is EXACT.

---

## 9. Exact or bounded verification method

EXACT. `tools/word-ladder-verify.ts` is an independent process that never imports
the generator or the game solver. Per day it:

1. Decodes the day's start, goal and par from the manifest.
2. Builds its own one letter change graph over its own copy of the accepted list.
3. Runs its own breadth first search and asserts the shortest distance from start
   to goal equals the stored par (SOLVABLE, and par exact).
4. Asserts at least one shortest path uses only familiar words (the fairness
   claim, section 11).
5. Recomputes the difficulty integer from scratch and asserts it equals the stored
   value and lies in the weekday band.
6. Replays the generator stream for that puzzle number and asserts a byte identical
   day, and asserts no start and goal pair repeats within the horizon.

The generator's `makePuzzle` runs the same proofs at construction, so a malformed
manifest entry becomes a readable failure rather than an unfair day, the pattern
of every v3 game.

---

## 10. Uniqueness claim

**There is no path uniqueness claim, and none is made.** A word ladder ordinarily
has many shortest paths; the number of shortest paths is in fact one of the
difficulty candidates (section 14). Claiming a unique route would be false and the
verifier would fail it. The claim the verifier proves is SOLVABLE with an exact
par, not a unique path. This is stated exactly, never aspirationally, as the
HANDOFF requires.

---

## 11. Fairness claim

**At least one shortest path from start to goal uses only familiar words.** This is
the one fairness claim, and it is what makes par reachable with an ordinary
vocabulary. It is proved by the verifier's independent breadth first search over
the familiar subgraph: the familiar only distance from start to goal must equal the
accepted list par. Because both endpoints are drawn familiar and the screen holds,
a player who never leaves familiar words can always match par. Par exactness
depends on the single accepted list (the section 0 finding, prep F2), and the
verifier proves both par and the familiar path against its own list.

---

## 12. Word lists and the deny list, the assets

The family familiarity source decision, prep open question 3, the one cross game
decision this design must not defer.

**Decision: WORD LADDER adopts ESDB, and the four word games do NOT converge on one
source.** LETTER TRAIL keeps ENABLE intersected with wordfreq; WORD LADDER, and by
extension PANGRAM and FIVE LETTERS, adopt ESDB (ENABLE intersected with SCOWL size
levels). The reason is measured, not aesthetic:

- wordfreq top 30,000 intersected with ENABLE gives 1,877 four letter words, but
  it is a frequency list from a corpus, so it admits proper nouns and brand names
  that happen to be lowercase four letter tokens. A probe of 48 common four letter
  names and brands found 24 of them in the wordfreq list (abba, alan, alba, alec,
  alfa, amin, anil, anna, axel, baba, babu, bach, beth, carl, jane, john and
  more), against 8 in the ESDB 50 list, and the ESDB survivors are all also common
  words (dale, dean, ford, glen, john, mark, mike, visa). Reproduced in section 30.
- LETTER TRAIL can use wordfreq because its answer words are hand curated into
  themes and are only ever traced inside a grid, never displayed as isolated
  tokens, so proper noun contamination is curated out per theme. WORD LADDER
  displays every rung as a standalone four letter word and cannot hand curate a
  daily set, so a source that admits proper nouns as valid rungs would confuse
  players. ESDB, a spell checker word list, excludes proper nouns by construction
  (they were the uppercase entries that fall out on the American filter).

The four word games therefore keep two family sources, each offline only, each
license clean, each recorded in ASSETS.md with its own notice. Games may not import
from each other, so the shared derivation is a tools step (`tools/word-list.ts`,
built at the build phase) that writes each game its own committed copy; a shared
list is never fetched at runtime.

**Accepted list.** ESDB size 50, American spelling, in ENABLE, length four,
lowercase ASCII, minus the deny list, plus a small owner curated set of plainly
common ENABLE words that ESDB 50 rejects (prep F3). Reproduced size: about 2,340
words, about 5.5 KB gzipped as sorted text (prep F6 said 5.3 KB). This is the only
runtime word asset. The page lands near 34 KB against the 150 KB budget (prep F6),
measured against section 26 at the build.

**Familiar list.** ESDB size 35 on the same filters, minus the deny list. About
1,916 words. Offline only: it drives the fairness screen and the generator, and is
never shipped, because the runtime never needs to know which accepted words are
familiar.

**The deny list.** ESDB's own usage note filters remove only the worst terms; a
probe of 20 common vulgar words and slurs found the accepted list still contained
several, and the reproduction removed 14 from the accepted list and 7 from the
familiar list with an owner reviewed deny list. **Required:** a committed deny list
(`data/word-lists/deny.txt`), reviewed by the owner, subtracted from the accepted
list, the familiar list and the answer draw pool. Rejecting a vulgar word a player
types, as "not in the word list", is acceptable. The deny list is owner curated at
the build, from the probe seed plus a public profanity list; this design fixes the
mechanism and the reproduced counts, and the build commits the reviewed file.

**Hand additions.** The plainly common ENABLE words ESDB 50 rejects (prep F3
sampled ryes, pled, dews, nana, pixy as the annoying rejections, and oats, thru,
demo, scam, heck as the useful additions ESDB 50 already includes over 35). The
build's list preparation names the small hand added set and commits it; this design
records that the mechanism is a one time curation, not daily content, so it does
not breach the zero daily content cost rule.

**ASSETS.md rows** (added with this design as pending the build's committed files):
the ESDB derived accepted list with its SCOWL notice and license conditions
(sizes 80 and below only, American spelling code A only, the notice ships on the
About page), the ENABLE dictionary used offline for the validity filter, and the
owner reviewed deny list. The exact committed word data files are written at the
build, so the ASSETS rows are added now as the family source decision and deferred
in their file hashes to the build, exactly as the HANDOFF permits.

---

## 13. Decomposition result

ARCHITECTURE2 section 12.1. A word ladder does not decompose: it is a single path
from start to goal, not a set of independent sub puzzles that could be solved
separately. There is no constraint dependency graph to split, because the whole
puzzle is one dependency chain by construction. The decomposition check records
"single path, not decomposable" as an n/a with this paragraph as the written
reason, which the gate accepts only with a person's reason (NEW_GAME.md section 6).

---

## 13a. Symmetry result

ARCHITECTURE2 section 12.2. The one letter change relation is symmetric: if A is a
rung from B then B is a rung from A. So the ladder from goal to start is the
reverse of the ladder from start to goal, at the same length. This is a real
symmetry and it is handled, not ignored: the generator fixes the presented
direction as start then goal, and the difficulty integer (section 14) is measured
from the start, so the reverse board is the same puzzle read backwards and is not a
second distinct day. The verifier's no repeated pair check treats (start, goal) and
(goal, start) as the same pair and rejects either if the other has been used, so
the reverse cannot ship as a separate day. The symmetry check records "edge
relation symmetric, reverse pair rejected as a repeat" as a pass, proved by the
verifier's pair check with a positive control in the generator test.

---

## 14. One emergent integer difficulty measure

**The search ball below par: the count of accepted words within par minus one of
the start.** It is emergent (a property of the finished board and the graph, not a
generator knob), integer valued, reproducible, and measured by the same breadth
first search the verifier runs.

Par alone cannot be the difficulty integer: par has exactly four distinct values,
4 to 7 (prep F4, reproduced), which cannot fill seven bands, the DIFFERENCE RELAY
lesson. The search ball has about 1,500 distinct values with clean septile edges,
reproduced at [291, 441, 665, 895, 1147, 1576], almost identical to the prep's
[294, 441, 654, 882, 1109, 1526]. The larger the ball, the more accepted words a
player must consider before the goal comes into reach, which tracks the human
experience of a hard ladder: many plausible rungs, few of them progress.

**Held as a hypothesis until the build's calibration study confirms seven band
resolution.** The septiles reproduce cleanly here, so the confidence is high, but
the manual check must include a few ladders at each band edge to confirm the ball
tracks felt difficulty and does not merely track the density of the start word's
neighbourhood. **Named fallback:** par combined with detour count as a composite
band key (a longer par with more forced detours is harder), which the build would
substitute and recalibrate if the ball fails to track felt difficulty. The
difficulty measure is settled only when the build's `data/word-ladder/study.json`
calibration confirms seven band resolution; this document commits to the search
ball as the hypothesis and the composite as the contingency.

The band edges become the septiles of the screened sample, written by
`tools/word-ladder-calibrate.ts`. Changing an edge invalidates every stored band,
so it is a manifest regeneration, not a tweak, the DIFFERENCE RELAY discipline.

---

## 15. Seven band calibration evidence

ARCHITECTURE2 section 9.2. The calibration study samples screened boards, records
the search ball for each, and writes the septile edges to
`data/word-ladder/study.json`. The reproduced septiles ([291, 441, 665, 895,
1147, 1576]) already show seven populated bands with monotone edges and no band
under 1% of the sample, which is the resolution DIFFERENCE RELAY's par failed to
reach. The build reruns the study on the shipped list and commits the edges; the
generator test recomputes the head of the study and asserts the edges, so a list
change that shifts the distribution fails loudly.

---

## 16. Monday versus Sunday player feel statement

Monday: par 4 or 5, zero or one detour, a small search ball, a ladder that reads
as a straight climb with one choice. Sunday: par 6 or 7, two or more detours, a
large search ball, a ladder that forces a step away from the goal before it can be
reached and offers many plausible wrong rungs. The weekday band map is the suite's
standard gentle curve, easier early in the week, following the convention players
expect (requirement 6.3.4 at the suite level).

---

## 17. Every refusal and announcement

Every refused action is a `Rejection` value with a stable code and a plain
announce string read into the a11y live region by the engine:

- `not-a-word`: the typed rung is not in the accepted list. "Not in the word
  list." This is the genre's expected refusal.
- `not-one-change`: the rung differs from the previous word by other than exactly
  one letter. "Change exactly one letter."
- `same-word`: the rung equals the previous word. "That is the same word."
- `already-used`: the rung repeats a word already on the ladder, which would be a
  cycle. "You already used that word."
- `game-over`: an action after the day is finished. "Today's ladder is finished."

Announcements on state change: the current word and its distance to the goal are
never announced as a number (that would leak par progress and is a share leak
concern), but the rung count and whether the last rung was accepted are announced,
and on finish the tier and rung count against par.

---

## 18. Failure model and histogram buckets

**No loss state. `hasWinLoss` is false**, matching the registry row. Prep open
question 1: a rung limit is not needed; the reveal escape is enough. A player
climbs at their own pace and either reaches the goal or reveals the par route,
which ends the session as an ungraded finish. Every session is shareable, the
suite discipline.

Buckets, five, matching the registry `bucketCount` of 5:

0. **par** (reached the goal in exactly par rungs), the distinguished bucket.
1. **par plus 1**
2. **par plus 2**
3. **par plus 3 or more**
4. **revealed** (ended by reveal without reaching the goal)

Because at least one shortest path is all familiar (section 11), reaching par is
always possible, so "under par" cannot occur and is not a bucket. Reveal is a
distinct bucket, not a loss, because "finished by revealing" is a different fact
from "did not play", the suite's `ungraded` distinction.

The five tiers for the end screen map to the five buckets in order (par is the best
tier, revealed the last), using the suite tier tokens.

---

## 19. At least two telemetry patterns

ARCHITECTURE2 section 13. WORD LADDER implements three approved patterns, all
local, none leaving the browser:

1. **Micro replay path** (`micro-replay-path`). The run log records, per rung the
   player committed, whether that rung moved closer to the goal, stayed level, or
   moved farther (its change in shortest distance to the goal). The artifact
   replays that as one glyph per rung.
2. **Comparative friction** (`comparative-friction`). The run log records how many
   rungs were refused before each accepted rung, the friction of the climb, which
   distinguishes a confident climber from one who guessed at the keyboard.
3. **Emergent fingerprint** (`emergent-fingerprint`), section 25.

Two would satisfy the contract; three is chosen because the closer or farther
signal and the refusal count are both cheap to log and both make the fingerprint
richer.

---

## 20. Exact telemetry record shape

The run log is the player's own actions, held on device, never sent anywhere
(ARCHITECTURE2 section 13.1, HANDOFF rule 10). It carries no letter, no word and no
distance value, so nothing the mapper reads can reveal the goal word or the par
route.

```text
WordLadderRunLog
{
  v: 1
  entries: RungEntry[]      // one per accepted rung, in climb order
  revealed: boolean         // did the session end by reveal
}

RungEntry
{
  index: number             // 0-based order of this rung on the ladder
  progress: -1 | 0 | 1      // farther | level | closer to the goal
  refusedBefore: number     // rungs refused before this one was accepted
}
```

`progress` is the sign of the change in shortest distance to the goal, three
values, never the distance itself, so the reader cannot reconstruct par or the
goal. `refusedBefore` is a pure run fact. `index` is climb order. No field names a
letter, a word or a position, so the leak probes of section 24 pass by
construction. The goal word is not in the run log.

Prep open question 2, does the share mark farther rungs: yes, `progress` is signed,
because an honest replay of a climb that stepped away and recovered is more
interesting than one that hides it, and a farther token reads as "took the scenic
route", not as scolding. The token choice (section 21) uses the neutral tier
tokens, not a red miss token, precisely so it does not read as a rebuke.

---

## 21. Exact mapping function

The mapper is pure, `mapTelemetry(runLog) -> ArtifactModel`, no hidden puzzle data
introduced (ARCHITECTURE2 section 13.3).

- **Source field** `entries`, one row per accepted rung in climb order, capped at
  `maxRows` (seven, which fits the nine line grammar with title and URL). A ladder
  longer than seven rungs shows its first seven; the title carries the true rung
  count.
- **Per row token, from `progress`**: closer maps to the best token, level to the
  partial token, farther to the weak token. One token per rung, so every row is
  one token wide and all rows are the same width.
- **Token family** the closed suite vocabulary of ARCHITECTURE2 section 14; the
  game emits semantic tokens, never codepoints.
- **Grammar** B, SequenceLadder (ARCHITECTURE2 section 15): one row per rung in
  climb order, one token per row, same width in every row.
- **Archetype classification** CLIMBER / WANDERER / GUESSER / REVEALER, from the
  refusal rate and whether the climb was monotone (section 19), deterministic
  thresholds stated in the module.
- **Fingerprint transformation** section 25.

Row width: every row is one token, so all rows are the same visual width and
nothing is padded (NEW_GAME.md section 8 item 3).

---

## 22. Clipboard artifact

Title line, token rows, bare URL, nine lines maximum (ARCHITECTURE2 section 15).
Worked examples in section 27. The title carries game name, puzzle number, and the
rung count against par (for example "WORD LADDER #248 5/4" for a five rung climb on
a par four board, or "WORD LADDER #248 X/5" for a reveal). No word, letter, or
distance appears anywhere. The URL is the suite URL, appended by the engine.

---

## 23. Graphic card artifact specification

The canonical `ArtifactModel` drives both the text share and the 1200 by 900
graphic card, no second scoring path (ARCHITECTURE2 section 17). The card shows the
game title, puzzle number, the short result (rungs against par), the fingerprint
visualisation (the climb as a line of closer, level and farther steps), the
archetype, and the platform URL. It names no word and shows no letter.

---

## 24. Share leak test result

ARCHITECTURE2 section 16. The generated matrix of good, average and bad artifacts
passes all five probes, each implemented in the module and driven by positive
controls in the telemetry test:

- **Position leak**: rows carry only the three tier tokens, never a letter or a
  word, so token position corresponds to climb order, not to any answer position.
  The probe fires if any token outside the three is present.
- **Answer property leak**: the rows are exactly what the fingerprint's progress
  signs rebuild, so nothing but the run reached them. The goal word and par are
  never in the mapper's inputs.
- **Ordering leak**: the rows are in climb order, which is the player's order, not
  the puzzle's structure; there is no fixed puzzle ordering to leak.
- **Shape leak**: every row is one token wide and there are at most seven, so the
  silhouette cannot reconstruct the ladder.
- **Title leak**: the title encodes the rung count and par, both facts of the
  player's run, never the goal word or the route.

---

## 25. Fingerprint definition

ARCHITECTURE2 section 18. One point per accepted rung: x is the rung index, y is
the running progress (a cumulative sum of the progress signs, so the line climbs
toward the goal and dips on a detour), and the shape marks a rung that was refused
before it landed as a correction. It describes the shape of the climb, never the
words. The engine's fingerprint type carries no puzzle data by construction.

---

## 26. Browser fallback budget

Web Share where available, then clipboard, then a manual copy box (requirement
3.5.5), the engine's share delivery, unchanged. The per game page byte budget is
measured at the build against section 26 of ARCHITECTURE.md; the accepted list
(about 5.5 KB gzipped) is the game's one extra asset and the prep's estimate lands
the page near 34 KB, well inside 150 KB.

---

## 27. Worked share examples

Grammar B, one token per rung, in climb order. Tokens: closer = best (star),
level = partial (square), farther = weak (circle). The title carries rungs against
par.

A par four climb, all forward, on a par four board (the best tier):

```text
WORD LADDER #248 4/4
star
star
star
star
dailykit.providentia.games
```

A six rung climb on a par four board, with one detour and recovery (par plus 2):

```text
WORD LADDER #248 6/4
star
star
circle
star
star
star
dailykit.providentia.games
```

A reveal, after three rungs that never reached the goal:

```text
WORD LADDER #248 X/4
star
circle
star
dailykit.providentia.games
```

No example names a word, a letter, or a distance. Every row is one token wide.

---

## 28. All ten contract pieces

The v3 `GameModuleV3` (ARCHITECTURE2 section 3):

1. **identity**: id word-ladder, display WORD LADDER, epoch 2026-01-05 (a Monday,
   so puzzle 1 is the gentlest band), share URL the suite URL, accent hue 128,
   monospace board font, the one sentence rule.
2. **manifest**: index at /data/word-ladder/manifest.index.json, seven day
   lookahead.
3. **parsePuzzle / generatePuzzle**: decode the day, or generate past the horizon,
   both through `makePuzzle` which proves par and the familiar path.
4. **state**: the ladder as a list of accepted words; serialize is the word list,
   deserialize rebuilds and revalidates every rung against the rules so no illegal
   save loads.
5. **apply / inspect**: apply a typed rung or a reveal, returning a new state or a
   rejection; inspect returns ongoing or the finished v3 outcome.
6. **difficulty**: the search ball, recomputed from the puzzle, never read from the
   manifest.
7. **telemetry / shareArtifact**: the run log and the pure mapper of sections 20
   and 21.
8. **render**: mount the current word, the alphabetical keyboard, the ladder so
   far, and the run and reveal controls; update on state change; unmount.
9. **input**: `custom`, pointer tap, the game's own keys.
10. **help**: the worked example of section 31.

---

## 29. The abstraction test, requirement 7.4

The zero engine changes rule. WORD LADDER declares `custom` input and owns its
keyboard, so it needs no cursor change; the one anticipated candidate for an engine
change, a shared alphabetical keyboard widget, is deliberately kept inside the game
for now, because only WORD LADDER and (later) FIVE LETTERS need it and building it
once inside WORD LADDER is the honest first instance. **This is an anticipation,
not a result.** Whether a shared keyboard widget should be extracted is a defect to
be logged after the build's manual mobile check, never decided inside the build. If
PANGRAM and FIVE LETTERS each rewrite the keyboard, that is the engine seam that
does not exist yet, and it is logged then. No claim that the test resolves to zero
changes is made in this design.

---

## 30. Measured evidence

All figures reproduced in the container on 2026-09-19, before this document's prose
was written, using ENABLE (md5 33f2b09e2d9dfb732fa16b5f05a5a8d1, matching the prep)
and SCOWL/ESDB at commit 1e5b7d3, parsed from `scowl-pre.txt` size levels. The
reproductions bracket the prep's throwaway probe closely; where they differ the
direction and magnitude hold, and no prep number the container could not
substantiate is used.

| Measurement | Prep | Reproduced |
|---|---|---|
| Four letter familiar core in largest component | 93% | 93% |
| Four letter familiar mean neighbours | 8.0 | 7.6 |
| Four letter familiar shortest distance mode | 5 | 5 |
| Obscure words beat familiar par (F2) | 55.3% | 53.9% |
| ESDB 50 acceptance, par 4 to 7, familiar path | 59.2% | 52.0% |
| Par distinct values | 4 | 4 |
| Search ball distinct values | (many) | about 1,500 |
| Search ball septile edges | 294/441/654/882/1109/1526 | 291/441/665/895/1147/1576 |
| QWERTY 10 across key width at 360 px | fails (~32) | 31.2 px, fails |
| Alphabetical 7 across key width at 360 px | 44.6 px, passes | 46.3 px, passes |
| Accepted list gzipped | 5.3 KB | 5.5 KB |
| Vulgar or slur probe hits in accepted list (F7) | 7 of 20 | 12 of 20 (deny removes 14) |
| wordfreq proper noun leak vs ESDB (family source) | (not measured) | 24 vs 8 of 48 probed |

The wordfreq versus ESDB proper noun comparison is the new measurement that settles
the family source (section 12); the rest confirm the prep. The build recalibrates
the difficulty septiles on the exact shipped list (section 14), because the deny
list and hand additions shift the accepted list slightly from the probe.

---

## 31. Help content

One screen, a worked micro example, dismissible in one tap, re openable forever
(requirement 3.7). The example is a tiny three rung ladder (for example COLD to
CORD to CARD to WARD to WARM, or a shorter one) shown as a list of rungs with the
one changed letter marked, with a text equivalent. The help text is the one
sentence rule plus the four facts a new player needs: change exactly one letter a
step, every step must be a real word, the shortest climb is par, and you can reveal
the answer if you are stuck. A first session serves an easier board (short par, no
detours) via `firstSessionPuzzle`, contract piece 11.

---

## 32. Explicit risks

ARCHITECTURE2 section 44 item 28.

1. **The `not-a-word` refusal fights genre expectation.** A player who types a real
   English word that ESDB 50 does not include (prep F3 lists ryes, pled, dews as
   examples) is told "not in the word list" and may feel the game is wrong. The
   hand additions (section 12) reduce this, and the reveal escape means it never
   blocks finishing, but it cannot be eliminated without accepting the whole of
   ENABLE, which would break par exactness (section 0). Accepted risk, mitigated by
   curation.
2. **The search ball may track neighbourhood density, not felt difficulty.** The
   septiles reproduce cleanly, but the manual check must confirm at band edges that
   a large ball actually feels hard rather than merely starting in a dense part of
   the graph. The named fallback (par plus detours) is ready if it does not.
3. **The accepted list is a runtime asset a determined player can read.** Anti
   spoiler is light obfuscation only (requirement 8.4): the manifest hides the goal
   and par through the codec, but the accepted list is plaintext in the bundle by
   necessity, and a player who opens the network tab can see the whole word list,
   though not which word is today's goal. Stated plainly, as the requirement
   demands.
4. **Two family word sources may confuse future maintenance.** LETTER TRAIL uses
   wordfreq and WORD LADDER uses ESDB, so the four word games do not share one
   list. The reason is measured (section 12) and recorded in ASSETS.md and
   BACKLOG.md so a future maintainer does not "unify" them and reintroduce proper
   noun rungs.
