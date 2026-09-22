Hub list card: 4px accent rail, name, one-line rule, and a right-aligned status badge. The preview lists all eleven registry rows with their real one-line rules (`src/shell/registry.ts`), in the registry's order, live games first.

`HubCard({name, rule, badge, finished, planned, href})`. Classes are `hub-card*` from `src/hub/hub.css`. A finished game's badge switches to the accent colour and bold weight; a planned game (`status: "planned"`) drops the whole link to 60% opacity with a `Coming soon` badge and is not offered as playable. Each item sets its own `--accent` from that game's `game-*` token.

**Flag (present in the source):** the finished badge uses the accent as *text*. On the light theme that is under 4.5:1 for hues 128, 148, 108, 188 and 68 (3.2, 3.2, 3.2, 3.6, 2.7:1). The badge is bold and bordered but small, so it should read from `text` in the light theme for those hues; the rail and border are fine at 3:1.
