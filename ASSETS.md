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
