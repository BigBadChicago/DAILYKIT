The primary call-to-action for one game: the suite's existing `dk-button--primary`, given that game's icon and its own `game-*` accent instead of the generic `accent` — same 44px minimum, same shape, same weight, no new button style.

`GameButton(id, {label, onClick})`; `label` defaults to `"Play {NAME}"`. A planned game (not built yet) disables the button and swaps the label to `"Coming soon · {NAME}"`, shown dimmed above — never a live-looking CTA to a game that does not exist, per the suite's own cross-promotion rule (a planned game is never offered as playable).
