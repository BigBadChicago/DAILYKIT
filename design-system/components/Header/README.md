Top bar: icon buttons either side of an uppercase, centered game title, 56px minimum height.

Use `Header({title, fit, left, right})`; each button is `{glyph, label, onClick}` and the label becomes `aria-label`. `fit` picks a measured shrink step for long names: `tight`, `tighter`, or `wrap` (two lines, which is why the header is min-height, not height). The consumer supplies the click handlers.
