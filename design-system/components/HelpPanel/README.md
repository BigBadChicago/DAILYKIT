How-to-play body: bold headline, numbered steps, one worked example in the mono board font.

`HelpPanel({headline, steps[], example:{lines[], caption}})`. Put it inside a Modal body. Every example must also be available as text lines.

The preview shows three: POKER GRID's shipped copy, and ROTATE LOCK's and DIFFERENCE RELAY's real help text verbatim from their design documents (`ROTATE-LOCK.md` and `DIFFERENCE-RELAY.md`, each `§19`'s contract row: "the headline rule, four [or five] steps, and a worked example... in text"). Step count differs by game (ROTATE LOCK's four match its four rules; DIFFERENCE RELAY's five match its five) — `HelpPanel` never pads or truncates to a fixed count.

The five word and route games added since (WORD LADDER, PANGRAM, FIVE LETTERS) show their `help.ts` verbatim. Step counts are 5, 5 and 4: the panel never pads or truncates to a fixed count. Each example's `lines` are its own text equivalent, so nothing is drawn.
