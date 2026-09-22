# DailyKit design system

> A copy of the design system extracted from this repo's `src/ui`, `src/hub`, `src/shell` and `src/about` styles, and from each game's own design document where one exists. It also carries forward-looking, **not-yet-shipped** proposals (an icon set, per-game logos/icons/buttons) explicitly assuming `ASSETS.md`'s "no icon set" decision changes; see the "Iconography" and "Game marks" sections below for what is proposed versus what ships today.
>
> Kept live at two Claude-hosted destinations, not here:
> - Artifact: https://claude.ai/artifact/9dfKouMd7YC8xPQkMgiPsm
> - Claude Design project "Design System" (`454767aa-2faa-4d13-bd2b-98ed7a3a85fa`), at https://claude.ai/design
>
> This folder is a point-in-time copy for version control. It omits three files those destinations generate or add automatically and that don't belong in source control: `api/*.md`, `tokens.css` and `manifest.json` (regenerated from `tokens.json`/`components/` on every save) and `fonts/Sans_Reg.ttf` (a placeholder font the Artifact page added on its own; this repo ships no webfonts by design, so it was left out here). To pick up later changes made at either destination, re-copy from there rather than editing this folder as the source of truth.
>
> **Downloads:** `python design-system/build-downloads.py` builds `downloads/` (git-ignored, regenerate any time): an offline `catalog.html` of every component in all four themes, `tokens.css`, every icon and logo as SVG, and the zips (see `downloads/README.md`; a browser can also rasterize the logo SVGs to PNG per that README).

DailyKit is a static daily game suite: one small puzzle a day, no server, playable offline. This system covers the suite chrome (header, buttons, modals, toasts, hub cards, stats, help, countdown, grid cursor) and the board of every game built so far (POKER GRID, VECTOR, CIPHER, ROTATE LOCK, DIFFERENCE RELAY, WORD LADDER, PANGRAM, FIVE LETTERS), shared by every game. The runnable bundle is `window.DailyKit` (vanilla DOM builders, no framework). Extracted from `src/ui/chrome.css` and `src/shell/registry.ts`.

## Content fundamentals
- Game names are UPPERCASE and short: POKER GRID, VECTOR, CIPHER, ROTATE LOCK, DIFFERENCE RELAY.
- Copy is plain and instructional ("Clear five connected cards that form a poker hand"). No exclamation marks, no emoji.
- Help is a headline, numbered steps and one worked example in the mono board font.

## Visual foundations
- **Neutral chrome, one accent.** Grays only; color comes from a single accent hue that each game overrides (`game-*` tokens). The first eight hues sit 40 degrees apart (28 to 308); WORD LADDER (128), PANGRAM (208), FIVE LETTERS (288) and the planned LETTER TRAIL (48) sit 20 degrees off that ring, so no live hue moved.
- **Themes:** four — `light`, `dark`, `light-contrast`, `dark-contrast` (the last two mirror the source's `prefers-contrast: more` media layer: deeper text, a heavier line, and a stronger accent; select by `data-theme`, or drive it from the media query as the source code does). Hairlines also double to 2px under contrast, which is not a token (spacing/radius don't vary by theme) — set `--dk-line-width:2px` alongside the contrast theme. `forced-colors: active` maps everything to OS system colors (`Canvas`, `CanvasText`, `Highlight`) and is code-only: those are not fixed values, so they cannot be tokens.
- **Type:** system UI sans for chrome, system monospace for boards. Numbers are tabular. Headers use +0.04em tracking.
- **Shape:** one 10px radius (`radius`), 4px for histogram bars. 1px hairlines in `line`; shadow only on modals.
- **Touch:** every control is at least 44px (`tap`). Focus is a 3px `focus` ring, offset 2px. Safe-area insets pad the edges.
- **Motion:** 160ms ease-out slide/fade; reduced-motion collapses it to 1ms.
- **Never** signal state by color alone: the current histogram bar also gets a border; the grid cursor is an outline.

## Iconography
The shipped code has no icon set by decision, not oversight (`ASSETS.md`): header buttons use single text glyphs with `aria-label`s. This system adds an eight-icon set anyway, ready for if that decision changes — `Icon` component, one glyph replaced for one icon, same label, same 44px button, no layout change. Suit pips and VECTOR arrows are unrelated self-drawn inline SVG board marks, not UI icons, and are untouched. The only brand mark is the suite icon under `assets/Logos/` (five rounded squares in a quincunx).

## Pages
Three page layouts sit on top of the chrome: the **hub** (streak, one card per game with a status badge, today's result, footer), the **game shell** (board, notices, end screen, archive, share copy box, changelog) and a plain **about** page. Each has components below; none introduces its own color.

## Game marks
Each of the eleven games in the registry gets its own icon, badge-plus-wordmark logo and primary button (`GameIcon`, `GameLogo`, `GameButton`), one motif per game drawn from its own mechanic, colored by that game's own `game-*` token — never a new color, never a picture or mascot. This is the same restraint the suite already applies (identity through accent and board typography only), extended one layer: a face for the accent, not a replacement for it. ROTATE LOCK, DIFFERENCE RELAY, WORD LADDER, PANGRAM and FIVE LETTERS carry full fidelity to their own design documents (`ROTATE-LOCK.md`, `DIFFERENCE-RELAY.md`, `WORD-LADDER.md`, `PANGRAM.md`, `FIVE-LETTERS.md`) and built renderers: their real help copy (`HelpPanel`), their real end-of-run tier language (`EndScreen`), and their exact clipboard share text and emoji grammar (`GameShare`, `TierBadge`) — not inferred from the one-line rule alone, the way TURN TABLE, RING BALANCE and ORDER OF OPERATIONS still are (they have no design document yet). All five remain shown dim/disabled everywhere (`registry.ts` still marks each `status: "planned"`, pending certification), which is a shipping fact this system doesn't override, not a fidelity gap. Like the icon set, these do not exist in the shipped code today (`ASSETS.md` records the suite as having no marks beyond suit pips, arrows and the one suite icon); they are ready if that changes. Three live games (POKER GRID, VECTOR, CIPHER) get a live-looking mark; the eight planned games get the same mark shown dim/disabled, matching how the hub already treats a planned card — never hidden, never offered as playable.

## Word games
WORD LADDER (128), PANGRAM (208) and FIVE LETTERS (288) share three habits, all from their design documents: **a custom keyboard with 44px keys** (seven across at 360px), **meaning that is never colour alone** (a ladder marker, an underlined centre key, a dot-and-dash mark grammar), and **a word list that ships in the page or the day's manifest** rather than a server. They are deliberately unlike other daily word games: no honeycomb, no green / yellow / grey. Their boards are `WordLadderBoard`, `PangramBoard` and `FiveLettersBoard`; note the PANGRAM classes are `pan-*` here because the source's `pg-*` collides with POKER GRID's in this single stylesheet.

## Accent contrast audit
White (`accent-text`) on each game accent, measured from the tokens. AA body text needs 4.5:1; large or bold text and graphics need 3:1.

| game | hue | light: white | light: dark text | dark: accent-text | high contrast light / dark |
| --- | --- | --- | --- | --- | --- |
| POKER GRID | 148 | 3.2 | 5.3 | 10.1 | 5.0 / 14.0 |
| VECTOR | 28 | 4.8 | 3.4 | 7.4 | 7.6 / 11.2 |
| CIPHER | 268 | 8.9 | 1.9 | 4.3 | 12.9 / 7.6 |
| ROTATE LOCK | 308 | 6.3 | 2.6 | 5.6 | 9.4 / 8.9 |
| DIFFERENCE RELAY | 68 | 2.7 | 6.1 | 11.6 | 4.4 / 15.7 |
| TURN TABLE | 108 | 3.2 | 5.2 | 10.2 | 5.0 / 14.1 |
| RING BALANCE | 188 | 3.6 | 4.6 | 9.3 | 5.7 / 13.2 |
| ORDER OF OPERATIONS | 228 | 8.9 | 1.9 | 4.5 | 13.1 / 7.8 |
| WORD LADDER | 128 | 3.2 | 5.2 | 9.9 | 5.1 / 13.8 |
| PANGRAM | 208 | 5.7 | 2.9 | 6.5 | 9.0 / 10.2 |
| FIVE LETTERS | 288 | 7.1 | 2.3 | 5.1 | 10.6 / 8.4 |

Five hues fail AA with white in the light theme (148, 68, 108, 188, 128); this is a property of the suite's shared `62% / 40%` accent formula, present in the source for POKER GRID and DIFFERENCE RELAY too, not something these games introduced. The design system flags it in each game token's usage note and handles it in `GameButton` / `GameLogo`; the source-side fix for WORD LADDER's button is in its own stylesheet. The hub's finished-game badge (accent as text) is the same flag.

## Usage rules
- Text on `bg`/`surface` is `text` or `text-dim`; text on accent fills is `accent-text`.
- One primary button (`accent`) per view.
- **Control outlines are `text-dim`, not `line`.** A key, tile or cell edge has to reach 3:1 against the page; `line` is 1.5:1 on white (it is a divider, not an edge), `text-dim` is 6.2:1 light and 6.9:1 dark and follows the contrast and forced-colour layers.
- **Never reference a token that is not defined.** An undefined `var(--x, currentColor)` renders, so it passes every test, but it silently opts out of the theme, the contrast layer and forced colours.
- **Accent fills:** read `accent` and `accent-text`; never compute the accent from the hue at a fixed lightness, and never hard-code `#fff`. Where white on the fill is under 4.5:1 (light theme, hues 128, 148, 108, 188, 68) put dark `text` on it, and let the high-contrast layer return to `accent-text`.
- Set `data-dk-accent` and `--accent` from the game `game-*` token to theme a game.
