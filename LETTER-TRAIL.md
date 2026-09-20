# LETTER TRAIL

The design document for game six of twelve, charter Phase 13. It is written before
any code, and it is the exit condition of NEW_GAME.md section 2 step 1: it answers
every item of ARCHITECTURE2.md section 44, settles the six open decisions in the
handoff section 4.1, and resolves the one place where the section 46 preferred
contract does not survive contact with a real word list. Every number in it was
measured in the container, not asserted; the sizing scripts and their outputs are
summarised in section 30.

The genre name of the source product does not appear here or in the shipped game.
This game is LETTER TRAIL, its layout is a plain rectangular grid, and section 23
records what trade dress it must not copy.

---

## 0. The finding that shapes everything

The handoff and ARCHITECTURE2 section 46 name a preferred contract of "exact word
placement search over the answer list, uniqueness of the full cover." I built that
search and measured it before designing anything on top of it, because if it is not
achievable the game is not buildable and the rest of the document is fiction.

**It is not achievable at any playable board size with a fair word list.** A dense
rectangle of common letters admits many different ways to tile it into dictionary
path words. Measured unique cover rates: four by four about 1.0 percent, five by
four about 1.0 percent, five by five and larger 0.0 percent, and where a unique
cover did exist the difficulty integer had about six distinct values, too few to
fill seven bands. A span anchor did not rescue it: requiring the cover to contain
one long word left the same 0.0 to 0.2 percent rate. The numbers are in section 30.

The resolution is to change the fairness claim, not to keep asserting one the
verifier cannot prove. LETTER TRAIL does not ask the player to reconstruct the only
possible tiling. It hides a **known set** of answer words drawn from a curated
theme, tells the player the theme and how many words there are, and its fairness
claim is a set of exact structural properties the intended words satisfy, anchored
by a spanning word that is the unique longest word present on the board. This is the
model the genre actually uses, it matches the concept text the owner chose ("find
every hidden word" plus "one word spans the board"), it is verifiable exactly and
cheaply, and the theme keeps early play from being a guess.

This is a design finding, not a defect report. Nothing in the engine caused it and
no engine change fixes it. The section 46 note is a preferred contract, not a locked
decision, and NEW_GAME.md section 4 requires the design document to settle the
generation model rather than inherit an aspirational one. The defect report in
section 29 concerns only engine changes the build wanted, and it is written after
the build, not here.

---

## 1. One sentence rule

Trace chains of touching letters to find every hidden word in today's theme, using
each letter on the board exactly once, ending with the one word that runs the length
of the board.

This is the registry row's rule, tightened. The provisional row says "using each
letter exactly once" and names no theme or span; the shipped rule adds the theme and
the spanning word, because the theme is what keeps early play from guessing and the
span is what makes the day's set recoverable and the fact the share artifact turns
on. The registry edit that builds the game corrects the row to match.

---

## 2. Cognitive mode

Pattern and vocabulary recall over a spatial field, directed by a theme. The player
is told the day's category and scans a lattice for familiar words in that category,
planning a partition so that every cell is consumed. It is not deduction from
feedback (CIPHER, FIVE LETTERS), not arithmetic (ORDER OF OPERATIONS), not pure
spatial planning (POKER GRID's connected regions, where the tokens are cards not
letters). It is the suite's first vocabulary game, the mode the four word games add
and requirement 7.1.1's strain is paid for by, recorded at the slate amendment.

The distinction from POKER GRID, the other grid path game, is the token. POKER GRID
paths are scored by poker rank and the skill is hand knowledge; LETTER TRAIL paths
are scored by dictionary membership within a theme and the skill is word recall. A
player good at one is not thereby good at the other.

---

## 3. Substrate and its hardest substrate gate

Substrate: a rectangular grid of single letters, drawn from a curated theme of
common English words, tiled by simple paths under eight way adjacency so that the
paths partition the board and one path spans it.

Hardest substrate gate: **the exact word census.** Every candidate board is put
through an exhaustive enumeration of every answer list word that appears anywhere on
the board as an eight adjacency simple path, and through the span uniqueness check on
top of it. The enumeration is worst case exponential in the board area, so the board
is kept small enough that it finishes in tens of milliseconds and a 365 day horizon
verifies in seconds. Section 30 gives the measured cost.

---

## 4. Session length

Two to four minutes. Longer than DIFFERENCE RELAY (one to three) and CIPHER, shorter
than POKER GRID and ROTATE LOCK. The board is six rows by five columns, thirty cells,
holding seven words including the span. Once the span is spotted the short words fall
out, but the decoy words (other theme words also present on the board) are what
stretch the time. The registry order is build order for now; the longest to shortest
re sort at the next build will place LETTER TRAIL by this stated length, per the slate
amendment decision 4.

---

## 5. Input model

GRID, path selection under eight way adjacency. This is HANDOFF 4.1 decision 4 and
the game's primary engine stress test.

**Pointer.** A continuous drag from the first letter of a word across touching cells
builds the path; lifting commits it. Eight way adjacency means diagonal moves are
legal, unlike POKER GRID's four way selection. Tap to add and tap to remove the last
cell also work, for desktop and for anyone who cannot drag, exactly as POKER GRID
offers both.

**Keyboard.** The engine's `ui/gridCursor.ts` supplies arrow movement, activation on
Enter or Space, and cancel on Escape, over an `aria-activedescendant` grid. The game
renderer builds the path on top of it: activation appends the cursor cell to the
growing path if it is eight adjacent to the last cell and unused, a second activation
on the last cell commits the word, and Escape clears the path. The cursor moves under
four way arrows only, which is a real limitation for reaching a diagonal neighbour by
keyboard: the player arrows to the target cell (two key presses for a diagonal) then
activates it. That works because activation, not cursor adjacency, is what extends the
path.

**Whether this needs an engine change** is HANDOFF 4.1 decision 4 and the whole
reason this game is the abstraction test. The design anticipates no engine change:
`gridCursor` as written exposes `onActivate(index)`, `onCancel`, and a readable
`index`, which is enough for the renderer to maintain the path in its own state and
validate adjacency itself; the cursor does not need to know a path exists. The one
ergonomic cost, two arrow presses to reach a diagonal, is a game concern the renderer
absorbs by announcing the path length after each append so a screen reader user
always knows the chain state. This is an anticipation, not a result: whether the
grid cursor is actually sufficient is proved only by building the renderer, and if it
is not, that is the defect this game exists to find. The defect report is section 29
and it is written after the build.

---

## 6. Puzzle generator strategy

Direct construction with rejection screening, ARCHITECTURE2 section 10.1, drawing all
of a board's words from one curated theme. The generator picks the day's theme, places
one spanning word (length six or seven) from the theme as a random self avoiding eight
adjacency walk, then fills the remaining cells with short theme words (length three to
five) placed the same way, until every cell is consumed. A board that cannot be
completed within a guard budget is discarded and the seed advances. A completed board
is then screened by the fairness checks of section 10 and the difficulty band of
section 15; a board that fails any screen is discarded.

Construction, not search or carving, because a valid partition is easy to build
forward and hard to carve backward: there is no natural "remove a constraint" move on
a letter tiling. Rejection sampling sits on top because the fairness properties are
cheaper to test than to construct directly.

Themes and the horizon. A theme is a curated group of about forty to sixty related
common words, each a subset of the answer list, authored once (section 12). One theme
yields thousands of distinct boards (2,716 from 3,000 seeds on a forty five word
theme, section 30), so a one time set of roughly twenty four to fifty two themes
covers a 365 day horizon with no board ever repeating: each day draws a fresh seed and
the theme's distinct board count vastly exceeds its days of use. The theme rotation is
part of the generator, deterministic from the puzzle number, so any client reproduces
the day's theme.

---

## 7. Measured generation acceptance rate

At six rows by five columns, themed fill builds a full tiling in 82 to 86 percent of
seeds, as good as unthemed. The fairness screen of section 10 (span is the unique
longest answer word present, every intended word traceable) then keeps a fraction; the
unthemed probe measured 11.1 percent, and the themed rate is remeasured during the
build because a theme changes the decoy population. The difficulty band screen of
section 15 keeps the septile a given weekday needs. The horizon needs 52 or 53 boards
per band; the generator scales its seed count so every band fills, and because one
theme supplies thousands of boards the seed budget is small and the whole 365 day
horizon generates in under two seconds.

Generator acceptance accounting, recorded per run per ARCHITECTURE2 section 10.2:
candidates, structural rejects (tiling did not complete), solvability rejects (an
intended word not traceable, which construction makes impossible but the screen still
checks), uniqueness rejects (span not the unique longest present), decomposition
rejects, symmetry rejects, difficulty rejects, yearly duplicate rejects, accepted. The
fairness screen rejects the large majority of built boards, so it is meaningful
certification evidence, not a rule that rejects almost nothing.

---

## 8. State space census

The board is 30 cells over an alphabet of 26, so the raw letter grid space is 26^30,
far beyond enumeration. That figure is not the census that matters. The census that
matters is the word space of a fixed board: given the day's 30 letters, how many answer
list words appear anywhere on it as eight adjacency simple paths. That is what the
verifier enumerates exhaustively, and it is bounded: measured node counts for the word
enumeration are in the low tens of thousands at this size (section 30), so the search
is EXACT, not bounded. The player facing space is smaller still: seven words to find,
in a stated theme, given their count and the letter budget, among the theme's decoy
words that also appear.

---

## 9. Exact or bounded verification method

EXACT. The verifier is an independent program (`tools/letter-trail-verify.ts`) that
never imports the generator or the module's solver. It re derives every claim the
manifest entry makes:

1. **Structural.** Board is 6 by 5, 30 cells, every cell a lowercase letter, the
   intended word set partitions the board, every intended word is in the answer list
   and in the day's theme, every intended path is a simple eight adjacency walk of the
   word's length.
2. **Traceability.** Each intended word can be traced on the board as an eight
   adjacency simple path spelling it. Construction guarantees this; the verifier proves
   it independently.
3. **Span uniqueness.** Enumerate every answer list word that appears anywhere on the
   board as an eight adjacency simple path. The intended span must be the unique longest
   among them. This is the fairness anchor and the disambiguator.
4. **Difficulty.** Recompute the difficulty integer of section 14 from the board, the
   theme and the answer list, and assert it equals the stored value and lands in the
   stored band.
5. **Decomposition and symmetry**, sections 13 and 13a.
6. **No duplicate yearly board**, by canonical board hash.

Claims proved: SOLVABLE (every intended word traceable and the set partitions the
board) and FAIR UNDER DECLARED MODEL (span is the unique longest word present, so the
day's set is anchored, and the theme is stated so recall is directed). It does not
claim UNIQUE full cover, because section 0 showed that claim is false for this game;
the verifier states exactly the two claims it proves, per ARCHITECTURE2 section 11.

---

## 10. Uniqueness claim

**Not a full cover uniqueness claim.** Section 0 records why: no exact cover
uniqueness model is achievable at a playable size with a fair word list. The claim
LETTER TRAIL makes instead, and proves exactly:

> On the day's board, the intended spanning word is the unique longest answer list
> word that appears anywhere as an eight adjacency simple path, and the intended word
> set partitions the board with every word traceable, and every intended word belongs
> to the day's stated theme.

The span uniqueness carries the fairness weight. A player who finds the span has found
the one word of its length on the board; there is no second word of equal length to
make the span ambiguous. The short words are not claimed unique, because they are not:
the board holds other theme words (that is the difficulty). The player is told the
theme and the count and finds the intended set by partitioning what remains after the
span, which the letter budget and the theme make tractable. This is a weaker claim
than full cover uniqueness and it is the strongest claim the substrate supports.

---

## 11. Fairness claim

Fairness for a word graph game is vocabulary fairness first, ARCHITECTURE2 section 35:
an answer that is a real word the player has never met reads as unfair no matter what
the verifier proves. LETTER TRAIL meets it four ways.

1. **Curated answer list.** Every letter on every board comes from a familiar word.
   The answer list is the intersection of ENABLE with wordfreq's top 30,000 common
   words (section 12), 12,522 words, all common and all dictionary valid, minus a
   reviewed profanity and slur stop list.
2. **A stated theme.** The player is told the day's category, so tracing a word is
   directed recall against a known subject rather than a blind scan of the whole
   language. This is the resolution to the decoy fairness question the owner raised: a
   wrongly traced word is usually itself a theme word the player recognises, so the
   refusal reads as "a theme word, but not one of the seven," not as the game failing
   to know a word.
3. **The span is recoverable.** The span is the unique longest word present, so a
   player who scans for the longest chain finds a unique target rather than guessing
   among equals.
4. **The count is given.** The player is told how many words to find and their total
   is the whole board, so the search is bounded and the end state is unambiguous.

The verifier's fairness claim (section 9 item 3) is span uniqueness; the vocabulary
fairness is a property of the answer list and the themes, checked once when they are
curated (section 12), not per board.

Structural fairness: the board never depends on a word the player cannot see the whole
of. Every intended word lies entirely on the 30 visible cells; nothing is off board or
hidden behind another cell.

---

## 12. Word list and themes, the assets

HANDOFF 4.1 decision 2 and the slate amendment's "word lists are an asset, not
content" decision.

**Answer list.** 12,522 words, the intersection of ENABLE (public domain, released by
Alan Beale) with wordfreq's top 30,000 English words (Apache 2.0, by Robyn Speer),
restricted to lowercase a to z, length three to seven, minus the stop list below. The
intersection guarantees every answer word is both common (wordfreq) and a valid
dictionary word (ENABLE). Length bands: 698 at three, 1,877 at four, 2,739 at five,
3,481 at six, 3,727 at seven. Spans are drawn from length six and seven, short fill
from three to five.

**Licensing, corrected.** An earlier candidate, google-10000-english, was rejected on
a licensing failure: its own license states it derives from the LDC Google corpus and
does not permit commercial use without an LDC license, which fails requirement 8.6 for
a commercial product. ENABLE is public domain and wordfreq is Apache 2.0, both
permitting commercial use, so the intersection is clean. wordfreq is a build time only
Python dependency that produces the frequency list in the list preparation step; it is
never shipped in the browser, which fits constraint 2.3's build time dependency
allowance.

**Themes.** A curated set of about twenty four to fifty two themes, each a group of
forty to sixty related answer list words (for example KITCHEN, WEATHER, MUSIC, GARDEN).
Each theme is authored once, by a person, as a subset of the answer list. A day's board
draws all its words from one theme, rotated deterministically from the puzzle number.
Curation is one time, not daily, so it does not breach the zero daily content cost rule.
Themes are stored in `data/letter-trail/themes.json`, a build time input only, never
served.

**No runtime validation list.** LETTER TRAIL ships no "is this a real word" check. This
is the architectural fact that makes it the cheapest of the four word games. The player
traces a path and the game checks it against the day's baked intended words only; there
is no dictionary in the browser. The full ENABLE dictionary is used only offline, by the
generator and verifier, to enumerate every word present on a board for the difficulty
measure and the span uniqueness proof. WORD LADDER and FIVE LETTERS will pay the
validation list byte cost that section 46 warns of; LETTER TRAIL does not.

**Byte cost.** The baked cost is the manifest, not a word list: each board stores 30
letters plus seven paths plus difficulty and band inputs, obfuscated through the per game
codec, at roughly 90 to 110 bytes per day, plus the day's theme label. The 365 day
manifest chunk set is on the order of 35 to 40 KB, comparable to DIFFERENCE RELAY's 33
KB. The answer list (about 40 KB gzipped), the ENABLE dictionary, the themes and the stop
list all live in `data/letter-trail/` for the offline tools only and are never served.
Measured against the per game page budget in section 26.

**Offensive and obscure removal.** Done once, when the list and themes are curated, not
per board. The wordfreq intersection is confirmed to contain profanity and slurs, so a
reviewed stop list (`data/letter-trail/stoplist.txt`, seeded from a public profanity
list and reviewed by a person) is subtracted from the answer list before any theme is
built. Obscure words are already excluded by the wordfreq top 30,000 threshold. Because
the removal is a one time list edit, it is not daily content cost.

**ASSETS.md rows** (added with this design): the answer list with its dual origin and
licenses, the themes, the ENABLE dictionary used offline only, the wordfreq build
dependency, and the profanity stop list.

---

## 13. Decomposition result

ARCHITECTURE2 section 12.1. The constraint dependency graph of a LETTER TRAIL board is
the adjacency of its intended words: two words are dependent if finding one constrains
where the other can go (they compete for cells or border each other). A board is
rejected if it splits into independent components that make up the majority of the
difficulty, for example if the span sits in one corner touching nothing and the short
words form a separate cluster, so that the board is really two easy puzzles.

The decomposition checker builds the word adjacency graph (words are adjacent if any
cell of one touches any cell of the other under eight adjacency) and rejects a board
whose largest component holds fewer than a threshold fraction of the words. Because the
span runs the length of the board it touches most other words by construction, so most
boards pass; the check catches the rare board where the fill happened to cluster away
from the span. Result: a real screen with a non trivial reject rate, recorded in the
acceptance accounting.

## 13a. Symmetry result

ARCHITECTURE2 section 12.2. The rule preserving transformations of a letter board are
the eight dihedral transforms of the grid (four rotations, four reflections), which
relabel cell positions but not letters. They do not change which words are present or
the span uniqueness claim, because "appears anywhere on the board as an eight adjacency
path" is invariant under the dihedral group: a path under one transform maps to a path
under the transform. So symmetry does not create a second distinct solution to account
for; the census of words present is the same on all eight images. There is no scoring
function that a transform could preserve to break the claim, because the game is not
scored by position. The symmetry check therefore records "dihedral invariant, no
uniqueness impact" as an n/a with a written reason, which the gate accepts only with a
person's reason (NEW_GAME.md section 6). The reason is this paragraph.

---

## 14. One emergent integer difficulty measure

**The count of distinct decoy words on the board:** the number of answer list words
that appear anywhere on the board as an eight adjacency simple path and are not in the
intended set. It is emergent (a property of the finished board, not a generator knob),
integer valued, reproducible, and measured by the same enumeration the verifier runs.

**Held as a hypothesis, not settled.** With a theme, the decoy population changes: many
decoys are drawn from the theme rather than the whole language, so the measured spread
will differ from the unthemed probe (which found min 38, septiles 65/75/83/92/100/115,
max 196, 101 distinct values). The build recalibrates the measure on themed boards and
confirms it still has enough distinct values for seven bands. If themed boards collapse
the spread (too few distinct decoy counts, the DIFFERENCE RELAY lesson), the named
fallback is **span length combined with theme breadth** (longer span and broader theme
mean a harder scan), which the build would substitute and recalibrate. The difficulty
measure is settled only when the build's calibration study confirms seven band
resolution; this document commits to decoy count as the hypothesis and the fallback as
the contingency, per the owner's directive to treat decoy count as a hypothesis.

It is not a lever. The lever is the theme choice, the span length choice and the fill
word length distribution (section 6 levers); difficulty is measured after the fact from
the built board. This is HANDOFF 4.1 decision 6, with the calibration deferred to the
build.

---

## 15. Seven band calibration evidence

ARCHITECTURE2 section 9.2. The calibration study (`data/letter-trail/study.json`,
produced by `tools/letter-trail-calibrate.ts`) samples several thousand seeds across the
theme set, records the difficulty integer of every board that passes the fairness
screen, sorts the accepted values, and sets six septile band edges. The unthemed probe
gave edges 65, 75, 83, 92, 100, 115 over a 333 board sample; the build reruns this on
themed boards and commits the themed edges. Weekday assignment is the suite convention,
Monday band 1 (easiest, fewest decoys) through Sunday band 7 (hardest, most decoys).

Band supply: each band holds roughly a seventh of the accepted mass. Because one theme
supplies thousands of boards and the study samples across all themes, each band supplies
far more than the yearly need of 52 or 53, so the section 9.3 band audit passes with
wide margin. The acceptance accounting reports candidates admitted per band and expected
days per band, and certification fails if any band cannot supply the year. If the themed
recalibration shows a collapsed band under decoy count, the build switches to the section
14 fallback metric and recalibrates before the game is certified; a collapsed band is a
build blocker, not a ship it anyway.

---

## 16. Monday versus Sunday player feel statement

Monday: the theme is broad and the board holds few decoy words. Once the span is spotted
the short words fall out with few wrong turns, and a player finishes in a minute or two
feeling fluent. Sunday: the theme is chosen and the fill arranged so the same 30 letters
hide many plausible theme words that are not the intended ones, so the player repeatedly
traces a real theme word that turns out not to fit the partition, and the span is harder
to isolate. The board is not larger and the rule is identical; only the density of false
theme trails changes. This is the intended weekly curve, easier early, harder late,
matching every daily game's convention. The theme label is shown every day, so directed
recall is available every day; the difficulty is in the decoy density, not in withholding
the category.

---

## 17. Every refusal and announcement

ARCHITECTURE2 section 22. Every action produces a deterministic announcement, and the
renderer consumes `ActionResult` rather than inventing accessibility rules.

Refusals (rejection values from `apply`, each with an announcement):

| Refusal | When | Announcement |
|---|---|---|
| `not-adjacent` | Appended cell is not eight adjacent to the last path cell | "Not touching the last letter" |
| `cell-used` | Appended cell is already in the current path | "Already in this trail" |
| `already-found` | Committed path spells a word already found | "Already found that word" |
| `not-a-word` | Committed path is not one of the day's intended words | "Not one of today's words" |
| `too-short` | Committed path is shorter than the minimum word length (three) | "Too short" |
| `empty-commit` | Commit with no path started | "Start a trail first" |

`not-a-word` deliberately does not consult a dictionary: a path that spells a real
English word but is not one of the day's intended words is refused the same as gibberish,
because the game is find the hidden set, not free word hunting. The stated theme is what
keeps this fair, section 11: the player traces within a known category, so the refusal is
"a theme word, but not one of the seven," which the announcement wording conveys. Section
32 records the residual risk.

Announcements (non refusal):

| Event | Announcement |
|---|---|
| Cell appended | "<letter>, trail length <n>" |
| Word committed | "Found <word>, <k> of <total>" |
| Trail cleared | "Trail cleared" |
| Board complete | "Solved, all <total> words found" |
| Cursor lands (keyboard) | "<letter>, row <r> column <c>" (the grid cursor's describe hook) |
| Session start | "Today's theme, <theme label>. Find <total> words." |

There is no loss announcement because there is no loss (section 18).

---

## 18. Failure model and histogram buckets

HANDOFF 4.1 decision 5. **No win or loss; scored on a continuum.** The registry row's
`hasWinLoss: false` is correct and stays. A session ends when the player has found all
seven words (a complete solve) or chooses to reveal and stop; the result is how many of
the seven words they found. This makes LETTER TRAIL a continuum game like POKER GRID,
which the suite needs for the distinct failure feel of requirement 7.1.3, rather than
another pass or fail game.

**No hints bought by decoy words.** The concept asked whether non answer words found
along the way count or buy hints; the answer is no, and the theme is why no hint economy
is needed. Finding a decoy is simply refused (`not-a-word` above); there is no economy of
decoys, because a hint economy would need a runtime dictionary to recognise "a real word
but not intended," which section 12 removed on purpose, and the stated theme already
gives the player the direction a hint would. A single reveal (give up and see the answer)
exists as the terminal escape, and revealing caps the result at words found so far,
exactly as an archived POKER GRID board never improves a streak.

**Histogram buckets.** The registry row's provisional `bucketCount: 4` is corrected to
**8**: words found, zero through seven, with seven (a complete solve) as the
distinguished bucket. `distribution` length must equal `bucketCount`, so the module
declares eight labels ("0", "1", ... "6", "Solved") with the distinguished index at 7.
The registry edit that builds the game sets `bucketCount: 8`.

Streak is defined as played, not won, per the suite's continuum convention: opening and
finishing (solving or revealing) the day's board extends the per game streak, and
completing at least one suite game extends the suite streak. There is no way to fail a
day except not to play it.

---

## 19. At least two telemetry patterns

ARCHITECTURE2 section 13. LETTER TRAIL implements three of the approved patterns, all
local, none leaving the browser:

1. **Micro replay path tracing.** The run log records the order the player found the
   words and, per word, how many wrong trails they traced before committing it. The
   artifact rows replay that order as a ladder.
2. **Playstyle archetype classification.** From the run log's exploration rate (wrong
   trails per found word) and whether the span was found early or late, the game
   classifies the run into an archetype, for example SCANNER (span first, few wrong
   trails) versus FORAGER (short words first, many wrong trails).
3. **Emergent fingerprint.** The behavioural signature of section 25.

Two would satisfy the contract; three is chosen because the found order and the
exploration rate are both cheap to log and both make the fingerprint richer.

---

## 20. Exact telemetry record shape

The run log is the player's own actions, held on device, never sent anywhere
(ARCHITECTURE2 section 13.1, HANDOFF rule 10). It carries no letter, no cell, no word
and no position, so nothing the mapper reads can reveal the board.

```text
LetterTrailRunLog
{
  v: 1
  entries: FoundEntry[]      // one per word the player committed, in found order
  revealed: boolean          // did the session end by reveal rather than solve
}

FoundEntry
{
  index: number              // 0-based order the player found this word
  span: boolean              // was this the spanning word
  wrongTrails: number        // wrong trails traced before this word was committed
  length: number             // the word's letter count, 3..7
}
```

`length` is the word's own length, a property of the player's found word, not a hidden
board fact: the player can see the word they found, so its length is theirs to share.
`wrongTrails` and `span` are pure run facts. `index` is found order. No field names a
letter, cell, word or theme, so the leak probes of section 24 pass by construction. The
theme label is not in the run log, because a shared block that named the theme would
narrow the day's words for a reader who has not played; the theme is shown in the game,
not in the share.

---

## 21. Exact mapping function

The mapper is pure, `mapTelemetry(runLog) -> ArtifactModel`, no hidden puzzle data
introduced (ARCHITECTURE2 section 13.3).

- **Source field** `entries`, one row per found word in found order, capped at
  `maxRows` (seven, the word count, which fits the nine line grammar with title and URL).
- **Per row token, threshold mapping** on `wrongTrails`: 0 wrong trails maps to the
  best token, 1 to 2 to strong, 3 to 5 to partial, 6 or more to weak. The spanning
  word's row is marked distinctly by a leading meter token so the reader sees which row
  was the span without learning the word.
- **Token family** the closed suite vocabulary of ARCHITECTURE2 section 14; the game
  emits semantic tokens, never codepoints.
- **Grammar** A, AttemptLadder (ARCHITECTURE2 section 15): one row per found word, in
  found order, same width in every row.
- **Archetype classification** SCANNER / FORAGER / STEADY / GAMBLER, from exploration
  rate and span timing (section 19), deterministic thresholds stated in the module.
- **Fingerprint transformation** section 25.

Row width: every row is a fixed number of tokens so all rows are the same visual
width, because nothing pads them (NEW_GAME.md section 8 item 3). The row is the found
word's quality token repeated to a fixed width; the span row leads with the meter token
and is otherwise the same width.

---

## 22. Clipboard artifact

Title line, token rows, bare URL, nine lines maximum (ARCHITECTURE2 section 15). Worked
examples in section 27. The title carries game name, puzzle number, and the count found
of the total (for example "LETTER TRAIL #248 6/7"). No word, letter, position, or theme
appears anywhere. The URL is the suite URL, appended by the engine.

---

## 23. Graphic card artifact specification

ARCHITECTURE2 section 17.1, 1200 by 900, same `ArtifactModel`, no independent scoring
path. The card shows game title, puzzle number, short result (words found of total), the
fingerprint visualisation of section 25, the archetype label, and the suite URL. It does
not show the theme, for the same reason the run log omits it. Shape, not colour alone,
distinguishes tokens, so the card holds up in high contrast and grayscale.

**No card renderer ships yet.** No game in the suite has a graphic card renderer; it is
suite work in the state ROTATE LOCK and DIFFERENCE RELAY left it (BACKLOG). LETTER TRAIL
specifies its card here so the suite renderer, when built, has the specification, and
the module's `shareArtifact` already produces the `ArtifactModel` the card will consume.

**Trade dress.** The board is a plain rectangular grid of letters. It must not use the
source genre's diagonal ribbon highlight, its specific found word colour band, or its
spanning word label wording. The found path is drawn as a simple connected highlight in
the game accent (hue 48), and found words are struck from a plain count, not a themed
list styled after any existing product.

---

## 24. Share leak test result

ARCHITECTURE2 section 16, five questions, positive controls per probe (a deliberately
leaking artifact the probe must catch). Run over a generated matrix of good, average,
and bad runs.

- **Position leak.** Row position is found order, which is the player's choice, not the
  board's structure. A row's position says nothing about where a word sits. Pass.
- **Answer property leak.** Tokens encode wrong trails and word length, both properties
  of the player's run and of a word the player already saw, not of the hidden solution.
  The theme is not in the artifact. Pass. Positive control: an artifact that encoded each
  word's start cell, or the theme label, fails the probe.
- **Ordering leak.** The rows are in found order, which varies by player, so a fixed
  reading of the order reveals nothing about the board. Pass. Positive control: an
  artifact that sorted rows by board position fails.
- **Shape leak.** The silhouette is a ladder of equal width rows; its height is the word
  count and its tokens are run quality. It cannot reconstruct the letter grid. Pass.
- **Title leak.** The title carries name, number, and count found, all run facts. Pass.
  Positive control: a title that included the span word or the theme fails.

A failure blocks certification. The probes ship in `src/games/letter-trail/telemetry.ts`
with their positive controls in the module test, as DIFFERENCE RELAY's do.

---

## 25. Fingerprint definition

A visual transformation of run telemetry, never puzzle data (ARCHITECTURE2 section 18).
Base coordinate system is action chronology:

```text
x = found-word index (0..6)
y = mapped quality (wrongTrails bucket, 0 best .. 3 weak)
shape = span vs short word
```

Two runs with the same words found count still differ if they found the words in a
different order or with different wrong trail counts, so the fingerprint is a behavioural
signature, not a restyled score. The span's position on the x axis (found first versus
found last) is a salient run difference the fingerprint captures.

---

## 26. Browser fallback budget

ARCHITECTURE2 section 36 and constraint 2.7. The renderer's page must sit under the
150 KB gzipped cold load budget, measured on the harness build because a planned game is
not in a release build (`npm run build:harness`, then measure the letter-trail page).
Target, from the comparable DIFFERENCE RELAY page at 27.4 KB and the added path highlight
logic: under 30 KB gzipped. The engine chunk is shared and cached, unchanged at about
30.4 KB. The answer list, dictionary, themes and stop list are offline only and never
counted against the page. Section 30 records the measured page size once the renderer
exists; the byte budget gate in the certification plan enforces it.

Past horizon fallback: `generatePuzzle(seed)` builds a board deterministically beyond the
manifest, unrated (no stored difficulty), per NEW_GAME.md contract piece 10. The fallback
runs the same themed direct construction as the offline generator but skips the difficulty
band screen, so it always returns a playable board even on a day past the horizon.

---

## 27. Worked share examples

Tokens are the closed vocabulary; the block is what a reader sees in a group chat.

**Complete clean solve** (all seven words, no wrong trails). Title, seven rows, URL:

```text
LETTER TRAIL #248 7/7
[best][best][best][best][best]
[best][best][best][best][best]
[best][best][best][best][best]
[best][best][best][best][best]
[best][best][best][best][best]
[best][best][best][best][best]
[meter][best][best][best][best][best][best][best]
dailykit.example/letter-trail
```

The last row is the span, prefixed with the meter token and one token per letter of its
length; the short word rows carry the quality token repeated to a fixed width. Nine lines
exactly.

**Strong result** (six of seven, some searching):

```text
LETTER TRAIL #248 6/7
[best][best][best][best][best]
[strong][strong][strong][strong][strong]
[best][best][best][best][best]
[partial][partial][partial][partial][partial]
[strong][strong][strong][strong][strong]
[meter][strong][strong][strong][strong][strong][strong]
dailykit.example/letter-trail
```

Six rows, one word unfound, the span found with a little searching.

**Poor result** (three of seven, much searching, span not found):

```text
LETTER TRAIL #248 3/7
[weak][weak][weak][weak][weak]
[partial][partial][partial][partial][partial]
[weak][weak][weak][weak][weak]
dailykit.example/letter-trail
```

Three rows, no span row because the span was never found, weak quality tokens showing
many wrong trails. No word, letter, position, or theme appears in any example. The
concrete glyphs are the closed vocabulary tokens named in ARCHITECTURE2 section 14; they
are written as names here so this document contains no bare emoji.

---

## 28. All ten contract pieces

The `GameModuleV3` members, NEW_GAME.md section 3, each settled:

1. **identity** id `letter-trail`, name LETTER TRAIL, epoch 2026-01-05, share URL the
   suite URL, accent hue 48, one line rule of section 1. Hue 48 inherits the accent
   contrast defect logged in BACKLOG; it is fixed per game in a later engine change, not
   inside this build.
2. **input** GRID, eight adjacency path building on `gridCursor` (section 5).
3. **manifest** index plus monthly chunks keyed by puzzle number, per game codec
   obfuscation of the letters, paths and theme label.
4. **archiveEnabled** true.
5. **hasWinLoss** false (section 18).
6. **stateVersion** 1 (registry row correct).
7. **distribution** eight labels, distinguished index 7 (section 18); `bucketCount`
   corrected to 8.
8. **shareCapabilities** grammar A, patterns micro-replay-path, playstyle-archetype,
   emergent-fingerprint, `maxRows` 7.
9. **parsePuzzle** parse the day's letters, intended paths and theme label from the
   chunk entry, reject malformed content, never fetch or generate.
10. **generatePuzzle** deterministic themed direct construction fallback past the
    horizon, unrated.
11. **firstSessionPuzzle** an easy tutorial board (low decoy count, broad theme) from a
    separate seed namespace so it cannot be a horizon day, as DIFFERENCE RELAY does.
12. **initialState** empty found set, empty current path.
13. **serialize** the found word indices and the in progress path, not an action log.
14. **deserialize** validate against the supplied puzzle, a malformed save is a value
    failure.
15. **migrateState** identity at version 1, refuse an unknown version.
16. **apply** append cell, remove last cell, commit path, clear path, reveal, each pure,
    routine invalid actions are rejection values (section 17).
17. **inspect** terminal decision, finished outcome carries score (words found), won
    (n/a, always the continuum result), detail, tier, bucket, difficulty.
18. **difficulty** the decoy count integer of section 14 (a hypothesis until the build's
    calibration confirms it), measured from the puzzle.
19. **telemetry** the run log of section 20.
20. **shareArtifact** the mapper of section 21.
21. **mount** the renderer of section 5, owns only its host.
22. **help** one screen worked example (section 31) with a text equivalent.

---

## 29. The abstraction test, requirement 7.4

The zero engine changes rule. The one candidate for an engine change is keyboard path
building on `gridCursor` (HANDOFF 4.1 decision 4). Section 5 states the anticipation:
the cursor's `onActivate(index)`, `onCancel`, and readable `index` should be sufficient
for the renderer to maintain the path in game state and validate eight adjacency itself,
so no engine change is anticipated. **This is an anticipation, not a result.** Whether
the grid cursor is actually sufficient is proved only by building the renderer, and the
defect report is written after the build, per NEW_GAME.md section 7. If building surfaces
a real engine limitation (for example if the diagonal reach ergonomics fail the manual
mobile check and demand a cursor change), it is logged as a defect and corrected in a
later conversation, never inside this build. No claim that the test resolves to zero
changes is made in this design.

---

## 30. Measured evidence

All figures produced in the container before this document was written, at 6 rows by
5 columns.

| Measurement | Result |
|---|---|
| Full ENABLE dictionary, 3..8 letters, gzipped | 199 KB (offline only, never shipped) |
| Curated answer list, ENABLE ∩ wordfreq top 30000, 3..7 letters | 12,522 words, about 40 KB gzipped, offline only |
| Full cover uniqueness (the rejected model), 4x4 / 5x4 / 5x5 | about 1.0% / 1.0% / 0.0% |
| Full cover uniqueness with span anchor, 6x5 / 6x6 | about 0.2% / 0.0% |
| Board build completion, unthemed, 6x5 | 74.6% of seeds |
| Board build completion, themed, 6x5 | 82% to 86% of seeds |
| Fairness screen acceptance, unthemed (span unique longest), 6x5 | 11.1% of seeds |
| Exact word census node count, 6x6 | low tens of thousands, tens of ms |
| Difficulty integer (decoy count), unthemed probe, 6x5 | min 38, septiles 65/75/83/92/100/115, max 196, 101 distinct |
| Distinct boards from one 45 word theme | 2,716 from 3,000 seeds |
| Themes needed for a non repeating 365 day horizon | about 24 to 52 |

The themed difficulty distribution is remeasured during the build (section 14), because a
theme changes the decoy population; the unthemed figures above are the evidence that the
mechanic and the search are tractable, not the final calibration.

---

## 31. Help content

One screen, a worked micro example, dismissible in one tap, re openable forever
(requirement 3.7). The example is a tiny 3 by 3 board with two words drawn on it, one
short and one spanning, shown as highlighted trails, with a text equivalent for the drawn
example (NEW_GAME.md accessibility floor). The help text is one worked example plus the
one sentence rule plus the four facts a new player needs: today's words share a theme,
letters touch in any of eight directions, every letter is used once, and the longest word
spans the board. A first session serves the easy tutorial board of contract piece 11.

---

## 32. Explicit risks

ARCHITECTURE2 section 44 item 28.

1. **The `not-a-word` refusal fights genre expectation.** A player who traces a real
   English word not in the day's set is refused, which can read as the game not knowing a
   word. The stated theme is the mitigation: within a category the refusal reads as "a
   theme word, but not one of the seven." If the manual mobile check finds it still reads
   as broken, the alternative is a runtime dictionary to distinguish "real but not
   intended," which reintroduces the byte cost section 12 avoided; that trade is a product
   decision, logged to BACKLOG if it arises.
2. **Theme quality is a curation risk.** A theme whose words are too loosely related, or
   whose "related" is not obvious to a given player, weakens the directed recall that
   makes the game fair. Curation is one time and reviewed; a theme review checklist is a
   build artifact.
3. **Vocabulary fairness is only as good as the curated list.** A word common to wordfreq
   but unfamiliar to a given player still reads as unfair. The wordfreq top 30,000
   threshold is the mitigation; a per word familiarity review is out of scope and logged
   to BACKLOG.
4. **English only.** Every board is tied to the English list and English themes,
   requirement 11.7's localization debt made concrete, logged at the slate amendment. A
   second language is a second list, a second theme set and a second calibration.
5. **The 30 letter grid is the densest board in the suite at 360 pixels.** HANDOFF rule 9
   requires measuring it in the page, not trusting the stylesheet. Six rows of five
   letters at 44 pixel cells is 220 pixels of grid width plus gaps, which fits 360, but
   the drag target size and the path highlight legibility are a manual check item.
6. **Span uniqueness is the whole fairness anchor.** If a generator bug let a board ship
   with two words of the span's length, the day would be ambiguous. The independent
   verifier's span uniqueness enumeration (section 9 item 3) is the guard, and it never
   imports the generator, so one bug cannot both write and certify a bad board.
7. **Difficulty is a hypothesis.** Decoy count may collapse a band on themed boards; the
   section 14 fallback (span length plus theme breadth) is the contingency, and a
   collapsed band blocks certification until recalibrated. This is a build risk carried
   deliberately, per the owner's directive to treat decoy count as a hypothesis.
