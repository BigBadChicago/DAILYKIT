Scrollable list of past puzzles by number and date, with the tier the puzzle was finished in.

`ArchiveList({items:[{number, date, mark}]})`; `mark` is a suite tier name (`Excellent` … `Rough`, or `Unrated`), or empty for a puzzle not yet played. Each row is a full-width 44px button (`src/shell/main.ts`: `dk-archive__number`, `dk-archive__date`, `dk-archive__mark`); the mark is accent-coloured text, not a check or an icon. An earlier version of this component drew a checkmark: that was not in the source and has been corrected.
