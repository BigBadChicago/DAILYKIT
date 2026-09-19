Keyboard cursor for a `role=grid` board: arrow keys move a 3px `focus` ring, Enter/Space activates.

`GridCursor({host, rows, cols, onActivate(index)})`; cells are children carrying `data-cell`. The board owns cell geometry; this owns only the ring (`dk-cell--cursor`, drawn inset). The cursor is an outline, never a fill, so it survives forced colors.
