POKER GRID 5x7 board of card buttons with suit pips drawn as inline SVG paths.

`PokerGridBoard({cards[35], selected[], onSelect(i)})`; a card is `{rank 2-14, suit 0-3 (clubs, diamonds, hearts, spades)}` or `null` for a cleared cell. Selected cards get a 3px accent border, a lift and a pick-order badge, so selection is shape plus number, not color. Red suits use `hsl(4 72% 42%)`. Set `--accent` to `game-poker-grid`.
