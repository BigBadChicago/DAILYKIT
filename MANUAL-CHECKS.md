# MANUAL CHECKS

The things automation cannot catch. Everything here is done by a person, by
looking. Nothing in this file needs you to have read the architecture.

Run the whole list before a launch, and run the sections that touch what changed
after any change to the share block, the share glyphs, the chrome, or a game
board.

Budget about ninety minutes for a full pass, most of it in section 1.

## What you need

- This repository on your computer, with `npm ci` already run.
- Chrome on the computer. Firefox and Edge for two rows of section 3.
- A phone, iPhone or Android, with WhatsApp and one other chat app on it.
- Whichever of Discord, Slack, X, and Bluesky you can sign in to.
- Somewhere to paste text you can throw away afterwards. A message to yourself,
  a private channel, or a note is fine.

## The vocabulary you are checking

Every result block is built from these seven characters and nothing else. Print
this section or keep it open while you work.

| Name | Character | Shape | Meaning |
|---|---|---|---|
| best | ⭐ | star | top tier result |
| strong | 🔷 | diamond | second tier |
| partial | 🟩 | square | middle tier |
| weak | 🟠 | circle | fourth tier |
| miss | 🔻 | triangle | worst tier, or a failure |
| barFull | 🟦 | square | a filled cell in a meter |
| barEmpty | ⬜ | square | an empty cell, also used to pad short rows |

Two things matter about them. Each of the five tier characters is a different
shape as well as a different color, because color alone is not allowed to carry
meaning. And none of them should ever appear as a hollow box, a question mark, or
as text such as `:star:`.

## Before you start

Open a terminal in the repository folder and run these in order.

```text
npm ci
npm run build
npm run harness
```

- `npm ci` installs dependencies. Skip it if you have run it since your last
  `git pull`.
- `npm run build` produces the real site in `dist`.
- `npm run harness` rebuilds with the test page included, starts a server, and
  opens <http://localhost:4173/harness/> in your browser.

The harness page shows a sample result block for every kind of outcome. Each one
has a name above it, a note saying what it is for, a line saying how many lines
and how wide its rows are, and a copy button. You will be told which names to
use. Leave the page open while you work through sections 1 and 2, and press
Ctrl C in the terminal when you are finished with it.

The names you need are `perfect-clear`, `poor-result`, `ragged-bar-block`, and
`max-rows`.

**Important.** `npm run harness` writes a test build over `dist`. Before you
reach section 5, run `npm run build` again so you are testing the real thing.

## Section 1. Do the characters survive the trip

**Why.** The result block is the only thing that travels. If a character turns
into a hollow box on someone's phone, the block is broken for everyone they
sent it to.

**What to do.** For each app in the table below, one at a time:

1. On the harness page, press the copy button on **`max-rows`**. It uses all
   five tier characters, which is the widest spread of shapes in one block.
2. Paste it into that app and send it to yourself.
3. Look at what arrived, on the platform in the table. Do not judge from the
   composer box, judge from the sent message.
4. Copy the sent message back out and paste it into a plain text box. It should
   come back as the same characters.

**What passes.**

| Check | Pass |
|---|---|
| Every character is drawn | No hollow box, no question mark, no blank |
| Nothing became text | You never see `:star:`, `:blue_square:`, or similar |
| Shapes stay different | Star, diamond, square, circle, triangle are all still telling apart, even squinting |
| Copy round trips | Pasting the sent message back gives the same characters |

**Where to check.**

| Platform | Apps |
|---|---|
| iPhone | WhatsApp, iMessage, and one of Discord or Slack |
| Android | WhatsApp, and one of Discord or Slack |
| Windows | Slack or Discord in the browser, plus X and Bluesky |
| Mac, if you have one | iMessage |

You do not need every combination. One pass per platform, plus X and Bluesky
once each, is the bar.

## Section 2. Do the rows line up

**Why.** The block is meant to read as a neat rectangle. Chat apps that use a
proportional font can make one row wider than another, and a ragged block looks
broken rather than deliberate.

**What to do.** Still on the harness page, and still pasting into a real chat
app rather than judging on the harness itself.

1. Paste **`perfect-clear`**, seven rows. Look down the right hand edge.
2. Paste **`poor-result`**, three rows.
3. Paste **`ragged-bar-block`**. Its rows are deliberately different lengths
   before the site pads them, so it is the one most likely to come out ragged.
4. Paste **`max-rows`**, eight rows, the tallest block the site can produce.
5. Repeat all four in a narrow window, for example your phone held upright, and
   in Slack or Discord on the computer.

Then check the real daily card, which the harness cannot produce. Finish a game
first, following section 3 step 2, then go back to the front page and use the
share button under **Today's card**. Paste that into the same chat app.

**What passes.**

| Check | Pass |
|---|---|
| Right hand edge | Every row ends at the same place |
| Narrow window | No row wraps onto a second line |
| Ragged block | Rows stay aligned even where one row mixes tier and meter characters |
| Real daily card | With one game finished and the others not, every row is the same width |
| Long title | The first line does not wrap |

## Section 3. Does sharing actually work

**Why.** If the share button fails, the player has nothing to send, and the
block is the whole distribution mechanism.

**What to do.** This one uses the real site, not the harness.

1. In the terminal, Ctrl C the harness server, then run `npm run build` and
   `npm run preview`.
2. Open <http://localhost:4173/> and play a game to the end. POKER GRID takes a
   couple of minutes. CIPHER is faster.
3. On the result screen, press Share.

**What passes.**

| Where | What should happen |
|---|---|
| iPhone or Android | The phone's own share sheet opens with the block in it |
| Chrome on the computer | A message says it was copied, and pasting gives the block |
| Firefox on the computer | The same |
| Edge on the computer | The same |
| Share sheet dismissed on a phone | Nothing is copied and no success message appears |

To reach the site from your phone while it is served from your computer, both
have to be on the same network, and you open your computer's local address
rather than localhost. `npm run preview -- --host` prints the address to use.

If the copy fails for any reason, a box should appear with the text in it, ready
to select. That is the fallback and it is worth seeing once on purpose.

## Section 4. Does it fit a small phone

**Why.** The site is designed for a 360 pixel wide screen first, which is a
common cheap Android. If it works there it works everywhere.

**What to do.** In Chrome on the computer, with the site open from
`npm run preview`:

1. Press F12 to open developer tools.
2. Press Ctrl Shift M to turn on the device toolbar.
3. In the size boxes at the top, type 360 wide by 780 tall.
4. Walk through every screen in the table.
5. Then repeat the walk with the browser text size set larger, under Settings,
   Appearance, Font size, Large.

**What passes.**

| Screen | Pass |
|---|---|
| Hub, the front page | All game cards readable, nothing cut off, no sideways scrolling |
| A game board | Every card or symbol readable |
| A board mid drag | You can see the selection under where your thumb would be |
| How to play panel | Fits, or scrolls inside its own box rather than moving the page |
| Statistics panel | Labels readable, nothing overflowing |
| Result screen | Tier, score, share button, and countdown all reachable without scrolling the page |
| Archive list | Rows big enough to tap |
| About page | Readable, no sideways scrolling |

## Section 5. Does it work with no connection

**Why.** A player who loaded the site yesterday should still get today's puzzle
on a train.

**What to do.** Run `npm run build` first if you have not since the harness.
Then `npm run preview` and open <http://localhost:4173/>.

1. Load the hub, then open a game and let the board appear.
2. Wait about ten seconds, so the site can store the next few days.
3. Press F12, go to the **Application** tab, then **Service Workers** in the
   left list. Tick **Offline**.
4. Reload the page.

**What passes.**

| Step | Pass |
|---|---|
| Hub reloaded while offline | The five cards appear as usual |
| Game reloaded while offline | Today's board appears and is playable |
| Play to the end while offline | Result screen, statistics, and share all work |
| Untick Offline and reload | Everything still normal, nothing duplicated |
| A brand new visitor with no connection | A plain message saying today's puzzle is unavailable, never a board |

For that last row, tick Offline, then in the same Application tab choose
**Storage** in the left list and press **Clear site data**, then reload. That
makes the browser a first time visitor. Remember it also wipes your streak on
this machine, so do it last.

## Section 5a. After a deploy

Run this against the real site, not a local preview, within a few minutes of
every deploy. Nothing in the automated checks covers it.

| Step | Pass |
|---|---|
| Load the hub at the live address | Five cards, nothing red in the console, no failed requests |
| Application tab, Service Workers | One worker, status says activated, scope is the site root |
| Application tab, Cache Storage | Exactly one cache whose name starts `dailykit-`, and its last part matches the one in `/sw-manifest.json` |
| Open a game, then reload | The page loads from the worker rather than the network |
| Turn off wifi and reload | Today's puzzle still plays |
| Turn wifi back on, hard reload with Ctrl Shift R | The new version is live and only one `dailykit-` cache remains |

## Section 6. The first time experience

**Why.** A new player meets a practice board before their first real puzzle, and
that path touches storage, the help panel, and the handoff to today.

**What to do.** In Chrome, with the site open:

1. F12, Application tab, Storage, **Clear site data**. You are now a new player.
2. Open POKER GRID.

**What passes.**

| Step | Pass |
|---|---|
| The game opens | A practice board, the how to play panel over it, and a line saying nothing here counts |
| Finish the practice board | A panel saying it did not count, with no share button and no grade |
| Continue to today | Today's real board loads |
| Open statistics | Games played still reads zero |
| Reload halfway through a practice board | Today's board loads, not the practice board again |

## If something fails

Open a new chat in VS Code, Agent mode, and type `/manual-check` followed by
what happened. Include three things:

1. The section number and which row failed.
2. The platform and the app, for example iPhone 18 in WhatsApp.
3. What you saw against what this file says should happen.

Attach a screenshot for anything visual. `COPILOT.md` has more on this.

Do not fix it yourself in the middle of a run. Note it, keep going, and hand the
whole list over at the end. A second failure often explains the first.

## Results

Copy this row and fill it in each time you run the list. A section with no row
here has not been run.

| Date | Who | Sections | Result | Notes |
|---|---|---|---|---|
| | | | | |
