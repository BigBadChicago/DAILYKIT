Full-width status line above the board.

`Notice({text, kind})`; the default (`kind` omitted) is `role=status` for an offline or save notice a screen reader should announce; `kind:'banner'` (update-available, no live region) is silent, since it is not urgent. Both share the same neutral `surface` styling: never colored as a warning.
