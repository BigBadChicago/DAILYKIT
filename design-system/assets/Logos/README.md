# Logos

The DailyKit suite icon: five rounded squares in a quincunx (one per game slot) on a `#12161b` ground, squares `#7ee2b8`. Self drawn in the repo, plain SVG rects (see `ASSETS.md` in the source repo).

- `icon.svg` is the master (64x64, rx 14). It fixes its own colors; there is no `currentColor`, so do not recolor it.
- `icon-192.png`, `icon-512.png` are raster renders of the same geometry for the web manifest install prompt.
- Keep clear space of one square (12 units) around it. Never stretch, outline or add a shadow.
