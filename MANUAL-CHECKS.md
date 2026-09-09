# MANUAL CHECKS

Section 10.7. The things automation will not catch, written as a list to run
rather than as prose to read. Run it before any deploy that changes the share
vocabulary, a share block layout, the chrome, or the board.

Record a run by copying the Results table at the bottom, dating it, and filling
it in. A check with no result recorded has not been run.

## Reporting a failure

Failures found here are handed to GitHub Copilot in VS Code. Open a new chat in
Agent mode, type `/manual-check`, and give it the section, the exact check, the
platform and client, and what you saw against what the check says should happen.
A screenshot helps for anything visual.

`COPILOT.md` covers the setup and what a good report looks like. The rules
Copilot follows while fixing are in `.github/copilot-instructions.md`.

## How to produce the blocks

1. `npm run harness`. It builds the harness and serves the site, then opens
   <http://localhost:4173/harness/>. The page renders a sample block for every
   outcome in `tools/share-harness/cases.ts` plus a width and line count report
   per block. Stop the server with Ctrl C when you are done.

   `/harness/` is a URL on the served site, not a file to open. Every page
   references its assets from the site root, so opening
   `dist/harness/index.html` from disk loads nothing.

   The harness build is a development build and it writes over `dist/`. It
   carries no service worker and its assets are unminified, so run
   `npm run build` again before section 5 or section 5a.
2. For the daily card, finish a game and use the hub's own share control, which
   is the only place that block is assembled.
3. Copy each block from the harness, paste it into the target client, and read
   the result there. Never judge alignment from the harness itself, because it
   renders in a monospace face and the clients do not.

## 1. Glyph rendering, requirement 3.5.3

For every glyph in `src/shared/share-vocabulary.ts`, on each platform below,
confirm that it renders as a glyph rather than as a box, a question mark, or
literal text, and that no variation selector is inserted or dropped.

Platforms: iOS, Android, Windows, macOS.

Clients: Discord, WhatsApp, iMessage, Slack, X, Bluesky.

| Check | Pass condition |
|---|---|
| Every vocabulary glyph appears | No tofu box, no fallback question mark |
| No glyph is converted to text | The client does not render it as an emoji shortcode or an image the player cannot copy |
| No client substitutes its own art in a way that loses the shape difference | Requirement 8.1: the tiers must stay distinguishable without color |
| Copy and paste round trips | Pasting the block back into a plain text field yields the same characters |

## 2. Row alignment, requirement 3.5.4

Both block shapes, in a proportional font client, which is where alignment
actually breaks.

| Check | Pass condition |
|---|---|
| A game block with the widest and narrowest glyphs in the same block | Every row is the same visual width |
| A perfect clear, seven rows | Nothing wraps at the narrowest client width |
| The daily card, five game rows | Rows stay aligned even though a row mixes tier glyphs with the two bar tokens |
| The daily card with one game finished and four not | The unfinished rows do not collapse to a different width |
| Longest possible title line | The title does not wrap in a way that pushes the block down a line |

## 3. Share delivery, requirement 3.5.5

| Platform | Check | Pass condition |
|---|---|---|
| iOS Safari | Web Share sheet opens | Native sheet, block intact including the URL line |
| Android Chrome | Web Share sheet opens | As above |
| Desktop Chrome | Clipboard path | Toast confirms, paste yields the block |
| Desktop Firefox | Clipboard path | As above |
| Any | Sheet dismissed without sharing | Nothing is copied and no success toast appears, engine decision 22 |
| Clipboard denied | Manual copy box appears | Textarea is preselected and readable |

## 4. Smallest viewport, requirement 8.2

360 pixels wide, then repeat the same list at the largest platform text size.

| Surface | Pass condition |
|---|---|
| Hub | Five cards legible, nothing clipped, no horizontal scroll |
| Board | All 35 cards legible, rank and suit both readable |
| Board, mid drag | The selected path is visible under a thumb |
| Help panel | Fits one screen or scrolls inside the dialog, never the page |
| Stats panel | Histogram labels readable, no overflow |
| End screen | Tier, score, share, and countdown all reachable without scrolling the page |
| Archive list | Rows tappable at 44 by 44 pixels |
| About page | Readable, no horizontal scroll |

## 5. Offline, constraint 2.6

| Step | Pass condition |
|---|---|
| Load the hub online, then disconnect and reload | Hub renders from cache |
| Disconnected, open POKER GRID | Today's board plays |
| Disconnected, play to the end | End screen, stats, and share all work |
| Reconnect, reload | No stale asset, no duplicated state |
| First ever visit while offline | An honest unavailable message, never a generated board inside the horizon |

### 5a. After a deploy

Run this against the live origin, not a local preview, within a few minutes of
every deploy. Nothing in CI checks it.

| Step | Pass condition |
|---|---|
| Load the hub at the live origin | Five cards, no console error, no 404 in the network tab |
| Application panel, Service Workers | One worker, status activated, scope is the site root |
| Application panel, Cache Storage | Exactly one `dailykit-` cache, and its build id matches the deployed `sw-manifest.json` |
| Open a game, then reload | Assets served from the service worker, not the network |
| Disconnect and reload | Today's puzzle still plays |
| Reconnect, hard reload | The new build is live and no old cache remains |

## 6. First session, requirement 3.7.3

| Step | Pass condition |
|---|---|
| Clear site data, then load POKER GRID | The practice board opens, help panel over it, notice says nothing counts |
| Finish the practice board | Handoff panel appears, no share button, no tier |
| Continue to today | Today's real board loads and stats still read zero played |
| Reload mid practice board | Today's board loads, the practice board does not repeat |

## Results

| Date | Runner | Sections run | Result | Notes |
|---|---|---|---|---|
| | | | | |
