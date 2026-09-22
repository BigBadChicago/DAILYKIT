The single mark for one game: 24x24 line art in `currentColor`, one motif drawn from that game's own mechanic (a fanned hand for POKER GRID, a ray meeting a target for VECTOR, four code pegs for CIPHER — the full table is below), never a picture or a mascot.

`GameIcon(id)` returns the bare `<svg class="dk-game-icon">`; color it by wrapping element (`--accent` or a `game-*` token), the same convention as the suite `Icon` set. Use it standalone in a favicon-style tile, or inside `GameLogo`'s badge.

| game | hue | motif | why |
| --- | --- | --- | --- |
| POKER GRID | 148 | fanned hand of cards | clears connected five-card hands, not single cards |
| VECTOR | 28 | a ray reaching a target | a ray-counting puzzle |
| CIPHER | 268 | four pegs in a slot | the four-symbol code it asks you to break |
| ROTATE LOCK | 308 | an open lock, rotate arrow at the shackle | rotating route pieces to open a lock |
| DIFFERENCE RELAY | 68 | an uneven zigzag of steps | the marked differences between neighbouring stations |
| TURN TABLE | 108 | a turntable dial and arm | route tiles rotated in place |
| RING BALANCE | 188 | a beam balanced across a ring | spans around a ring weighed against each other |
| ORDER OF OPERATIONS | 228 | three tiles, `+ − +` | signed operators put in sequence |
| WORD LADDER | 128 | a ladder, two rails and three rungs | one rung per changed letter, start at the bottom, goal at the top |
| PANGRAM | 208 | seven keys four over three, the centre filled | the keypad itself, deliberately not a honeycomb (PANGRAM.md 5) |
| FIVE LETTERS | 288 | three tiles: filled, dashed, crossed | the three marks: right, present, absent |

The last three come from their built design documents and renderers, not from a one-line rule alone. They are still `status: "planned"` in the registry, so the mark shows dim wherever the game is not yet offered as playable.
