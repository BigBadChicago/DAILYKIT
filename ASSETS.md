# ASSETS

Every asset shipped in a build appears here with its origin and license. An
asset with no row here does not ship.

Admissible origins, per Section 8.6: system provided, self drawn in this repo,
or third party under a license permitting commercial use with the license text
vendored alongside.

| Asset | Path | Origin | License | Notes |
|---|---|---|---|---|
| System UI font stack | ui/chrome.css | System provided | n/a | No webfont ships in version 1, keeping the byte budget clean |
| Card faces | games/poker-grid/render.ts | Self drawn | Repo license | Suit pips drawn as inline SVG paths authored here, not traced from any deck |
| Share glyphs | contract/types.ts palettes | Unicode | n/a | Codepoints are not copyrightable; rendering is the platform's font |
| Suite icon, vector | static/icon.svg | Self drawn | Repo license | Five rounded squares in a quincunx, one per game. Authored here as plain SVG rects |
| Suite icon, raster | static/icon-192.png, static/icon-512.png | Self drawn | Repo license | Rendered from the same geometry as icon.svg. Needed because the web manifest install prompt does not accept SVG on every platform |
| Web app manifest | static/site.webmanifest | Self authored | Repo license | Names, colors, and the icon list. Not an asset with a third party origin, recorded here because it ships |
| Direction arrows | games/vector/render.ts | Self drawn | Repo license | Four arrow glyphs as inline SVG paths authored here, no font and no emoji on the board. Arrow and ray counting puzzles appear in published catalogues under proprietary genre names; no such name appears anywhere in the product or this repository |
| LETTER TRAIL answer list | data/letter-trail/answers.txt | Derived: ENABLE intersected with wordfreq top 30000 | Public domain (ENABLE) and Apache 2.0 (wordfreq) | Build time input only, never served to the browser. ENABLE released to the public domain by Alan Beale; wordfreq is Apache 2.0 by Robyn Speer. The intersection keeps only words that are both dictionary valid and common. A reviewed profanity and slur stop list is subtracted once at curation, below |
| LETTER TRAIL themes | data/letter-trail/themes.json | Self authored | Repo license | Build time input only, never served. Curated groups of related common words, each a subset of the answer list, from which a day's board draws its words. Curation is one time, not daily, so it does not breach the zero daily content cost rule |
| ENABLE dictionary | data/letter-trail/enable.txt | Alan Beale | Public domain | Build time input only, never served. Used by the generator and verifier to enumerate every word present on a board for the difficulty measure and the span uniqueness proof |
| wordfreq | build dependency, package.json devDependencies | Robyn Speer | Apache 2.0 | Build time only Python package that produces the frequency ranked word list the answer list is derived from. Runs in the list preparation step, never in the browser bundle |
| LETTER TRAIL stop list | data/letter-trail/stoplist.txt | Self authored, seeded from a public profanity list | Repo license | Build time input only, never served. Words subtracted from the answer list at curation so no board can contain a slur or profanity. Reviewed by a person |
