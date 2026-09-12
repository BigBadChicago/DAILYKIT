## 9. SHARE BLOCK REQUIREMENTS

The share block is the platform's only distribution, so it is the most constrained thing you will design and also the place where a good concept most often earns its life. The constraints below are narrow where they have to be and open where they do not. Read the distinction, because concepts routinely refuse themselves over a rule that is not actually there.

### 9.1 Three rules that are genuinely hard

Everything else in this section is guidance.

**H1. Nine lines, including the title and the URL.** Blocks taller than about eight rows get truncated in link previews and in chat clients, and a truncated block is a block nobody shares.

**H2. Nothing in the block may be worked backwards into the answer.** Section 9.6 gives the test.

**H3. Every glyph you use must render as a picture, at a single character width, everywhere.** Section 9.5 gives the rule that guarantees this and the reason it is not negotiable.

### 9.2 The token vocabulary

Every game draws from one shared vocabulary, so that three different games' blocks read as siblings in a group chat. Use these names in your drafts, and the glyphs shown so the draft looks right when you paste it.

**The result ladder.** Five tokens, ordered best to worst. The workhorse.

| Token | Glyph | Means |
|---|---|---|
| best | ⭐ | the best outcome |
| strong | 🔷 | close to it |
| partial | 🟩 | a middling outcome |
| weak | 🟠 | a poor one |
| miss | 🔻 | failure |

**The meter.** Two tokens, for a proportion drawn as a bar.

| Token | Glyph | Means |
|---|---|---|
| barFull | 🟦 | one filled unit |
| barEmpty | ⬜ | one empty unit |

**Direction.** Four tokens, for relational feedback that a quality ladder cannot express, such as higher and lower, or nearer along an axis.

| Token | Glyph | Means |
|---|---|---|
| up | 🔼 | above, higher, or north |
| down | 🔽 | below, lower, or south |
| left | ⏪ | left, earlier, or west |
| right | ⏩ | right, later, or east |

**Structure.** One token, for a slot that carries no result.

| Token | Glyph | Means |
|---|---|---|
| unused | ⬛ | not attempted, skipped, or out of play |

Thirteen tokens. You may use any subset, and you may use tokens from more than one family in one block. A token must be used for something close to what its name says: `up` may mean "aim higher", it may not mean "your second guess".

### 9.3 Asking for a token that does not exist

The vocabulary is closed to invention, not to extension. If your concept genuinely needs something these thirteen cannot say, propose up to two additions in the concept, in this form:

```
TOKEN REQUEST: [name] [glyph] U+XXXXX
MEANS:         [one line]
WHY EXISTING TOKENS CANNOT SAY IT: [one or two sentences]
```

A proposed token must satisfy section 9.5 and must be distinguishable from every token it appears beside by **shape**, not only by colour. Requests that fail either test will be refused, so check both before asking. A concept that needs six new tokens has not been designed against this platform; a concept that needs one is normal.

### 9.4 Block grammars

The old version of this document implied one shape, a stack of rows, and concepts kept contorting themselves into it. There are at least six workable grammars. Pick the one that fits, or combine two.

**A. Attempt ladder.** One row per attempt, in the order the player made them, each row a fixed number of cells. The Wordle grammar. Best when attempts are few and each has an internal structure worth showing.

```
GAME 214 solved in 4
🔻🔻🟩🔻
🟩🔻🔷🔻
🔷🔷🟩🔻
⭐⭐⭐⭐
example.test
```

**B. Sequence ladder.** One row per move or hand played, each row a single token for the quality of that move. Best when the interesting fact is the shape of a run rather than the internals of any one step.

```
GAME 214 Great, streak 12
🔷
🟩
⭐
🟩
🟠
example.test
```

**C. Meter.** One or two rows of bar tokens showing a proportion. Best for a continuum score with no natural steps, and the only grammar that reads at a glance without counting.

```
GAME 214 Good
🟦🟦🟦🟦🟦🟦⬜⬜
example.test
```

**D. Profile.** One row, one cell per element of a fixed set the player worked through, in a fixed order that is not the order they played. Best when a game has a small number of named parts. Check 9.6 carefully: a fixed order leaks more than a play order does.

```
GAME 214 4 of 5
⭐🟩⭐🔻⭐
example.test
```

**E. Board snapshot.** A small rectangle of tokens standing in for a board state, usually the final one, at most seven rows by seven columns and usually much smaller. Best when the spatial shape of a result is the interesting thing. The most dangerous grammar for leaks.

```
GAME 214 Cleared 18 of 25
⬛⬛🟦⬛⬛
⬛🟦🟦🟦⬛
🟦🟦⬛🟦🟦
⬛🟦🟦🟦⬛
example.test
```

**F. Composite.** Rows in one grammar, then a single summary row in another, usually a meter. Best when a game has both a sequence and a total, and worth the extra line only when the two say different things.

```
GAME 214 Great, streak 12
🔷🔷🟩
⭐⭐🟩
🟦🟦🟦🟦⬜
example.test
```

Two rules across all six. A row holds at most eight tokens. Rows within a block may differ in length, and the platform pads them to the widest, so a ragged block is acceptable as long as the natural maximum stays under eight; but a grammar whose rows vary between two cells and eight will read as a mess whatever the padding does.

### 9.5 Glyph rendering

Every glyph must be a **single codepoint that is emoji presentation by default**. No variation selectors, no zero width joiner sequences, no skin tone modifiers, no flags, no keycap digits, and no glyph that some platforms render as text and others as a picture.

This is not fussiness. A codepoint that needs a variation selector to appear as a picture renders as monochrome text on some clients and at a different width on others, which breaks column alignment in exactly the group chat the block was pasted into, and it silently doubles the byte length of every row. Keycap digits are the classic trap: they look fine in a browser and fall apart in three of the eight target clients.

The thirteen tokens above are all vetted. If you propose one under 9.3, say which property makes you confident it qualifies.

### 9.6 The leak test

Run this against your drafted block before you write anything else about the concept. A block leaks if a reader who has not played today can learn anything about the answer from it.

Ask, in order:

1. **Does a cell's position in the block correspond to a position in the puzzle?** If cell three of row one means "the third letter" or "the third column", the block is a partial answer key and a friend who sees three of them has most of the puzzle. Either drop the correspondence or sort each row so position carries no meaning.
2. **Does the block reveal a count that the answer determines?** A row showing two exact matches tells a reader that two of their own candidate answers are wrong in a way they can act on. Counts of the player's own performance are safe. Counts of the answer's properties are not.
3. **Does the ordering of rows leak?** Play order is almost always safe, because it is the player's history. A fixed order, as in grammar D, is a property of the puzzle, so each cell is a fact about a known slot. Grammar D is fine when the slots are not themselves the thing to be discovered, and dangerous when they are.
4. **Does the block's shape leak?** In grammar E, the silhouette of a final board can be the board. Ask whether someone could reconstruct the starting position from the ending one.
5. **Does the title line leak?** A title carrying a tier or a count is normally fine. A title carrying anything derived from the puzzle rather than from the play is not.

State the result of this test in the concept, in one sentence, naming which of the five you had to think about. "Positions are sorted so cell order carries no meaning" is a good answer. "Spoiler free" on its own is not an answer.

### 9.7 The title line and the URL

The title carries the game name, the puzzle number, and a short result, and optionally a streak when it is worth boasting about. Keep the whole line under about fifty characters so it survives a preview.

The result on a title line is normally one of a five step tier ladder, plainspoken rather than triumphant, or a compact count such as "solved in 4" or "18 of 25". The platform supplies the tier names. Do not invent a scale of your own with more than five steps: a player cannot feel the difference between the fourth and fifth step of an eight step ladder, and neither can a reader.

The last line is the platform URL, supplied by the platform, and nothing else goes on it.

### 9.8 What to write in the concept

Every concept includes **a real drafted block, with real glyphs, exactly as it would be pasted into a chat**, for a good day. Not a description of a block. Not a table explaining what the tokens would be. The actual text.

Include a second drafted block for a bad day whenever the two would differ in shape rather than only in tokens, because a grammar that produces a satisfying win and a humiliating loss is a grammar that gets shared only half the time.

Then answer three things in one line each:

- **Grammar.** Which of A to F, or which combination.
- **Leak test.** Which of the five questions in 9.6 you had to think about, and what you did about it.
- **Range.** What the block looks like across the whole outcome space, in particular whether the best and worst days are distinguishable at a glance. A block where every possible day looks broadly the same is a block that says nothing, and it is a mark against the concept even when every rule above is satisfied.

### 9.9 When a concept cannot be encoded

If your result genuinely cannot be expressed in this vocabulary and these grammars, say so explicitly and explain what shape it would need. That is real information and it is occasionally the right answer.

But treat it as a serious mark against the concept rather than a formatting inconvenience. A game whose result cannot be shared spoiler free has no distribution on this platform, and a great game nobody hears about loses to a decent game people paste into a group chat every morning.
