# WORD LADDER preparation

Evidence gathered on 2026-09-19, before WORD LADDER's conversation, so that its
design document starts from measurements and not from the section 46 note alone.
The LETTER TRAIL conversation found its section 46 fairness model unbuildable
only after it began; this file exists so WORD LADDER does not repeat that.

Status: **input, not decisions.** Every "proposed" item below is for WORD
LADDER's design document to confirm or overturn with its own evidence. When
`WORD-LADDER.md` exists, it absorbs what it keeps from this file and this file is
deleted in the same change.

The numbers come from seeded sampling (seeds 1, 2 and 3; 3,000 to 4,000 random
start and goal pairs per configuration) in a throwaway probe, not from shipped
code. The generator must reproduce them exactly before any band is set.

---

## 1. Sources and licenses

| Source | Version used | License | Use |
|---|---|---|---|
| ENABLE (`enable1.txt`, 172,823 words) | md5 `33f2b09e2d9dfb732fa16b5f05a5a8d1`, from `github.com/dolph/dictionary` | Public domain | Validity filter: every accepted word must be in ENABLE |
| ESDB, formerly SCOWL, by Kevin Atkinson | `github.com/en-wl/wordlist` commit `1e5b7d3a72f47a71da5d28686c1dd4b397178485` (2026-06-24) | MIT-like: use, modify and sell permitted, provided the copyright notice and permission notice appear in all copies and in supporting documentation | Familiarity: its size levels rank words by commonness |

ESDB license conditions that bind the design:

1. **Sizes 80 and below only.** Above 80 the UK Advanced Cryptics Dictionary
   notice also applies. Everything proposed here uses sizes 35 to 60.
2. **American spelling only, spelling code `A`.** The Australian code `D` and
   region `AU` bring a second notice.
3. **The notice ships.** It goes in ASSETS.md and on the About page, alongside
   whatever word list file is shipped.

Extraction, after `make` in the ESDB checkout:

```text
./scowl word-list <size> A 1 --wo-poses=abbr --categories= --deaccent \
  --wo-usage-notes offensive-1,offensive-2,vulgar-1,vulgar-3
```

then keep lowercase ASCII words of the chosen length that are also in ENABLE.
Uppercase entries are proper nouns and fall out.

**Recommendation for the whole word family:** derive the lists once, offline,
and commit the derived files with the notice. Neither CI nor the browser should
fetch or build ESDB. LETTER TRAIL, as merged, uses ENABLE intersected with
wordfreq's top 30,000 (Apache 2.0) as its familiarity source, both offline only
and license clean, recorded in ASSETS.md; it did not ship an unnamed list. So the
family already has two familiarity sources in play, wordfreq for LETTER TRAIL and
ESDB proposed here, and the design document must settle open question 3 below:
whether WORD LADDER adopts ESDB, adopts wordfreq to match LETTER TRAIL, and
whether the family converges on one source. ESDB size 35 remains a license clean
option; the point is that the choice is now a family decision, not a replacement
for something unnamed.

---

## 2. Findings

### F1. Four letters, not five

| Measure | 4 letters | 5 letters |
|---|---|---|
| Familiar words (ESDB 35 and ENABLE) | 1,859 | 3,428 |
| Share in the largest connected component | 93% | 73% |
| Mean neighbours per word | 8.0 | 5.4 |
| Most common shortest distance between random pairs | 5 | 7 to 10, long tail to 22 |

Five letter graphs are sparse: a quarter of familiar words cannot reach the rest,
and typical ladders run past ten rungs. Four letters is also the form the puzzle
is known by. **Proposed: four letters.**

### F2. Par is only exact if the accepted list and the par list are the same list

If the game accepts every ENABLE word but computes par over familiar words only,
a player using obscure words beats par on **55.3%** of four letter pairs (76.1%
for five letters). Par would stop being the optimum, and the verifier could no
longer claim it is exact.

Accepting all of ENABLE and computing par over all of ENABLE fixes exactness but
lets par routes pass through words such as RIEL, AIRT and KYAT.

**Proposed: one accepted list; par is the exact shortest path over that list;
and the generator keeps only pairs where at least one shortest path uses familiar
words alone.** Par is then both exact and reachable by an ordinary vocabulary,
and "under par" cannot happen, which also removes a bucket.

### F3. How wide the accepted list should be

Familiar core fixed at ESDB 35. Pairs screened for par 4 to 7 with a familiar
only shortest path.

| Accepted list | Words | Gzipped | Pairs accepted |
|---|---|---|---|
| ESDB 40 | 1,960 | 4,579 B | 72.4% |
| ESDB 50 | 2,268 | 5,306 B | 59.2% |
| ESDB 60 | 2,543 | 5,987 B | 51.0% |

Widening the list costs acceptance, because extra words open shortcuts that
bypass the familiar route. What it buys is fewer "not a word" rejections. At
ESDB 50, 1,635 ENABLE words are still rejected. A sample: fuji, riel, pili, kief,
ryes, nana, shes, rath, bize, sabe, airt, muns, gies, pled, frow, elds, ukes,
pixy, lavs, slub, deva, frap, dews, oyez, kyat. A few (ryes, pled, dews, nana,
pixy) will annoy a player. Words ESDB 50 adds over 35 include agog, thru, beau,
demo, scam, heck, yore, ankh, gird, oats, ulna, bozo.

**Proposed: ESDB 50 accepted, ESDB 35 familiar.** 59% acceptance gives a 365 day
horizon from about 620 attempts. The design document should list the plainly
common ENABLE words that ESDB 50 rejects and decide whether to add them by hand,
once, as part of curation.

### F4. The difficulty integer: par alone collapses the bands

Par 4 to 7 has four values (par 3 to 7 has five). That repeats the DIFFERENCE
RELAY lesson: too few distinct values cannot fill seven bands. Candidates
measured at ESDB 50:

| Candidate | Distinct values | Septile edges |
|---|---|---|
| Par | 4 | not usable |
| Number of shortest paths (fewer is harder) | 52 | 1, 2, 3, 5, 7, 11 |
| Words lying on some shortest path | 69 | 6, 8, 10, 13, 18, 25 |
| Accepted words within par minus one of the start (the search ball) | 1,177 | 294, 441, 654, 882, 1,109, 1,526 |
| Par and detours as a pair | 12 | skewed, four pairs under 1% |

A detour is a rung that cannot bring the word closer to the goal letter by
letter: par minus the number of positions where start and goal differ. The
detour distribution is 0: 12%, 1: 41%, 2: 29%, 3: 16%, 4 or 5: 2%. Detours are the
most human meaningful measure ("you must step away to get there"), but too
coarse on their own.

**Proposed: the search ball as the banded integer,** with par and detours as
recorded levers that bias the weekly curve (early week par 4 to 5 and zero or
one detour, late week par 6 to 7 and two or more). The design document must
still test that the ball tracks human difficulty; it is a hypothesis.

### F5. The keyboard can meet the 44 pixel floor if it is alphabetical

A QWERTY row of ten keys at 360 pixels gives about 32 pixels a key, below the
floor. The ladder does not need QWERTY: a rung changes one letter.

| Layout | Keys | Key width at 360 px, 12 px gutters |
|---|---|---|
| QWERTY, ten across | 26 + 2 | about 32 px, fails |
| Alphabetical, 7 across by 4 rows | 26 + submit + undo | 44.6 px with 4 px gaps, passes with no margin |
| Alphabetical, 6 across by 5 rows | 26 + submit + undo + 2 spare | 52.7 px with 4 px gaps, passes |

**Proposed interaction:** tap the letter to change in the current word, then tap
the new letter; the rung is submitted when it forms an accepted word. A physical
keyboard types a whole word. Either layout must be measured in the page at 360
pixels, since the shell's real gutter decides the margin.

### F6. Bytes and runtime

The accepted list is about 5.3 KB gzipped as sorted text; the page would land
near 34 KB against the 150 KB budget. Building the one letter graph and a
breadth first search over 2,268 words is a few milliseconds, so the runtime can
compute each rung's distance to the goal. That feeds the share without shipping
any distances.

### F7. Offensive words need a deny list of our own

ESDB's usage notes remove only the worst terms: at size 35 the filter removed a
single four or five letter word. ENABLE contains slurs and vulgar words, and a probe of 20
common vulgar words and slurs found 7 of them in the ESDB 50 list. **Required:** a committed deny list, applied to the
accepted list, the familiar list and the answer pool, reviewed by the owner.
Rejecting a vulgar word typed by a player as "not in the word list" is
acceptable.

---

## 3. Proposed shape, for the design document to confirm

| Piece | Proposal |
|---|---|
| Word length | 4 |
| Accepted list | ESDB 50, American, in ENABLE, minus the deny list, plus any hand additions from F3 |
| Familiar list | ESDB 35 on the same filters |
| Par | Exact shortest path over the accepted list, with at least one all familiar shortest path |
| Screen | Par 4 to 7, start and goal familiar, no repeated start or goal within the horizon window the design sets |
| Difficulty | Search ball below par, banded in seven; par and detours as recorded levers |
| Failure model | No loss. A reveal escape. Buckets: par, par plus 1, plus 2, plus 3 or more, revealed (five, matching the registry's provisional `bucketCount`) |
| Share | One glyph per rung by change in distance to the goal: closer, level, farther. No letters, no words |
| Input | Tap position then letter on an alphabetical keyboard; physical keyboard types words |
| Runtime assets | The accepted list only; familiarity is offline only |

## 4. Open questions for the design document

1. Is a rung limit needed at all, or is the reveal escape enough? A loss state
   would change `hasWinLoss`.
2. Does the share mark "farther" rungs? It is honest but may read as a scolding.
3. Should the accepted list be one list shared by all four word games or one per
   game? Games may not import from each other, so sharing means a tools step that
   writes each game's copy.
4. Which plainly common words rejected at ESDB 50 are added by hand (F3)?
5. Does the search ball track real difficulty? The manual check should include
   a few ladders at each band edge.
