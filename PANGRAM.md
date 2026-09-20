# PANGRAM

Game eight of twelve. Design document, charter Phase 13. Written on the v3
contract from its first line, following WORD LADDER as the worked word game
template and LETTER TRAIL as the first word game design. Designed and built in
one conversation, 2026-09-20, under the standing rule that a game's conversation
runs from design through delivery (HANDOFF.md section 8).

Every number below was reproduced in the container before it was adopted, from
SCOWL/ESDB at commit 1e5b7d3 and ENABLE at md5 33f2b09e2d9dfb732fa16b5f05a5a8d1,
the exact inputs WORD-LADDER.md section 30 records. The reproductions are in
section 30.

---

## 0. The finding that shapes everything

**PANGRAM ships no dictionary to the browser.** WORD LADDER must validate any
word in the language, because a rung can be any four letter word, so it ships its
accepted list. A PANGRAM day is different: its valid words are fully determined
by its seven letters and its centre, so the day's answer list is finite and small
(median 46 words over the shipped horizon). The day therefore carries its own
answers in its manifest entry, obfuscated by the engine codec, and the browser
checks a typed word against that list.

The alternative was measured and refused. Shipping the dictionary a day needs,
every ESDB 35 word of four or more letters with at most seven distinct letters,
costs 67 KB gzipped, and ESDB 50 costs 99 KB. Either would more than triple the
page. The committed accepted list, after the no S rule below, is still 51 KB
gzipped. The per day answer list costs about 8 KB gzipped per 31 day chunk,
fetched after the page is interactive, which is the size of POKER GRID's monthly
chunks. The page is 27.1 KB gzipped, the smallest game page in the suite.

Two consequences follow and both are stated rather than hidden. First, the day's
answers are what the network tab carries, as light obfuscation only (section 32,
requirement 8.4). Second, there is no generation past the horizon: a day needs
the dictionary and the browser deliberately does not hold it, so past the last
manifest day the game reports unavailable (section 26). A benefit follows too:
because the browser holds every answer, the end screen lists the words a player
missed, which a hash only design (considered and dropped during this design)
could not do.

---

## 1. One sentence rule

Make words of four or more letters from seven, always using the centre letter,
and find the word that uses all seven.

This corrects the provisional registry rule by naming the four letter minimum,
the one rule a new player breaks first. It fits the hub listing (requirement
7.1.6) and is the rule the registry row and the module now share.

---

## 2. Cognitive mode

Vocabulary recall under a letter constraint: generating words from a fixed
inventory. It is the word family's generation mode, distinct from LETTER TRAIL's
tracing, WORD LADDER's graph search and FIVE LETTERS' feedback deduction. The
accepted deviation of the current lineup (BACKLOG.md, four word games on one
substrate) stands and is not relitigated.

---

## 3. Substrate and its hardest substrate gate

Substrate: the language, as the set of accepted words whose letters fit seven
given letters and include a given one. The hardest gate is the answer list as
content: a word list a person must judge, whose every entry may be shown to a
player on the end screen. That is why the deny list (section 12) is the one item
of this design only a person can pass, and why it is on the manual check.

---

## 4. Session length

Three to eight minutes, player chosen. There is no clock and no guess limit: a
player finds words until they choose to finish, and a day saved mid play resumes
later the same day. It is the longest of the four word games, and it belongs with
the long sessions at the suite level (requirement 7.1.2). The hub re sort by
session length is deferred until FIVE LETTERS states its own (BACKLOG.md).

---

## 5. Input model

`custom` input, pointer `tap`, keys Enter, Backspace and Escape. Neither
`ui/gridCursor` nor `ui/listCursor` fits seven letter keys and a draft word, the
same finding as WORD LADDER.

The keypad is seven keys, four over three, with the centre letter always in the
middle of the lower row. It is a plain keypad and never a honeycomb of seven
hexagons, per the BACKLOG trade dress note. The centre key is marked by a thick
border, an underline and the words "centre letter" in its accessible label, never
by colour alone. Shuffle reorders the six outer letters through a fixed cycle of
six, so the renderer stays deterministic and the centre never moves. Delete
removes a letter, Enter submits, and Finish needs a second tap so a stray tap
cannot end the day.

**The 44 pixel floor.** Four keys across a 360 pixel viewport, with the page
margins and three 8 pixel gaps, leave each key about 78 pixels wide and 56 tall,
and the lower row of three is wider still. Every control is at least 48 pixels
tall. WORD LADDER needed an alphabetical seven across keyboard to clear the
floor; PANGRAM clears it by a wide margin because it has only seven keys. The
render test asserts seven keys, four over three, the centre slot, and no hexagon
or SVG element; the page at 360 pixels is confirmed on the manual check.

A physical keyboard types any letter; a letter outside the set is refused by the
rules with a reason, which teaches the constraint rather than silently ignoring
the key.

---

## 6. Puzzle generator strategy

Rejection sampling, one RNG stream per puzzle, no salts, the seam every v3 game
uses. A manifest of 365 verified days is baked. Per attempt:

1. Draw a seven letter set uniformly from the sorted list of **pangram roots**:
   every seven letter set, with no S, that some familiar word uses all of. 2,632
   roots exist on the shipped lists.
2. Draw the centre uniformly from its seven letters.
3. Enumerate the day exactly: the 64 subsets of the six other letters, each
   joined with the centre, read from an index of accepted words by letter set.
4. Screen: answer count 20 to 80; a familiar pangram; familiar words carrying at
   least 65 percent of the total (section 11); a set not already shipped
   (section 13a); total inside the weekday band (section 14).
5. Record the levers.

### 6a. The levers

**No S.** Every day excludes S. With S, the median candidate day is 79 words and
the tenth percentile of the top is 167; without it, 49 and 110. Plurals double a
day's size without adding a decision, so S is a lever fixed off, recorded on
every day as `no-s`.

The other two recorded levers are audit labels, `centre-vowel` or
`centre-consonant` and `pangrams-k`. The draw is uniform and the band screen
alone decides the day. PANGRAM's difficulty is measured after the fact, never set.

---

## 7. Measured generation acceptance rate

Calibration over 4,000 seeds: 59.3 percent of candidate days pass the count and
fairness screens (1,341 count rejects, 288 fairness rejects). The 365 day run
took 4,785 attempts, 7.63 percent overall, because only one band in seven is
wanted per day: 1,618 count, 348 fairness, 281 reused set and 2,173 band rejects.
Every day is found well inside the 20,000 attempt ceiling, and the whole horizon
generates in under a second.

---

## 8. State space census

2,632 roots times seven centres is 18,424 candidate days, of which about 59
percent pass the screens, about 10,900 playable days, so a non repeating 365 day
horizon uses about a seventh of the supply even with the no repeated set rule. A
day's enumeration is 64 map lookups whatever the list size, and it is EXACT:
every accepted word is examined through its letter set, so there is no bound and
no "best known" label anywhere.

A run's state is the ordered list of found words plus a finished flag. It is
bounded by the day's answer count, at most 80 words, a few hundred bytes of
storage.

---

## 9. Exact or bounded verification method

EXACT. `tools/pangram-verify.ts` is an independent process. It imports only the
manifest codec, which is how a day is read at all, and never the generator, the
solver, the rules, the letter primitives or the band table. Its set arithmetic,
scoring, enumeration and the weekday band map are written again from this
document, and its band edges are read from `data/pangram/study.json`. Per day:

1. Structure: seven distinct letters, no S, the centre among them, an answer
   list that decodes, known levers, an integer attempt count.
2. **The stored answers are exactly the dictionary's**: every accepted word whose
   letters fit the set and include the centre, and nothing else. This is the
   claim that makes the game fair to a player who types a real word.
3. Totals: the recomputed total, count and pangram count equal the stored ones.
4. At least one pangram, and an answer count inside 20 to 80.
5. Fairness, section 11.
6. Difficulty is the total, and its band is the weekday's.
7. Across the horizon, no seven letter set ships twice (section 13a).

A negative control was run: a manifest with one stored total raised by one fails
at that day. Replay determinism is proved without the verifier importing the
generator: the generator test regenerates the first ten committed days from their
seeds and demands byte identical entries, and a second test reruns the whole
calibration study from its seeds and demands the committed septiles.

In the browser, `parsePuzzle` measures the total, count and pangrams from the
answers it decoded and refuses the entry if the stored figures disagree, and
`makePuzzle` refuses a day whose answers break the set, the centre, the order or
the window. It cannot prove the answers are the dictionary's, which is exactly
what the verifier proves offline, the WORD LADDER division of labour.

---

## 10. Uniqueness claim

None, and none is needed. PANGRAM has no single answer: the player's result is a
score over many words. The pangram itself is not unique on every day (one to
seven per day, median one), and the design does not claim it is. The claim the
verifier proves is that the answer list is exact (section 9), which is the
property a word finding game actually needs.

---

## 11. Fairness claim

**The top tier is reachable with familiar words alone.** Stated as the verifier
proves it: at least one pangram is a familiar word (ESDB 35), and familiar words
carry at least 65 percent of the day's total score. The top tier needs 60 percent
and a pangram (section 18), so a player who never types an unfamiliar word can
always reach it, with a margin.

This is the PANGRAM analogue of WORD LADDER's familiar shortest path, and it
follows the same single list discipline: the accepted list is the scoring list,
so no player can exceed the total and the total is exact. Over the shipped
horizon the familiar share runs from 65 to 100 percent, median 78.

---

## 12. Word lists and the deny list, the assets

**Source.** ENABLE intersected with SCOWL/ESDB, American spelling, the family
source WORD LADDER settled; not wordfreq, and the four word games do not
converge on one list.

**Derivation**, `tools/pangram-words.ts`, offline only, rebuildable byte for byte
from the recorded inputs:

1. every lowercase headword and inflection in `scowl-pre.txt`, at the smallest
   size level any line gives it
2. American only, entries tagged upper or abbr excluded
3. in ENABLE
4. four letters or more, no S, at most seven distinct letters
5. minus `data/word-lists/deny.txt`

`data/pangram/accepted.txt` is size 50 and below, 18,598 words.
`data/pangram/familiar.txt` is size 35 and below, 13,189 words, a subset. Neither
is served: both are build time inputs to the generator and the verifier. The
answers a player sees are the per day subsets the manifest carries.

WORD LADDER's build left no derivation tool behind and its list could not be
rebuilt exactly from its description (a reproduction came within 83 words). This
tool closes that gap for PANGRAM.

**The deny list** is the family list, extended from 22 four letter entries to 89
by this design from a 285 word offensive substring probe of the accepted list.
Every addition is a vulgar word, a slur, a slur derived word (gypped, niggard) or
an explicit sexual term. False positives cost a "not in the word list" refusal,
so the list errs toward refusing. It was authored in this run and is **not yet
owner reviewed**: that review is the first row of MANUAL-CHECKS.md section 7, and
the manual mobile check that contains it is a gate step PANGRAM cannot pass
without it. Five of the new four letter entries (boob, orgy, pimp, porn, rape) are
still valid WORD LADDER rungs, because WORD LADDER's committed list was derived
before them; that is a BACKLOG item for WORD LADDER before it goes live.

**Hand additions**: none. The single list is generous at ESDB 50, and a reported
refusal of a common word is added through the derivation and a regeneration.

---

## 13. Decomposition result

ARCHITECTURE2 section 12.1. Every answer contains the centre letter, so a day is
one list of words sharing a letter, not a constraint graph that could split into
independent sub puzzles. Recorded as n/a with this reason.

## 13a. Symmetry result

ARCHITECTURE2 section 12.2. A day is invariant under reordering its letters, and
the display order is renderer state (the shuffle), so the set is stored
alphabetically as its canonical form. The same seven letters with a different
centre shows the same keypad and a heavily overlapping answer list, so it is
treated as the same board. The generator refuses a set already shipped, the
verifier refuses any set that appears twice under any centre, and the generator
test holds the screen to a positive control. Recorded as a pass.

---

## 14. One emergent integer difficulty measure

**The total available score.** It is a property of the finished day and the list,
not a generator knob; integer valued; recomputed by the browser from the day's
answers and independently by the verifier from the dictionary. Tiers are fixed
percentages of the total, so a larger total means more words to find for the same
rank: the more there is to find, the more you must find. That tracks the human
experience directly.

Resolution: 265 distinct totals in the calibration sample, septile edges
[75, 96, 120, 145, 171, 207], bands of 333 to 344 days each. The design probe
before the build found [72, 96, 116, 141, 169, 202] on a different sample; the
build's study on the shipped lists is what `bands.ts` holds.

**Named fallback: the answer count.** 61 distinct values, septiles
[28, 37, 44, 52, 60, 70], every band populated, recorded in the same study so a
switch has its evidence committed. It would be used if the total tracks felt
difficulty worse than the count at the manual check.

---

## 15. Seven band calibration evidence

`tools/pangram-calibrate.ts` draws 4,000 screened candidates and writes
`data/pangram/study.json`: seeds, roots, screened count, acceptance, distinct
totals, the band edges and counts, the fallback's edges and counts, and the
rejection accounting. The generator test asserts `BAND_EDGES` equals the study,
every band is populated for both measures, and rerunning the whole study from its
seeds reproduces the committed edges exactly.

---

## 16. Monday versus Sunday player feel statement

Monday draws a total of 42 to 75 (median 59): a short list, a quick top rank.
Saturday draws 208 to 320 (median 239): four times as much to find, many longer
words, often several pangrams. Sunday sits at band 4 (146 to 169), the suite's
standard curve that eases on Sunday. A Monday top rank is a few minutes; a
Saturday one is a lunch break.

---

## 17. Every refusal and announcement

| Code | Announcement |
|---|---|
| `too-short` | Words need at least four letters. |
| `bad-letter` | Use only today's seven letters. |
| `no-centre` | Every word must use the centre letter. |
| `already-found` | You already found that word. |
| `not-a-word` | Not in the word list. |
| `game-over` | Today's letters are finished. |

The rules test reaches every code and asserts the catalogue is exactly these six.
A find is announced with its word, points and the new score and rank ("HABIT, 2
points. Score 3, Rough. 2 words found."). The first Finish tap announces that a
second tap ends the day. The day's total and answer count are never announced
during play; they appear in the finished detail.

---

## 18. Failure model and histogram buckets

**No loss state. `hasWinLoss` is false**, as the registry row had it. A day ends
when the player finishes or finds every answer, and every finished day is
shareable. The streak is played, the suite discipline.

Scoring: one point per letter past three, and seven more for a pangram. Tiers,
as percentages of the total:

| Tier | Threshold | Bucket label |
|---|---|---|
| 0 Excellent | 60 percent and a pangram | Top, with pangram |
| 1 Great | 40 percent (or 60 without a pangram) | 40% or more |
| 2 Good | 25 percent | 25% or more |
| 3 Fair | 10 percent | 10% or more |
| 4 Rough | below 10 | Under 10% |

Five buckets, the five tiers, bucket 0 distinguished, so the registry's
`bucketCount` of 5 stands. The pangram gate on the top tier is what makes the
game's name load bearing. Past the horizon there is no day, so no unrated
outcome exists.

---

## 19. At least two telemetry patterns

Three, all local, none leaving the browser:

1. **Deterministic output** (`deterministic-output`): the score meter, eight cells
   against the top tier's threshold.
2. **Micro replay path** (`micro-replay-path`): the first eight finds in the
   player's order, one token per find by length class.
3. **Emergent fingerprint** (`emergent-fingerprint`), section 25.

## 20. Exact telemetry record shape

```text
PangramRunLog
{
  v: 1
  entries: FindEntry[]      // one per find, in the player's order
}

FindEntry
{
  index: number             // 0 based order of the find
  lengthClass: 0 | 1 | 2    // four letters | five or six | seven or more
  pangram: boolean
  refusedBefore: number     // words refused since the previous find
  meter: number             // meter cells full after this find, 0 to 8
}
```

No field carries a letter, a word, the answer count or the total. The meter is a
function of the player's score and is written by `runLogOf` from state, so the
mapper needs nothing from the puzzle.

## 21. Exact mapping function

`artifactOf(state, runLog, context)`, pure, grammar C (Meter).

- **Row 1**, the meter: the last entry's `meter` cells as `barFull`, the rest
  `barEmpty`; zero finds is all empty.
- **Row 2**, the opening: the first eight finds, pangram to `best`, seven or more
  letters to `strong`, five or six to `partial`, four to `weak`, padded to eight
  with `unused`. Never `miss`: a short word is still a find.
- **Title**: `PANGRAM #n <tier>, <k> words[, pangram][, streak s]`.
- **Archetype**: BROWSER with no finds; HUNTER if a pangram is among the first
  three finds; GUESSER if refusals are at least the finds; LONGHAND if half or
  more of the finds are seven letters or pangrams; otherwise BUILDER.
- Both rows are exactly eight tokens, so the block needs no padding by the engine.

## 22. Clipboard artifact

Four lines: title, meter, opening, the suite URL. Worked examples in section 27.

## 23. Graphic card artifact specification

The canonical ArtifactModel drives the 1200 by 900 card: game title, puzzle
number, tier and find count, the meter, the fingerprint drawn as the meter's rise
across finds with corrections marked by shape, the archetype, and the URL. No
word, no letter.

## 24. Share leak test result

Every probe passes on a strong, a weak, an empty and a perfect run, and each
fires on a positive control built to leak:

- **Position**: row 1 only bar tokens, row 2 only the four find tokens or the pad.
- **Answer property**: the meter row equals what the fingerprint's last point
  rebuilds, so nothing but the run reached it.
- **Ordering**: full cells before empty, finds before the pad; any gap fires.
- **Shape**: exactly two rows of eight whatever the day's answer count.
- **Title**: the built in check with the day's pangram as the answer key; the
  title carries the tier, the player's find count and whether they found one.

## 25. Fingerprint definition

One point per find, x its index, y the meter after it, shape `correction` when
refusals preceded it and `accepted` otherwise, then a closing point at x equal to
the find count carrying the final meter, marking where the player stopped. The
closing point means a day finished with no finds still has a signature; without
it the engine refuses the artifact as a restyled score. WORD LADDER has exactly
that defect on an immediate reveal, confirmed in the container and logged in
BACKLOG.md.

## 26. Browser fallback budget

Share delivery is the engine's, unchanged. The page is **27.1 KB gzipped**,
measured in a throwaway certify mode build with PANGRAM marked live, against a
150 KB budget. Past the horizon `generatePuzzle` returns `missing` and the shell
shows its plain unavailable message: the browser holds no dictionary, and a board
with an invented word list would be worse than an honest absence. The horizon
must be regenerated before day 365, which falls on 2027-01-04 for the 2026-01-05
epoch (BACKLOG.md).

## 27. Worked share examples

A strong day on the tutorial letters, the pangram second, five finds:

```text
PANGRAM #248 Great, 5 words, pangram
🟦🟦🟦🟦🟦🟦⬜⬜
🟠⭐🔷🔷🔷⬛⬛⬛
dailykit.providentia.games
```

A perfect clear of the tutorial letters, found in alphabetical order:

```text
PANGRAM #248 Excellent, 21 words, pangram
🟦🟦🟦🟦🟦🟦🟦🟦
🟠🟩🟠🟩🔷⭐🟠🟩
dailykit.providentia.games
```

A day finished with seven four letter words:

```text
PANGRAM #248 Fair, 7 words
🟦⬜⬜⬜⬜⬜⬜⬜
🟠🟠🟠🟠🟠🟠🟠⬛
dailykit.providentia.games
```

## 28. All ten contract pieces

1. **identity**: id pangram, display PANGRAM, epoch 2026-01-05 (a Monday), the
   suite URL, accent hue 208 (unchanged; the contrast defect note covers 48 and
   128, not 208), monospace board font, the section 1 rule.
2. **manifest**: `/data/pangram/manifest.index.json`, twelve chunks of 31 days,
   seven day lookahead.
3. **parsePuzzle / generatePuzzle**: decode and measure the day; nothing past the
   horizon.
4. **state**: found words in order with refusal counts and the finished flag;
   deserialize replays every find through the rules.
5. **apply / inspect**: a word or finish, returning a state or a rejection; the
   finished v3 outcome.
6. **difficulty**: the total, measured at parse.
7. **telemetry / shareArtifact**: sections 20 and 21.
8. **render**: status, meter, draft, keypad, controls, found words, and after
   finishing the missed words with pangrams marked.
9. **input**: `custom`, tap, Enter, Backspace, Escape.
10. **help**: section 31. First session day: section 31.

## 29. The abstraction test, requirement 7.4

**Zero engine changes.** The build touched no file under `src/core`, `src/engine`,
`src/ui`, `src/contract` or `src/shared`. `custom` input, the neutral manifest
entry and the existing codec carried a game with no dictionary and a per day
answer list without change. WORD LADDER's open question, whether a shared
keyboard widget should be extracted, gets its second data point: PANGRAM needed
seven keys and a draft, not a 26 key keyboard, so it shares nothing with WORD
LADDER's keyboard and no extraction is indicated. FIVE LETTERS decides it.

## 30. Measured evidence

| Measurement | Value |
|---|---|
| ESDB 35, length 4 and up, at most 7 distinct, in ENABLE, minus deny | 26,892 words |
| ESDB 50, same | 39,114 words |
| Dictionary cost if shipped, ESDB 35 and 50 | 67 and 99 KB gzipped |
| Committed accepted list (no S), gzipped | 51 KB, build time only |
| Roots with a familiar pangram, all and without S | 5,263 and 2,632 |
| Candidate day size with S, median and p90 | 79 and 167 words |
| Candidate day size without S, median and p90 | 49 and 110 words |
| Screen acceptance, calibration | 59.3 percent |
| Horizon acceptance including band | 7.63 percent, 4,785 attempts |
| Total score distinct values and septiles | 265; 75, 96, 120, 145, 171, 207 |
| Fallback word count distinct values and septiles | 61; 28, 37, 44, 52, 60, 70 |
| Shipped horizon answers per day | 20 to 80, median 46 |
| Shipped horizon total per day | 42 to 320, median 128 |
| Shipped familiar share | 65 to 100 percent, median 78 |
| Pangrams per day | 1 to 7, median 1 |
| Manifest chunk | about 14 KB, 8.3 KB gzipped |
| Page, certify build | 27.1 KB gzipped |
| Offensive substring probe hits in accepted | 285, of which 67 denied |
| Verifier, 365 days | about 0.4 seconds, 17,417 answers |

## 31. Help content

One screen: the rule, five steps (spell and enter, the four letter and centre
rules, scoring with the pangram bonus, the pangram gated top rank, finishing
reveals missed words), and a worked example on A B I N O T with H in the centre:
BATH 1, HABIT 2, HABITATION a pangram 14, TINT refused for the missing centre.

The first session day is that same set, embedded in `tutorial.ts` because a
tutorial is a session mode with no manifest day: 21 answers, every one familiar,
total 63, one pangram. The generator test solves the set against the committed
lists and requires this exact list, so it cannot drift.

## 32. Explicit risks

1. **The answers are in the network tab.** Light obfuscation only, as for every
   game; a determined player can decode any day. Stated plainly (8.4).
2. **No day past the horizon.** Operationally load bearing: the manifest must be
   regenerated and shipped before 2027-01-04. BACKLOG.md carries it.
3. **`not-a-word` against a real word.** A word outside ESDB 50 is refused. The
   list is generous and the finish reveals the answers, so a player learns what
   counts; the derivation handles additions.
4. **The deny list is not yet owner reviewed.** The manual check gates it.
5. **The total may track grind rather than felt difficulty.** The fallback count
   is calibrated and committed.
6. **Trade dress.** The mechanic is a well known genre; the name, the keypad
   layout, the scoring table, the rank names (the suite's own) and the share
   block are this suite's, and no hexagon appears anywhere.
