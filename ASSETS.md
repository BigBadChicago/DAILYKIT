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
