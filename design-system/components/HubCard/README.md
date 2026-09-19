Hub list card: 4px accent rail, name, one-line rule, and a right-aligned status badge.

Real source classes from `src/hub/hub.css` (`hub-card`, `hub-card__link`, `hub-card__badge`). `HubCard({name, rule, badge, finished, planned, href})`. A finished game's badge switches to the accent color and bold weight; a planned game (not yet built) drops the whole link to 60% opacity, never hidden outright. Each list item sets its own `--accent` from the game's `game-*` token.
