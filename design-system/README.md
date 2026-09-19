# DailyKit design system

> A copy of the design system extracted from this repo's `src/ui`, `src/hub`, `src/shell` and `src/about` styles, and from each game's own design document where one exists. It also carries forward-looking, **not-yet-shipped** proposals (an icon set, per-game logos/icons/buttons) explicitly assuming `ASSETS.md`'s "no icon set" decision changes; see the "Iconography" and "Game marks" sections below for what is proposed versus what ships today.
>
> Kept live at two Claude-hosted destinations, not here:
> - Artifact: https://claude.ai/artifact/9dfKouMd7YC8xPQkMgiPsm
> - Claude Design project "Design System" (`454767aa-2faa-4d13-bd2b-98ed7a3a85fa`), at https://claude.ai/design
>
> This folder is a point-in-time copy for version control. It omits three files those destinations generate or add automatically and that don't belong in source control: `api/*.md`, `tokens.css` and `manifest.json` (regenerated from `tokens.json`/`components/` on every save) and `fonts/Sans_Reg.ttf` (a placeholder font the Artifact page added on its own; this repo ships no webfonts by design, so it was left out here). To pick up later changes made at either destination, re-copy from there rather than editing this folder as the source of truth.

DailyKit is a static daily game suite: one small puzzle a day, no server, playable offline. This system covers the suite chrome (header, buttons, modals, toasts, hub cards, stats, help, countdown, grid cursor) and three game boards (POKER GRID, VECTOR, CIPHER), shared by every game. The runnable bundle is `window.DailyKit` (vanilla DOM builders, no framework). Extracted from `src/ui/chrome.css` and `src/shell/registry.ts`.

## Content fundamentals
- Game names are UPPERCASE and short: POKER GRID, VECTOR, CIPHER, ROTATE LOCK, DIFFERENCE RELAY.
- Copy is plain and instructional ("Clear five connected cards that form a poker hand"). No exclamation marks, no emoji.
- Help is a headline, numbered steps and one worked example in the mono board font.

## Visual foundations
- **Neutral chrome, one accent.** Grays only; color comes from a single accent hue that each game overrides (`game-*` tokens, hues 40 degrees apart: 148, 28, 268, 308, 68, 108, 188, 228).
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
Each of the eight games gets its own icon, badge-plus-wordmark logo and primary button (`GameIcon`, `GameLogo`, `GameButton`), one motif per game drawn from its own mechanic, colored by that game's own `game-*` token — never a new color, never a picture or mascot. This is the same restraint the suite already applies (identity through accent and board typography only), extended one layer: a face for the accent, not a replacement for it. ROTATE LOCK and DIFFERENCE RELAY carry full fidelity to their own design documents (`ROTATE-LOCK.md`, `DIFFERENCE-RELAY.md`): their real help copy (`HelpPanel`), their real end-of-run tier language (`EndScreen`), and their exact clipboard share text and emoji grammar (`GameShare`, `TierBadge`) — not inferred from the one-line rule alone, the way the other four planned games still are. They remain shown dim/disabled everywhere (`registry.ts` still marks both `status: "planned"`, pending certification), which is a shipping fact this system doesn't override, not a fidelity gap. Like the icon set, these do not exist in the shipped code today (`ASSETS.md` records the suite as having no marks beyond suit pips, arrows and the one suite icon); they are ready if that changes. Three live games (POKER GRID, VECTOR, CIPHER) get a live-looking mark; the five planned games get the same mark shown dim/disabled, matching how the hub already treats a planned card — never hidden, never offered as playable.

## Usage rules
- Text on `bg`/`surface` is `text` or `text-dim`; text on accent fills is `accent-text`.
- One primary button (`accent`) per view.
- Set `data-dk-accent` and `--accent` from the game `game-*` token to theme a game.
