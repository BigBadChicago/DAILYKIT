# FIVE LETTERS

Game nine of twelve. Design document, charter Phase 13. Written on the v3
contract from its first line, following PANGRAM as the worked word game template.
Designed and built in one conversation, 2026-09-21, under the standing rule that a
game's conversation runs from design through delivery (HANDOFF.md section 8).

Every number below was reproduced in the container before it was adopted, from
SCOWL/ESDB at commit 1e5b7d3 and ENABLE at md5 33f2b09e2d9dfb732fa16b5f05a5a8d1,
with the 123 entry family deny list of section 12. The reproductions are in
section 30, and `data/five-letters/study.json` carries the calibration figures
the tests rerun.

---

## 0. The finding that shapes everything

**FIVE LETTERS ships its guess list to the browser; PANGRAM's manifest approach
does not apply.** A PANGRAM day's legal words are fixed by its seven letters, so
the day can carry them. A FIVE LETTERS guess is any five letter word on any day,
so validation cannot depend on the day and the list must be on the device before
the first guess. Accepting any five letters instead would let a player probe with
nonsense strings such as AEIOU or QQQQQ, which removes the vocabulary constraint
that is the whole game.

The cost was measured before it was committed to: the accepted list, 4,359
words, is 26,153 bytes raw and 11,478 bytes gzipped as the embedded blob. The
built page measured 38.2 KB gzipped in a throwaway live build, a quarter of the
150 KB budget, against PANGRAM's 27.1 KB. The list is generated source,
`src/games/five-letters/words.ts`, exactly as WORD LADDER ships its own, so it is
in the page's chunk, cached with it, and plays offline with no fetch.

The manifest carries only the day's answer, through the engine codec, and two
integers the page recomputes or the verifier proves. The answer pool, 1,949
words, never ships; it is a build time screen on which words may be drawn.

---

## 1. One sentence rule

> Find the five letter word in six guesses, each letter marked right, present or absent.

The provisional registry sentence stands. It was checked against the built
module and needs no amendment.

**Feedback, exactly.** A guess is marked against the answer in two passes:

1. Every position whose guess letter equals the answer letter is marked right.
   Each answer letter not matched that way is counted.
2. Then, left to right over the positions not marked right, a guess letter is
   marked present while the count of that letter is above zero, and the count
   falls by one. Otherwise it is absent.

So a letter is marked right or present at most as many times as the answer holds
it, exact matches claim their copies before any misplaced copy does, and among
surplus misplaced copies the leftmost is the one marked present. The cases that
break naive single pass marking, each a test in
`tests/games/five-letters/feedback.test.ts`:

| Answer | Guess | Marks | What naive marking gets wrong |
|---|---|---|---|
| HEART | TREAT | absent, present, present, present, right | calls the first T present, though the last T already claimed the only T |
| CRANE | SPEED | absent, absent, present, absent, absent | calls both Es present, though CRANE holds one |
| ABBEY | BOBBY | present, absent, right, absent, right | the exact B must claim its copy before the leftmost B takes the other |
| LLAMA | ALLAY | present, right, present, present, absent | each of the answer's two As and two Ls is claimed once |

A property test over every pair of twelve repeat heavy words asserts the count
rule, and that four right with one present never occurs, which section 24 uses.

---

## 2. Cognitive mode

**Deduction from feedback, the same mode as CIPHER.** The overlap is stated
plainly: both games hand the player marks after each guess and ask them to narrow
a hidden answer in six. The lineup deviation from Section 7.1 of the charter is
accepted and recorded in BACKLOG.md; it is not relitigated here.

What distinguishes them for a player:

1. **The search space is a vocabulary, not a code.** CIPHER's 1,296 codes are
   every combination of six symbols; any guess is legal and any symbol can go
   anywhere. FIVE LETTERS' candidates are real words, and so are its guesses.
   Half the work is recall: thinking of a word that fits _R_A_ and also tests a
   new letter. CIPHER has no recall half.
2. **Feedback is per position.** CIPHER reports how many are exact and how many
   misplaced, never which. FIVE LETTERS marks each letter. The deduction is
   positional elimination rather than CIPHER's counting arithmetic.
3. **Letter frequency is knowledge the player brings.** A CIPHER symbol is as
   likely as any other; an E is far likelier than a Q, and good players use it.

---

## 3. Substrate and its hardest substrate gate

Substrate: the English five letter vocabulary, one hidden word and six rows of
five tiles. The hardest gate is the **44 pixel touch floor for a 26 key
keyboard at 360 pixels**, ARCHITECTURE2 section 46's named stress test. QWERTY
ten across leaves about 31 pixels a key and fails. Section 5 settles it with
WORD LADDER's alphabetical seven across, measured at 45.4 by 52 pixels.

---

## 4. Session length

One to three minutes. The witness solver's median is four guesses (section 30);
a player types five letters and reads one row per guess. It is the suite's short
word game, beside PANGRAM's open ended session.

---

## 5. Input model

`custom` input, tap and physical keyboard. The keyboard is alphabetical, seven
across, in four rows: A to G, H to N, O to U, then V to Z with Delete and Enter
closing the last row, so every row is seven keys.

**Measured, not assumed.** Headless Chromium at 360 by 740 against a throwaway
live build: the play area is 336 pixels wide, and every one of the 28 keys
measures 45.4 by 52.0 pixels, with no horizontal scroll, in light and dark. The
first attempt used six pixel gaps, which leave 42.9 pixels a key; the 44 pixel
minimum width then pushed each row 8 pixels past its container. Three pixel
column gaps fixed it, and the stylesheet records why.

Physical keys: letters type, Backspace deletes, Enter submits. Modifier chords
are ignored so browser shortcuts still work. A refused word stays on the row to
be edited, as the genre does it.

Marks are never colour alone: right is a filled tile with a filled dot (U+25CF),
present a dashed border with a hollow dot (U+25CB), absent a plain dimmed tile
with a cross (U+00D7). The keyboard carries each letter's best mark the same way,
absent keys struck through. Every row is announced and labelled in words.

**The shared keyboard question is answered no.** WORD LADDER logged it and
PANGRAM declined it. FIVE LETTERS has the full 26 keys, so it decides. A
`src/ui/keyboard` widget would be an engine change for two games, WORD LADDER and
FIVE LETTERS, whose keyboards already differ in the ways that matter: WORD
LADDER overwrites an armed cell, FIVE LETTERS appends; FIVE LETTERS shows per
letter marks, WORD LADDER none; the last row's controls differ. What they share
is a 26 letter array and one CSS grid rule. LETTER TRAIL taps a grid and PANGRAM
has seven keys, so no third consumer is coming. Extraction would cost an engine
change, an abstraction test entry and a contract for a component used twice with
different behaviour. It is recorded as a BACKLOG item, to reopen if a third 26
key game is ever approved. Zero engine changes, section 29.

---

## 6. Puzzle generator strategy

Rejection sampling, `src/games/five-letters/generator.ts`. For each puzzle
number, one seeded stream (`seedFor("five-letters", n)`, no salt) draws an answer
uniformly from the pool. The draw is kept when three things hold. Its candidates
after the opening fall in the weekday's band (section 14). It has not been used
earlier in the horizon. The witness solver solves it in six or fewer. Otherwise
the next draw is taken, up to a ceiling of 2,000.

Levers are records of what a day is, never inputs: `repeat-letter` or
`distinct-letters`. A repeated letter is the likeliest duplicate feedback case a
player meets, so it is auditable per day.

The manifest entry:

```text
answer    five symbols in range 26, engine codec, keyed on the puzzle number
best      { candidates, witness }: the section 14 integer and the witness guess count
levers    ["repeat-letter"] or ["distinct-letters"]
attempt   the draw index that was kept, for replay
```

Chunks hold 31 days, the monthly size PANGRAM and POKER GRID use: twelve chunks,
38,058 bytes in total.

---

## 7. Measured generation acceptance rate

365 days from 3,036 draws, **12.02 percent acceptance**. Rejections: 2,626 out of
band, 45 repeats, 0 witness failures. Days per weekday band: 53, 52, 52, 52, 52,
52, 52. Generation takes about 6 seconds including the 19 million entry pattern
table.

---

## 8. State space census

Answer pool 1,949; accepted guesses 4,359; mark patterns 243, of which at most
238 can occur, because four right with one present is impossible. Per day, the reachable play
states are the sequences of up to six distinct accepted words, cut at a solve:
under 4,359 to the sixth, about 6.8 times ten to the 21. The rules never enumerate
it. Each guess costs one set lookup and one two pass marking.

---

## 9. Exact or bounded verification method

**Exact.** `tools/five-letters-verify.ts` imports only the engine codec's
constant and this game's answer codec. It writes again, from this document, the
two pass marking, the pattern table, the opening search, the greedy witness
search and the band rule. It never imports the generator, the solver, the rules,
the feedback primitives, the difficulty module or the band table.

Once for the horizon, it checks four things:

1. every pool word is accepted;
2. the page's embedded list is byte for byte `accepted.txt`;
3. the study carries six edges;
4. the study's opening is the ideal one, recomputed over the full list.

Per day, it checks six things:

1. structure;
2. the answer is a pool word;
3. the lever matches the answer;
4. candidates after the opening equal the stored figure;
5. that figure's band is the weekday's;
6. the witness solves the day in six or fewer, in exactly the stored count, and
   no answer repeats in the horizon.

Measured: 365 days in about 12 seconds.

---

## 10. Uniqueness claim

The answer is one word, so uniqueness is trivial in the strict sense. The claim
that matters is that the answer is a pool word, a familiar headword, and the
verifier proves it per day. Some mark patterns leave several candidates that are
all accepted words. That is the genre, and section 11's witness claim is what
keeps it fair.

---

## 11. Fairness claim

**Every day is solvable in six by a player who knows only that the answer is a
word.** The witness opens with TARES, then plays greedily over the whole accepted
list: it picks the guess that minimises the sum of squared partition sizes over
the candidates still consistent. Ties go first to a guess that could itself be
the answer, then to the earlier word alphabetically. The witness never uses the
pool, so it does not know the answer is a familiar word.

Over the entire pool, not only the horizon, it solves every answer in six or
fewer:

| Guesses | 2 | 3 | 4 | 5 | 6 |
|---|---|---|---|---|---|
| Answers | 41 | 774 | 1,041 | 90 | 3 |

The verifier proves it per shipped day with its own search. The browser does not
rerun the witness; `parsePuzzle` recomputes the difficulty and refuses an entry
whose stored figure disagrees.

---

## 12. Word lists and the deny list, the assets

**Source.** ENABLE intersected with SCOWL/ESDB, American spelling, the family
source WORD LADDER settled; never wordfreq.

**Derivation**, `tools/five-letters-words.ts`, offline only, rebuildable byte for
byte from the recorded inputs. It uses PANGRAM's parse and also keeps each word's
headword level:

1. every lowercase headword and inflection in `scowl-pre.txt`, at the smallest
   size level any line gives it; and, separately, the smallest level at which it
   heads its own line
2. American only, entries tagged upper or abbr excluded
3. in ENABLE
4. exactly five letters
5. minus `data/word-lists/deny.txt`

`data/five-letters/accepted.txt` is size 50 and below, **4,359 words: the single
list.** The browser validates guesses against it, the difficulty integer counts
over it, and the witness searches over it. Because one list does all three jobs,
every claim about a day is exact. `data/five-letters/answers.txt` is the accepted
words that head a line at size 35 or below, **1,949 words**. That drops plurals
and simple past tenses, which the genre never uses as answers. The pool is only a
draw screen and never ships.

Before deny, five letter words in ENABLE number 3,429 at ESDB 35, 4,406 at 50,
4,993 at 60 and 6,574 at 70. ESDB 50 was chosen as PANGRAM and WORD LADDER chose
it. ESDB 70 would accept 6,574 words at 17.1 KB gzipped and admit obscurities as
legal guesses. That serves a probing player rather than a guessing one.

**The deny list** grew from 89 to 123 entries, authored in this run from a 123
word offensive substring probe of the five letter list. 13 of the hits were
already denied. 34 were added: vulgar words, slurs, explicit sexual and genital
terms, and the plurals of four letter entries already denied. The additions are
bimbo, boner, boobs, butts, cocks, coons, craps, damns, dicks, dicky, dykes,
farts, fucks, gooks, gypsy, hussy, kinky, knobs, labia, penis, pimps, pubic,
pukes, rapes, semen, shits, slags, sluts, smuts, sperm, squaw, teats, turds and
vulva. False positives such as class, grass, title, spice and cumin were left
alone. It errs toward refusing, and a wrongly denied word costs only a "not in
the word list" refusal. It is **not yet owner reviewed**; that review is the
first row of MANUAL-CHECKS.md section 8.

Seven of the additions are in PANGRAM's committed accepted list, derived before
them: bimbo, boner, dicky, kinky, labia, pubic, vulva. That is a BACKLOG item for
PANGRAM, like WORD LADDER's five, to fix before PANGRAM goes live.

**Hand additions**: none.

---

## 13. Decomposition result

**Not applicable, with a reason.** A day is one hidden word, and every guess's
marks constrain that same word, so there are no independent sub puzzles to
split. The certification plan records `n/a` with this reason.

## 13a. Symmetry result

A day is its answer; no reordering, reflection or relabelling produces another
day. The only symmetry is repetition, and the verifier refuses any answer shipped
twice in the horizon, proved, not waived.

---

## 14. One emergent integer difficulty measure

**Candidates left after the ideal opening:** how many accepted words earn the
same marks against TARES as the answer does. It is a count that falls out of the
answer's letters, not a label, and the page recomputes it at parse from the
shipped list, about 4,359 markings.

TARES is measured, not chosen: it is the accepted word with the smallest expected
candidates left over the accepted list, 97.54. It is a constant in
`difficulty.ts`, because changing it changes every stored difficulty, and the
verifier proves it is still the ideal opening.

**Named fallback: answers still in the pool after the opening.** It bands into
seven populated bands too (section 15). It is the fallback because it is the
honest measure if the pool ever becomes the public answer list, and it needs the
pool, which the page does not hold.

---

## 15. Seven band calibration evidence

The study is exhaustive, every pool answer measured, so it has no seeds and
reruns to the same bytes. The generator test reruns it and demands the committed
`study.json`.

| Measure | Distinct values | Septile edges | Answers per band |
|---|---|---|---|
| Candidates after TARES | 56 | 15, 28, 56, 90, 109, 174 | 280, 324, 243, 294, 302, 314, 192 |
| Fallback: pool answers after TARES | 42 | 10, 17, 36, 59, 69, 122 | 282, 275, 294, 289, 266, 366, 177 |

Band 6 holds 192 answers, more than three and a half years of Saturdays, so band exhaustion
is not a near term risk. The weekday curve is the suite's: Monday 0, Tuesday 1,
Wednesday 2, Thursday 3, Friday 5, Saturday 6, Sunday 4.

---

## 16. Monday versus Sunday player feel statement

On a Monday, a player who opens with a common word is left with at most about
fifteen possibilities after a TARES like guess. HEART, with eleven, is a Monday
word. By Saturday, the same opening leaves over 174, typically because the answer
shares almost nothing with it, so the player must spend guesses testing letters
rather than placing them.

---

## 17. Every refusal and announcement

| Code | When | Announced |
|---|---|---|
| too-short | not five letters a to z | "Guesses need five letters." |
| not-a-word | not in the accepted list | "Not in the word list." |
| already-guessed | a word already played today | "You already tried that word." |
| game-over | any guess after the end | "Today's word is finished." |

Each accepted guess is announced as its row, for example "TREAT: T absent, R
present, E present, A present, T right. 1 of 6 guesses used." The end is
announced as "Solved in N." or "Not solved. The word was HEART."

## 18. Failure model and histogram buckets

Pass or fail, `hasWinLoss` true, as the provisional row had it. Seven buckets:
solved in one to six, then not solved, bucket 0 distinguished. The tiers are:

| Result | Tier |
|---|---|
| Solved in 1 or 2 | Excellent |
| Solved in 3 | Great |
| Solved in 4 | Good |
| Solved in 5 or 6 | Fair |
| Not solved | Rough |

A solve in six stays above a miss, unlike CIPHER. The fairness claim makes six
always reachable, so reaching it is a result.

---

## 19. At least two telemetry patterns

`emergent-fingerprint` (section 25) and `comparative-friction`: each guess
carries the number of words refused since the previous accepted guess, counted by
the renderer and passed in the action, as PANGRAM and WORD LADDER do. Both are
computed on the device from the player's own run. Nothing is sent anywhere.

## 20. Exact telemetry record shape

```text
RunLog { v: 1, entries: GuessEntry[] }
GuessEntry {
  index          0 to 5, the guess's position
  right          marks right in that guess
  present        marks present in that guess
  churn          positions whose letter changed from the previous guess, 0 first
  discipline     2 consistent with every earlier row, 1 with the latest only, 0 neither
  refusedBefore  words refused since the previous accepted guess
  solved         right equals five
}
```

Every value is a number or a boolean; a test asserts the serialised log holds no
string value, so no letter can travel in it. It needs no stored field: the state
already holds the guesses, and `stateVersion` stays 1.

## 21. Exact mapping function

Grammar A, one row per guess, at most six. A row is `right` best tokens, then
`present` partial tokens, then miss tokens to five, which is CIPHER's mapping.
**Sorted, not positional.** The genre's positional grid is refused because it
leaks measurably: across every pool answer's witness block, a positional block
leaves a median of 1,280 and as few as 4 answers possible. A sorted block leaves
a median of 1,948 and never fewer than 126.

The title is `FIVE LETTERS #N <tier>, k/6` or `X/6`, with `, streak S` from two.

Archetype, deterministic over the run only:

| Condition | Archetype |
|---|---|
| no guesses | UNSTARTED |
| every guess after the first respected all feedback | STRICT |
| most later guesses changed four or more letters | PROBER |
| as many refusals as guesses | TYPIST |
| otherwise | STEADY |

## 22. Clipboard artifact

The engine renders the ArtifactModel: title, one row per guess, the bare URL.
Eight lines at most, inside the nine line cap.

## 23. Graphic card artifact specification

The engine's card from the same model. The rows appear as tokens, the
fingerprint as points plotted guess index across and churn up, shaped by
discipline, and the archetype as a word. No game specific drawing.

## 24. Share leak test result

Four probes, each passing on a fast, a three guess, a six guess and a lost
artifact, and each firing on a positive control built to leak
(`tests/games/five-letters/telemetry.test.ts`):

- **Position:** a row is sorted by rank, and any unsorted row or foreign token
  fires.
- **Answer property:** the title must match its pattern, no row may hold four
  right and one present, and the outcome must agree with the last row.
- **Ordering:** at most six rows, and a solved row only last.
- **Shape:** every row is five wide.

The engine's built in title check also fires if the answer reaches the title.

## 25. Fingerprint definition

One point per guess: x the guess index, y the churn (0 to 5), shape accepted,
correction or refused for discipline 2, 1 or 0. Two players who both solve in
four are told apart by how far they jumped and whether they kept to their
feedback.

## 26. Browser fallback budget

There is no generation past the horizon. The page does not hold the pool, and
drawing from the accepted list would ship obscure answers, so a day past the
horizon is an honest "unavailable". The horizon is 365 days from epoch
2026-01-05 and ends on 2027-01-04; regenerating before then is a BACKLOG item,
as for PANGRAM. The page's own costs are one list split at load, about 4,359
markings at parse, and one set lookup and one marking per guess.

## 27. Worked share examples

Solved in two, streak five:

```text
FIVE LETTERS #264 Excellent, 2/6, streak 5
🟩🟩🟩🟩🔻
⭐⭐⭐⭐⭐
dailykit.providentia.games
```

Solved in three:

```text
FIVE LETTERS #264 Great, 3/6
⭐🟩🟩🔻🔻
⭐⭐⭐🔻🔻
⭐⭐⭐⭐⭐
dailykit.providentia.games
```

Not solved:

```text
FIVE LETTERS #264 Rough, X/6
🔻🔻🔻🔻🔻
⭐🟩🔻🔻🔻
⭐🔻🔻🔻🔻
🟩🟩🔻🔻🔻
⭐🟩🟩🔻🔻
🟩🟩🟩🟩🔻
dailykit.providentia.games
```

## 28. All ten contract pieces

| Piece | Where |
|---|---|
| Identity | `module.ts`: five-letters, hue 288, epoch 2026-01-05 |
| Puzzle production | `parsePuzzle` from the manifest; `generatePuzzle` refuses past the horizon; `firstSessionPuzzle` is HEART |
| State | `initialState`, `serialize` as words and refusal counts, `deserialize` rebuilt through the rules |
| Rules | `rules.ts` `applyAction`, refusals as values |
| Terminal conditions | `inspect`: solved, or six guesses |
| Share rendering | `telemetry.ts` `artifactOf`, grammar A |
| Stats shape | seven labels, bucket 0 distinguished |
| Rendering | `render.ts` `mountFiveLetters` |
| Input | `custom`, tap, Enter and Backspace |
| Help | `help.ts`, the TREAT against HEART example |

## 29. The abstraction test, requirement 7.4

**Zero engine changes.** No file under `src/core`, `src/engine`, `src/ui`,
`src/contract` or `src/shared` changed. The keyboard widget question was
considered as a potential defect and declined (section 5), so no defect is
logged. One tooling addition sits outside the engine: `tools/gate.sh` and the
`gate` script, the efficiency pass of this run.

## 30. Measured evidence

| Measurement | Value |
|---|---|
| Five letter words in ENABLE, ESDB 35 / 50 / 60 / 70, before deny | 3,429 / 4,406 / 4,993 / 6,574 |
| Gzipped list at 35 / 50 / 60 / 70 | 8.8 / 11.3 / 12.8 / 17.1 KB |
| Deny probe | 123 hits, 13 already denied, 34 added |
| Accepted, answers | 4,359, 1,949 |
| Embedded blob | 26,153 bytes, 11,478 gzipped |
| Built page, throwaway live build | 38.2 KB gzipped; engine 11.2 KB of it |
| Ideal opening | TARES, 97.54 expected left |
| Witness, solved in 2 / 3 / 4 / 5 / 6 | 41 / 774 / 1,041 / 90 / 3 |
| Difficulty edges, distinct values | 15, 28, 56, 90, 109, 174; 56 |
| Fallback edges, distinct values | 10, 17, 36, 59, 69, 122; 42 |
| Leak: positional median, min | 1,280, 4 |
| Leak: sorted median, min | 1,948, 126 |
| Generation | 12.02 percent acceptance, 38,058 bytes |
| Verification | 365 days in about 12 seconds |
| Keys at 360 by 740 | 28 keys, each 45.4 by 52.0, no horizontal scroll |
| Right tile contrast, white text | 8.55 to 1 light, 6.69 to 1 dark |

## 31. Help content

One screen. The steps are to type or tap a word, what right, present and absent
mean, the duplicate rule in one sentence, and that the keyboard keeps each
letter's best mark. The worked example is TREAT against HEART, whose lines are
their own text equivalent. The first session day is HEART, a band 0 pool word
with eleven candidates; a module test holds it to the pool and the band.

## 32. Explicit risks

1. **The answer is behind light obfuscation only.** Anyone can decode a day from
   the manifest, as for every game. Section 8.4 of the charter asks for no more.
2. **The horizon lapses on 2027-01-04.** It must be regenerated before then.
3. **The deny list is not yet owner reviewed**, and seven newly denied words are
   still in PANGRAM's list.
4. **The accepted list admits words a player may not know as answers.** That is
   intentional: it is the guess list. Answers come only from the familiar pool.
5. **Discipline reads as a hard mode signal.** It is only telemetry, and no hard
   mode is offered (BACKLOG.md).
6. **The genre's own trade dress.** The name, the alphabetical keyboard, the
   shapes as well as colours for marks, and the sorted share rows differ from the
   best known game of this genre, whose name and grid this suite does not use.
