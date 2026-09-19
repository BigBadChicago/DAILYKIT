VECTOR grid of numbered clue tiles and arrow cells.

`VectorBoard({rows: cell[][]})`; a cell is `{clue:n}` or `{blank:true, dir 0-3 (up,right,down,left), filled, lit, target}`. A clue is a filled tile with bold numerals; a lit ray is a dot pattern; the target is a dashed outline. Nothing relies on hue alone. Cells are 44px minimum.
