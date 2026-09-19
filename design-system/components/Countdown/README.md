Time to the next puzzle as HH:MM:SS in tabular numerals.

`Countdown({targetAt, now?, label?, onElapsed?})` recomputes from the clock on every tick, so a throttled background tab is never wrong. It aligns ticks to whole seconds and is `aria-live=off`; a per-second live region would flood screen readers. Call `start()`, `stop()`, `refresh()`.
