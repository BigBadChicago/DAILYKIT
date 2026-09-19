The eight-icon set: 24x24, `currentColor` only, drawn with a 2px round-cap stroke for line art (home, help, archive, theme-light, close) or a plain fill for a solid mark (stats bars, the system/dark theme crescents), never both in one icon and never a second color.

`Icon(name)` returns the `<svg class="dk-icon">`; drop it inside a `dk-iconbutton` in place of the button's text glyph, keeping the same `aria-label` (`ICON_LABEL[name]` has the exact wording). Each replaces one specific text glyph in the source, one for one, same meaning, same button:

| icon | replaces | at |
| --- | --- | --- |
| `home` | `←` | `src/ui/header.ts` hub link |
| `help` | `?` | `src/ui/header.ts` help button |
| `stats` | `≡` | `src/ui/header.ts` stats button |
| `archive` | `◴` | `src/ui/header.ts` archive button |
| `theme-system` | `◐` | `src/ui/header.ts` theme button, system state |
| `theme-light` | `☀` | `src/ui/header.ts` theme button, light state |
| `theme-dark` | `☽` | `src/ui/header.ts` theme button, dark state |
| `close` | `✕` | `src/ui/modal.ts` close button |

This set does not exist in the shipped code today: it assumes the source will start allowing icons (per `ASSETS.md`, header buttons are currently plain text glyphs by decision, not oversight). If that decision changes, these are drop-in, same size (20px inside the 44px `dk-iconbutton`), same buttons, same labels — no layout change. The suit pips and VECTOR arrows are unrelated: those are literal card/board marks drawn at board scale, not UI icons, and stay as they are.
