---
name: Presentation kit
description: Rules for Layer 2, the shared chrome every game renders inside
applyTo: "src/ui/**"
---

Layer 2 is the chrome shared by every game: the DOM helper, modals, toasts, the
countdown, the stats and help panels, the header, theming, accessibility
helpers, and the keyboard grid cursor. The engine owns the chrome and a game
owns only its play area.

## Rules

1. **Never set HTML from a string.** No `innerHTML`, no `insertAdjacentHTML`.
   Every text write goes through `textContent`. This is not a style preference,
   it removes injection as a category from the kit and from every renderer built
   on it.
2. **Layer 2 never imports Layer 3.** When the kit needs the shape of a contract
   type, such as help content or the grid input descriptor, it declares a
   structural mirror. See presentation decision 3 in `ARCHITECTURE.md`.
3. **No storage import.** Theme persists through an injected port, so a storage
   key name never appears in the kit and theme tests need no backend probe.
4. **Panels take view models.** `statsPanel` renders whatever it is handed. It
   does not know about records, archives, or suite aggregates.
5. **Accent applies to a host element, never to `documentElement`.** The hub
   renders five accents at once.
6. **Contrast is a CSS layer, not a fourth theme.** Theme choice is system,
   light, dark. `prefers-contrast: more` and `forced-colors: active` layer over
   whichever is active.
7. **Toasts are `aria-hidden` and announce through the live region.** A toast
   that is its own live region double speaks every rejection.
8. **The grid cursor uses `aria-activedescendant`, not a roving tabindex.** With
   35 cells a roving tabindex narrates 35 focus changes where activedescendant
   narrates one.
9. **Motion is gated.** Anything animated respects `prefers-reduced-motion`
   through the helper in `a11y.ts`.
10. **Touch targets are at least 44 by 44 CSS pixels, and the design starts at
    360 pixels wide.** Check any layout change at that width before reporting it
    done.
11. **Tests here use jsdom**, selected per file by a docblock. Do not switch the
    global environment: Layers 0 and 1 run in Node deliberately.
