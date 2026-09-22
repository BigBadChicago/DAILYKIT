The badge-plus-wordmark lockup for one game: a rounded-square badge in that game's `game-*` accent holding its icon (in `accent-text`), and the uppercase name in the suite's tracked header type — the same shapes the hub card and header already use, just given a face.

`GameLogo(id, size)`; `size` is `"md"` (default, header/hub scale, 32px badge) or `"lg"` (splash/cover scale, 56px badge, larger type). Never recolor the badge except through its own `game-*` token, and never stretch or crop the icon inside it. A planned game (not yet built) uses the same lockup at reduced opacity, shown dim above — it is not hidden, the same rule the hub card follows for a planned link.

The badge icon is white on the accent in most hues, but on hues 128, 148, 108, 188 and 68 white is under 3:1–4.5:1 in the light theme, so the badge marks itself `data-on="dark"` and the light theme draws the icon in `text` instead (a 5:1+ pair). The dark theme and both high-contrast themes are unchanged.
