The primary call-to-action for one game: the suite's existing `dk-button--primary`, given that game's icon and its own `game-*` accent instead of the generic `accent` — same 44px minimum, same shape, same weight, no new button style.

`GameButton(id, {label, onClick})`; `label` defaults to `"Play {NAME}"`. A planned game (not built yet) disables the button and swaps the label to `"Coming soon · {NAME}"`, shown dimmed above — never a live-looking CTA to a game that does not exist, per the suite's own cross-promotion rule (a planned game is never offered as playable).

The label colour is chosen per game so the pair clears 4.5:1: white on the accent for hues 28, 228, 208, 268, 288 and 308; dark `text` in the light theme for hues 128, 148, 108, 188 and 68 (where white is 2.7–3.6:1). Set through `data-on="dark"`; the dark and high-contrast themes need no override.
