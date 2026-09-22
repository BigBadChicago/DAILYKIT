/* @ds-bundle: {"format":4,"namespace":"DailyKit","components":[{"name":"Header"},{"name":"Countdown"},{"name":"HelpPanel"},{"name":"GridCursor"},{"name":"PokerGridBoard"},{"name":"VectorBoard"},{"name":"CipherBoard"},{"name":"RotateLockBoard"},{"name":"DifferenceRelayBoard"},{"name":"HubCard"},{"name":"HubStreak"},{"name":"HubDailyCard"},{"name":"HubFooter"},{"name":"Notice"},{"name":"EndScreen"},{"name":"CrossPromo"},{"name":"ArchiveList"},{"name":"CopyBox"},{"name":"ChangelogList"},{"name":"AboutPage"},{"name":"Icon"},{"name":"GameLogo"},{"name":"GameIcon"},{"name":"GameButton"},{"name":"TierBadge"},{"name":"WordLadderBoard"},{"name":"PangramBoard"},{"name":"FiveLettersBoard"}]} */
/* DailyKit bundle: framework-free DOM builders ported from src/ui and src/games/*\/render.ts. */
(function () {
  "use strict";

  function el(tag, opts, children) {
    var n = document.createElement(tag);
    opts = opts || {};
    if (opts["class"]) n.className = opts["class"];
    if (opts.text != null) n.textContent = opts.text;
    if (opts.attrs) for (var k in opts.attrs) if (opts.attrs[k] != null) n.setAttribute(k, opts.attrs[k]);
    (children || []).forEach(function (c) { if (c) n.appendChild(c); });
    return n;
  }
  var SVGNS = "http://www.w3.org/2000/svg";
  function svgPath(d, rotate) {
    var s = document.createElementNS(SVGNS, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("aria-hidden", "true");
    var p = document.createElementNS(SVGNS, "path");
    p.setAttribute("d", d);
    if (rotate) p.setAttribute("transform", "rotate(" + rotate + " 12 12)");
    s.appendChild(p);
    return s;
  }

  /* Icon set. Assumes the repo permits icons: each replaces the exact text glyph
     at the cited src/ui location, same aria-label, same 44px iconbutton. 24x24,
     currentColor only; a shape is drawn with stroke (line art) or fill (a solid
     mark like the stat bars or the moon), never both, never a second color. */
  var ICON_SVG = {
    home: '<path d="M4 11 12 4 20 11" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M6 10V19H18V10" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>',
    help: '<circle cx="12" cy="12" r="9" fill="none" stroke="currentColor" stroke-width="2"/><path d="M9.3 9.6c0-1.6 1.2-2.85 2.7-2.85s2.7 1.1 2.7 2.5c0 1.3-.85 1.95-1.75 2.6-.75.55-1.25 1.05-1.25 2.05" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><circle cx="12" cy="17.6" r="0.9" fill="currentColor" stroke="none"/>',
    stats: '<rect x="4.5" y="13" width="4" height="7" fill="currentColor"/><rect x="10" y="9" width="4" height="11" fill="currentColor"/><rect x="15.5" y="4.5" width="4" height="15.5" fill="currentColor"/>',
    archive: '<rect x="4" y="6" width="16" height="14" rx="2" fill="none" stroke="currentColor" stroke-width="2"/><path d="M4 10.5H20" fill="none" stroke="currentColor" stroke-width="2"/><path d="M8 3.5V7.5M16 3.5V7.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    "theme-system": '<circle cx="12" cy="12" r="8" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 4A8 8 0 0 0 12 20Z" fill="currentColor" stroke="none"/>',
    "theme-light": '<circle cx="12" cy="12" r="4.5" fill="none" stroke="currentColor" stroke-width="2"/><path d="M12 2.5V5.5M12 18.5V21.5M2.5 12H5.5M18.5 12H21.5M5 5L7.1 7.1M16.9 16.9L19 19M19 5L16.9 7.1M7.1 16.9L5 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>',
    "theme-dark": '<path d="M20 14.5A8.5 8.5 0 1 1 9.5 4a7 7 0 0 0 10.5 10.5Z" fill="currentColor" stroke="none"/>',
    close: '<path d="M5 5L19 19M19 5L5 19" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/>'
  };
  var ICON_LABEL = { home: "All games", help: "How to play", stats: "Statistics", archive: "Archive",
    "theme-system": "Theme, following system", "theme-light": "Theme, light", "theme-dark": "Theme, dark", close: "Close" };
  function Icon(name) {
    var s = document.createElementNS(SVGNS, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("class", "dk-icon");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = ICON_SVG[name] || "";
    return s;
  }

  /* Header: { title, left: [{label, glyph, onClick}], right: [...] } */
  function Header(o) {
    function btn(b) {
      var x = el("button", { "class": "dk-iconbutton", text: b.icon ? null : b.glyph, attrs: { "aria-label": b.label, type: "button" } });
      if (b.icon) x.appendChild(Icon(b.icon));
      if (b.onClick) x.addEventListener("click", b.onClick);
      return x;
    }
    var title = el("h1", { "class": "dk-header__title", text: o.title });
    if (o.fit) title.setAttribute("data-fit", o.fit); /* tight | tighter | wrap */
    var kids = (o.left || []).map(btn).concat([title], (o.right || []).map(btn));
    return el("header", { "class": "dk-header" }, kids);
  }

  /* Countdown: recomputes from the clock on every tick. */
  function formatDuration(ms) {
    var t = Math.max(0, Math.floor(ms / 1000)), p = function (n) { return n < 10 ? "0" + n : "" + n; };
    return p(Math.floor(t / 3600)) + ":" + p(Math.floor((t % 3600) / 60)) + ":" + p(t % 60);
  }
  function Countdown(o) {
    var now = o.now || Date.now, timer = 0, running = false;
    var value = el("span", { "class": "dk-countdown__value", text: "00:00:00" });
    var element = el("div", { "class": "dk-countdown", attrs: { "aria-live": "off" } },
      [el("span", { "class": "dk-countdown__label", text: o.label || "Next puzzle" }), value]);
    function tick() {
      var r = o.targetAt() - now();
      value.textContent = formatDuration(r);
      if (r <= 0) { running = false; if (o.onElapsed) o.onElapsed(); return; }
      if (running) timer = setTimeout(tick, Math.min(r % 1000 || 1000, 1000));
    }
    return {
      element: element,
      start: function () { running = true; clearTimeout(timer); tick(); },
      stop: function () { running = false; clearTimeout(timer); },
      refresh: tick
    };
  }

  /* HelpPanel: { headline, steps[], example: {lines[], caption} } */
  function HelpPanel(c) {
    var body = el("div", { "class": "dk-help__example-body" },
      c.example.lines.map(function (l) { return el("p", { "class": "dk-help__line", text: l }); }));
    return el("div", { "class": "dk-help" }, [
      el("p", { "class": "dk-help__headline", text: c.headline }),
      el("ol", { "class": "dk-help__steps" }, c.steps.map(function (s) { return el("li", { text: s }); })),
      el("figure", { "class": "dk-help__example" }, [body, el("figcaption", { "class": "dk-help__caption", text: c.example.caption })])
    ]);
  }

  /* GridCursor: arrow keys move a visible cursor ring across a role=grid element. */
  function GridCursor(o) {
    var host = o.host, rows = o.rows, cols = o.cols, r = 0, c = 0;
    function cells() { return host.querySelectorAll("[data-cell]"); }
    function paint() {
      var list = cells();
      for (var i = 0; i < list.length; i++) list[i].classList.toggle("dk-cell--cursor", i === r * cols + c);
    }
    host.setAttribute("role", "grid");
    host.setAttribute("tabindex", "0");
    host.addEventListener("keydown", function (e) {
      var m = { ArrowUp: [-1, 0], ArrowDown: [1, 0], ArrowLeft: [0, -1], ArrowRight: [0, 1] }[e.key];
      if (m) {
        r = Math.min(rows - 1, Math.max(0, r + m[0])); c = Math.min(cols - 1, Math.max(0, c + m[1]));
        paint(); e.preventDefault();
      } else if ((e.key === "Enter" || e.key === " ") && o.onActivate) {
        o.onActivate(r * cols + c); e.preventDefault();
      }
    });
    host.addEventListener("focus", paint);
    host.addEventListener("blur", function () { cells().forEach && cells().forEach(function (x) { x.classList.remove("dk-cell--cursor"); }); });
    return { move: function (nr, nc) { r = nr; c = nc; paint(); }, get: function () { return [r, c]; } };
  }

  /* POKER GRID */
  var SUITS = ["clubs", "diamonds", "hearts", "spades"], GLYPH = ["♣", "♦", "♥", "♠"];
  var RANKS = { 11: "J", 12: "Q", 13: "K", 14: "A" };
  var SUIT_D = [
    "M12 2 C8 7 4 9 4 13 C4 16 6 18 9 18 C7 21 8 23 12 23 C16 23 17 21 15 18 C18 18 20 16 20 13 C20 9 16 7 12 2 Z",
    "M12 2 L21 12 L12 22 L3 12 Z",
    "M12 22 C10 19 4 16 4 10 C4 6 9 6 12 10 C15 6 20 6 20 10 C20 16 14 19 12 22 Z",
    "M12 2 C9 7 4 10 4 14 C4 17 7 19 10 18 L8 22 L16 22 L14 18 C17 19 20 17 20 14 C20 10 15 7 12 2 Z"
  ];
  /* PokerGridBoard: { cards: 35 x ({rank 2-14, suit 0-3} | null), selected: [cellIndex in pick order], onSelect } */
  function PokerGridBoard(o) {
    var kids = o.cards.map(function (cd, i) {
      if (!cd) return el("div", { "class": "pg-card pg-card--empty", attrs: { "data-cell": i, "aria-hidden": "true" } });
      var pos = (o.selected || []).indexOf(i);
      var b = el("button", { "class": "pg-card" + (pos >= 0 ? " pg-card--selected" : ""), attrs: { type: "button", "data-cell": i, "aria-pressed": pos >= 0 ? "true" : "false" } }, [
        el("span", { "class": "pg-card__rank", text: RANKS[cd.rank] || String(cd.rank) }),
        el("span", { "class": "pg-card__suit pg-card__suit--" + SUITS[cd.suit] }, [svgPath(SUIT_D[cd.suit]), el("span", { "class": "dk-visually-hidden", text: GLYPH[cd.suit] })]),
        pos >= 0 ? el("span", { "class": "pg-card__order", text: String(pos + 1) }) : null
      ]);
      if (o.onSelect) b.addEventListener("click", function () { o.onSelect(i); });
      return b;
    });
    return el("div", { "class": "pg-game" }, [el("div", { "class": "pg-board", attrs: { role: "grid", "aria-label": "Poker grid board" } }, kids)]);
  }

  /* VECTOR: cell = {clue: n} | {blank: true, dir: 0-3 (up,right,down,left), filled?, lit?, target?} */
  var ARROW = "M12 3 L20 13 H14 V21 H10 V13 H4 Z";
  function VectorBoard(o) {
    var rows = o.rows.map(function (row) {
      return el("div", { "class": "vec-row", attrs: { style: "--vec-cols:" + row.length } }, row.map(function (c) {
        if (c.clue != null) return el("div", { "class": "vec-cell vec-cell--clue", text: String(c.clue) });
        var cls = "vec-cell vec-cell--blank" + (c.filled ? " vec-cell--filled" : "") + (c.lit ? " vec-cell--lit" : "") + (c.target ? " vec-cell--target" : "");
        var kid = c.dir != null ? svgPath(ARROW, c.dir * 90) : null;
        if (kid) kid.setAttribute("class", "vec-arrow");
        return el("button", { "class": cls, attrs: { type: "button" } }, [kid]);
      }));
    });
    return el("div", { "class": "vec-game", attrs: { style: "--accent-hue:" + (o.hue || 28) } }, [el("div", { "class": "vec-board" }, rows)]);
  }

  /* CIPHER: { history: [{code: [n x4], feedback}], slots: [n|null x4], palette: [n...] } */
  function CipherBoard(o) {
    function slot(v, key) {
      return el(key ? "button" : "div", { "class": key ? "cipher-key" : "cipher-slot", text: v == null ? "" : String(v), attrs: v == null && !key ? { "data-empty": "true" } : {} });
    }
    var hist = el("ol", { "class": "cipher-history" }, o.history.map(function (h) {
      return el("li", { "class": "cipher-row" }, h.code.map(function (v) { return slot(v); }).concat([el("span", { "class": "cipher-feedback", text: h.feedback })]));
    }));
    return el("div", { "class": "cipher" }, [
      hist,
      el("div", { "class": "cipher-slots" }, o.slots.map(function (v) { return slot(v); })),
      el("div", { "class": "cipher-palette" }, o.palette.map(function (v) { return slot(v, true); }))
    ]);
  }

  /* ROTATE LOCK: { cells: 36 x {glyph, kind}, tray: [{length, dir 0-3, selected}], status, moves } */
  var DIRS = ["^", ">", "v", "<"];
  function RotateLockBoard(o) {
    var cells = o.cells.map(function (c) {
      return el("div", { "class": "rl-cell", text: c.glyph || "", attrs: { "data-kind": c.kind || "empty", "aria-hidden": "true" } });
    });
    var tray = o.tray.map(function (p) {
      return el("button", { "class": "rl-piece", text: DIRS[p.dir].repeat(p.length), attrs: { type: "button", "aria-pressed": p.selected ? "true" : "false" } });
    });
    return el("div", { "class": "rl-game" }, [
      el("p", { "class": "rl-status", text: o.status || "" }),
      el("div", { "class": "rl-board", attrs: { role: "img", "aria-label": o.description || "Rotate Lock board" } }, cells),
      el("p", { "class": "rl-moves", text: o.moves || "" }),
      el("div", { "class": "rl-tray", attrs: { role: "group", "aria-label": "Tray, in route order" } }, tray),
      el("button", { "class": "rl-rotate", text: "Rotate", attrs: { type: "button" } })
    ]);
  }

  /* DIFFERENCE RELAY: { order: [6 numbers], marks: [5 numbers|null], selected: slot|null, runs: [depth], status } */
  function DifferenceRelayBoard(o) {
    var row = el("div", { "class": "dr-row", attrs: { role: "group", "aria-label": "Six stations and five gaps" } });
    o.order.forEach(function (v, i) {
      row.appendChild(el("button", { "class": "dr-station", text: String(v), attrs: { type: "button", "aria-pressed": o.selected === i ? "true" : "false" } }));
      if (i < o.marks.length) {
        var m = o.marks[i];
        row.appendChild(el("span", { "class": "dr-gap", text: m == null ? "?" : String(m), attrs: { "data-hidden": m == null ? "true" : "false", "aria-hidden": "true" } }));
      }
    });
    var ladder = (o.runs || []).map(function (d) { return "▮".repeat(d) + "▯".repeat(o.marks.length - d); }).join("\n");
    return el("div", { "class": "dr-game" }, [
      el("p", { "class": "dr-status", text: o.status || "" }),
      row,
      el("p", { "class": "dr-runs", text: o.runsLabel || "" }),
      el("div", { "class": "dr-ladder", text: ladder, attrs: { "aria-hidden": "true" } }),
      el("button", { "class": "dr-run", text: "Run relay", attrs: { type: "button" } })
    ]);
  }

  /* HUB: real suite hub-card, with a badge and finished/planned states. */
  function HubCard(o) {
    var a = el("a", { "class": "hub-card__link" + (o.planned ? " hub-card__link--planned" : ""), attrs: { href: o.href || "#" } }, [
      el("div", { "class": "hub-card__body" }, [
        el("span", { "class": "hub-card__name", text: o.name }),
        el("span", { "class": "hub-card__rule", text: o.rule || "" })
      ]),
      o.badge ? el("span", { "class": "hub-card__badge", text: o.badge }) : null
    ]);
    return el("li", { "class": "hub-card" + (o.finished ? " hub-card--finished" : "") }, [a]);
  }
  function HubStreak(o) {
    return el("p", { "class": "hub-streak" + (o.value ? "" : " hub-streak--none") },
      [el("span", { "class": "hub-streak__value", text: String(o.value || 0) }), document.createTextNode(" day streak")]);
  }
  function HubDailyCard(o) {
    return el("div", { "class": "hub-dailycard" }, [
      el("p", { "class": "hub-dailycard__title", text: o.title }),
      el("pre", { "class": "hub-dailycard__block", text: o.block })
    ]);
  }
  function HubFooter(o) {
    var link = el("a", { "class": "hub-footer__link", text: o.linkText || "About", attrs: { href: o.href || "#" } });
    return el("div", { "class": "hub-footer" }, [el("p", { "class": "hub-footer__note", text: o.note || "" }), link]);
  }

  /* SHELL: game-page chrome around a board. */
  function Notice(o) {
    return el("p", { "class": (o.kind === "banner" ? "dk-banner" : "dk-notice"), text: o.text || "", attrs: o.kind === "banner" ? {} : { role: "status" } });
  }
  function EndScreen(o) {
    return el("div", {}, [
      el("p", { "class": "dk-end__tier", text: o.tier }),
      el("p", { "class": "dk-end__detail", text: o.detail }),
      o.score != null ? el("p", { "class": "dk-end__score", text: "Score " + o.score.toLocaleString() }) : null
    ]);
  }
  function CrossPromo(o) {
    var a = el("a", { "class": "dk-crosspromo__link", text: o.text, attrs: { href: o.href || "#" } });
    return el("p", { "class": "dk-crosspromo" }, [a]);
  }
  function ArchiveList(o) {
    var items = o.items.map(function (it) {
      return el("button", { "class": "dk-archive__item", attrs: { type: "button" } }, [
        el("span", { "class": "dk-archive__number", text: "#" + it.number }),
        el("span", { "class": "dk-archive__date", text: it.date }),
        it.mark ? el("span", { "class": "dk-archive__mark", text: it.mark }) : null
      ]);
    });
    return el("ul", { "class": "dk-archive" }, items.map(function (b) { return el("li", {}, [b]); }));
  }
  function CopyBox(o) {
    var t = el("textarea", { "class": "dk-copybox", attrs: { readonly: "readonly", rows: o.rows || 4 } });
    t.value = o.text || "";
    return t;
  }
  function ChangelogList(o) {
    var kids = [el("p", { "class": "dk-changelog__date", text: o.date })].concat(
      [el("ul", { "class": "dk-changelog" }, (o.items || []).map(function (s) { return el("li", { text: s }); }))]);
    return el("div", {}, kids);
  }

  /* ABOUT: static page shell. */
  function AboutPage(o) {
    var body = [el("a", { "class": "about-page__back", text: "← Back", attrs: { href: o.backHref || "#" } }), el("h1", { text: o.title })];
    (o.sections || []).forEach(function (s) {
      body.push(el("h2", { text: s.heading }));
      body.push(el("p", { text: s.text }));
    });
    body.push(el("p", { "class": "about-page__foot", text: o.foot || "" }));
    return el("div", { "class": "about-page" }, body);
  }

  /* Per-game marks. Same restraint as the suite (no gradients, no shadows,
     currentColor line art at 2px round-cap, or a plain fill for a solid dot),
     differentiated only by accent hue and a one-shape motif drawn from each
     game's own mechanic (ARCHITECTURE2.md / the registry's oneLineRule). */
  var GAMES = [
    { id: "poker-grid", on: "dark", name: "POKER GRID", token: "game-poker-grid", live: true,
      rule: "Clear the board with connected five card poker hands.",
      motif: "A fanned hand of three cards — POKER GRID clears hands, not single cards.",
      icon: '<g fill="none" stroke="currentColor" stroke-width="1.8" stroke-linejoin="round"><rect x="3.3" y="8.4" width="8.6" height="12.4" rx="1.6" transform="rotate(-14 7.6 14.6)"/><rect x="7.7" y="5.8" width="8.6" height="12.4" rx="1.6"/><rect x="12.1" y="8.4" width="8.6" height="12.4" rx="1.6" transform="rotate(14 16.4 14.6)"/></g>' },
    { id: "vector", name: "VECTOR", token: "game-vector", live: true,
      rule: "Point every arrow so each numbered cell is the first one that exactly that many arrows reach.",
      motif: "One bold ray reaching a target — VECTOR is a ray-counting puzzle.",
      icon: '<path d="M4.5 19.5 15 9" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M9.5 9H15V14.5" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><circle cx="19" cy="5" r="2.2" fill="currentColor"/>' },
    { id: "cipher", name: "CIPHER", token: "game-cipher", live: true,
      rule: "Break a four symbol code in six guesses from exact and misplaced counts.",
      motif: "Four pegs in a slot — the four-symbol code CIPHER asks you to break.",
      icon: '<rect x="2.5" y="8.5" width="19" height="7" rx="3.5" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="6.6" cy="12" r="1.5" fill="currentColor"/><circle cx="10.9" cy="12" r="1.5" fill="currentColor"/><circle cx="15.2" cy="12" r="1.5" fill="currentColor"/><circle cx="19.5" cy="12" r="1.5" fill="none" stroke="currentColor" stroke-width="1.6"/>' },
    { id: "rotate-lock", name: "ROTATE LOCK", token: "game-rotate-lock", live: false,
      rule: "Order and rotate the route pieces so the path takes every marked turn and ends at the lock.",
      motif: "An open lock with a rotate arrow at its shackle — rotating pieces to open the lock.",
      icon: '<rect x="6" y="11" width="12" height="9" rx="2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M9 11V8A3 3 0 0 1 15 8" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><path d="M15.5 4.6A4 4 0 0 1 18.3 7.4" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round"/><path d="M18.6 5.2 18.3 7.4 16.2 6.6" fill="none" stroke="currentColor" stroke-width="1.6" stroke-linecap="round" stroke-linejoin="round"/>' },
    { id: "difference-relay", on: "dark", name: "DIFFERENCE RELAY", token: "game-difference-relay", live: false,
      rule: "Order the numbers so every neighbouring pair differs by the amount marked between them.",
      motif: "A zigzag of uneven steps — the marked differences between neighbouring stations.",
      icon: '<path d="M3.5 17 8.5 8.5 13 14.5 18 6.5 20.5 10" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round" stroke-linejoin="round"/><circle cx="3.5" cy="17" r="1.5" fill="currentColor"/><circle cx="8.5" cy="8.5" r="1.5" fill="currentColor"/><circle cx="13" cy="14.5" r="1.5" fill="currentColor"/><circle cx="18" cy="6.5" r="1.5" fill="currentColor"/>' },
    { id: "turn-table", on: "dark", name: "TURN TABLE", token: "game-turn-table", live: false,
      rule: "Rotate the route tiles until one path runs through every checkpoint.",
      motif: "A turntable dial with its arm — tiles rotated in place until the route lines up.",
      icon: '<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.8"/><circle cx="12" cy="12" r="2" fill="currentColor"/><path d="M12 12 18.5 6.2" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
    { id: "ring-balance", on: "dark", name: "RING BALANCE", token: "game-ring-balance", live: false,
      rule: "Place the numbers around the ring so every marked span sums to its target.",
      motif: "A beam balanced across a ring — spans around the ring weighed against each other.",
      icon: '<circle cx="12" cy="12" r="8.2" fill="none" stroke="currentColor" stroke-width="1.8"/><path d="M5.8 13.4 18.2 10.6" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/><circle cx="5.8" cy="13.4" r="1.5" fill="currentColor"/><circle cx="18.2" cy="10.6" r="1.5" fill="currentColor"/><path d="M12 12 12 9" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round"/>' },
    { id: "order-of-operations", name: "ORDER OF OPERATIONS", token: "game-order-of-operations", live: false,
      rule: "Order the signed operators so the running total hits every checkpoint.",
      motif: "Three ordered tiles, plus, minus, plus — the signed operators put in sequence.",
      icon: '<g fill="none" stroke="currentColor" stroke-width="1.7"><rect x="2.5" y="9" width="6.2" height="6.2" rx="1.4"/><rect x="8.9" y="9" width="6.2" height="6.2" rx="1.4"/><rect x="15.3" y="9" width="6.2" height="6.2" rx="1.4"/></g><g stroke="currentColor" stroke-width="1.7" stroke-linecap="round"><path d="M5.6 10.6V13.6M4.1 12.1H7.1"/><path d="M10.9 12.1H13.9"/><path d="M18.4 10.6V13.6M16.9 12.1H19.9"/></g>' },
    { id: "word-ladder", on: "dark", name: "WORD LADDER", token: "game-word-ladder", live: false,
      rule: "Change one letter at a time to climb from the start word to the goal word in as few steps as you can.",
      motif: "A ladder \u2014 one rung per changed letter, start word at the bottom, goal at the top.",
      icon: '<path d="M7 3V21M17 3V21" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/><path d="M7 7.5H17M7 12H17M7 16.5H17" fill="none" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>' },
    { id: "pangram", name: "PANGRAM", token: "game-pangram", live: false,
      rule: "Make words of four or more letters from seven, always using the centre letter, and find the word that uses all seven.",
      motif: "Seven keys, four over three, the centre key filled \u2014 the keypad itself, never a honeycomb.",
      icon: '<g fill="none" stroke="currentColor" stroke-width="1.4" stroke-linejoin="round"><rect x="1.8" y="6.9" width="3.6" height="3.6" rx="0.8"/><rect x="7.4" y="6.9" width="3.6" height="3.6" rx="0.8"/><rect x="13" y="6.9" width="3.6" height="3.6" rx="0.8"/><rect x="18.6" y="6.9" width="3.6" height="3.6" rx="0.8"/><rect x="4.6" y="12.5" width="3.6" height="3.6" rx="0.8"/><rect x="15.8" y="12.5" width="3.6" height="3.6" rx="0.8"/></g><rect x="9.5" y="11.8" width="5" height="5" rx="1.1" fill="currentColor"/>' },
    { id: "five-letters", name: "FIVE LETTERS", token: "game-five-letters", live: false,
      rule: "Find the five letter word in six guesses, each letter marked right, present or absent.",
      motif: "The three marks \u2014 a filled tile (right), a dashed tile (present), a crossed tile (absent).",
      icon: '<rect x="1.4" y="8.8" width="6.4" height="6.4" rx="1.3" fill="currentColor"/><rect x="9.6" y="9.6" width="4.8" height="4.8" rx="0.8" fill="none" stroke="currentColor" stroke-width="1.6" stroke-dasharray="2.2 1.4"/><rect x="17" y="9.6" width="4.8" height="4.8" rx="0.8" fill="none" stroke="currentColor" stroke-width="1.6"/><path d="M18.2 10.8 20.6 13.2M20.6 10.8 18.2 13.2" fill="none" stroke="currentColor" stroke-width="1.3" stroke-linecap="round"/>' }
  ];
  function gameById(id) { for (var i = 0; i < GAMES.length; i++) if (GAMES[i].id === id) return GAMES[i]; return null; }
  function GameIcon(id) {
    var g = gameById(id);
    var s = document.createElementNS(SVGNS, "svg");
    s.setAttribute("viewBox", "0 0 24 24");
    s.setAttribute("class", "dk-icon dk-game-icon");
    s.setAttribute("aria-hidden", "true");
    s.innerHTML = g ? g.icon : "";
    return s;
  }
  /* GameLogo: the badge-plus-wordmark lockup. size: "md" (default, header/hub scale) or "lg" (cover/splash scale). */
  function GameLogo(id, size) {
    var g = gameById(id);
    var badge = el("span", { "class": "dk-game-logo__badge", attrs: { style: "background:var(--" + g.token + ")", "data-on": g.on || "light" } }, [GameIcon(id)]);
    var name = el("span", { "class": "dk-game-logo__name", text: g.name });
    return el("div", { "class": "dk-game-logo" + (size === "lg" ? " dk-game-logo--lg" : "") }, [badge, name]);
  }
  /* GameButton: the primary CTA for one game, self-coloured from its own game-* token. */
  function GameButton(id, opts) {
    opts = opts || {};
    var g = gameById(id);
    var label = opts.label || ("Play " + g.name);
    var b = el("button", { "class": "dk-button dk-button--primary dk-button--game", attrs: { type: "button", style: "--accent:var(--" + g.token + ")", "data-on": g.on || "light" } },
      [GameIcon(id), el("span", { text: label })]);
    if (opts.onClick) b.addEventListener("click", opts.onClick);
    return b;
  }

  /* Suite-wide tier names (src/engine/tiers.ts), used by every v3 game.
     Tier 0 is always the distinguished bucket: bold, accent border. */
  var TIERS = ["Excellent", "Great", "Good", "Fair", "Rough"];
  function TierBadge(tier, label) {
    var name = TIERS[tier] || "";
    return el("span", { "class": "dk-tier" + (tier === 0 ? " dk-tier--distinguished" : ""), text: label ? (name + " · " + label) : name });
  }

  /* WORD LADDER: { status, goal, word, armed (0-3), rungs: [{word, progress -1|0|1}], start, locked } */
  var WL_KEYS = ["abcdefg", "hijklmn", "opqrstu", "vwxyz"];
  function WordLadderBoard(o) {
    var cells = o.word.toUpperCase().split("").map(function (ch, i) {
      return el("button", { "class": "wl-cell", text: ch, attrs: { type: "button", "aria-pressed": o.armed === i ? "true" : "false", "aria-label": "Letter " + (i + 1) + ": " + ch + (o.armed === i ? ", armed" : ""), disabled: o.locked ? "true" : null } });
    });
    var keys = WL_KEYS.map(function (row) {
      return el("div", { "class": "wl-key-row" }, row.split("").map(function (ch) {
        return el("button", { "class": "wl-key", text: ch.toUpperCase(), attrs: { type: "button", "data-letter": ch } });
      }));
    });
    var rungs = [el("li", { "class": "wl-rung wl-rung-start", text: o.start.toUpperCase() })].concat((o.rungs || []).map(function (r) {
      return el("li", { "class": "wl-rung", text: r.word.toUpperCase(), attrs: { "data-progress": String(r.progress) } });
    }));
    return el("div", { "class": "wl-game" }, [
      el("p", { "class": "wl-status", text: o.status || "", attrs: { role: "status", "aria-live": "polite" } }),
      el("p", { "class": "wl-goal", text: o.goal || "" }),
      el("div", { "class": "wl-word", attrs: { role: "group", "aria-label": "Current word" } }, cells),
      el("div", { "class": "wl-keys", attrs: { role: "group", "aria-label": "Letter keys" } }, keys),
      el("div", { "class": "wl-controls" }, [
        el("button", { "class": "wl-run", text: "Add rung", attrs: { type: "button" } }),
        el("button", { "class": "wl-undo", text: "Undo", attrs: { type: "button", disabled: (o.rungs || []).length ? null : "true" } }),
        el("button", { "class": "wl-reveal", text: "Reveal", attrs: { type: "button" } })
      ]),
      el("ol", { "class": "wl-ladder", attrs: { "aria-label": "Rungs climbed" } }, rungs)
    ]);
  }

  /* PANGRAM: { status, meter (0-8 full cells), draft, letters: [7 in slot order; slot 5, bottom middle, is the centre], found: [{word, pangram}], confirming } */
  function PangramBoard(o) {
    var meter = [];
    for (var i = 0; i < 8; i++) meter.push(el("span", { "class": "pan-meter-cell", attrs: { "data-full": i < (o.meter || 0) ? "true" : "false" } }));
    function key(slot) {
      var centre = slot === 5;
      return el("button", { "class": "pan-key", text: o.letters[slot].toUpperCase(), attrs: { type: "button", "data-slot": slot, "data-centre": centre ? "true" : "false", "aria-label": o.letters[slot].toUpperCase() + (centre ? ", centre letter" : "") } });
    }
    var found = (o.found || []).map(function (f) {
      return el("li", { "class": "pan-found-word", text: f.pangram ? f.word + " (pangram)" : f.word, attrs: { "data-pangram": String(!!f.pangram) } });
    });
    return el("div", { "class": "pan-game" }, [
      el("p", { "class": "pan-status", text: o.status || "", attrs: { role: "status", "aria-live": "polite" } }),
      el("div", { "class": "pan-meter", attrs: { role: "img", "aria-label": "Score meter" } }, meter),
      el("p", { "class": "pan-draft", text: o.draft || "", attrs: { "aria-label": "Word being typed" } }),
      el("div", { "class": "pan-keys", attrs: { role: "group", "aria-label": "Letter keys" } }, [
        el("div", { "class": "pan-key-row pan-key-row-top" }, [0, 1, 2, 3].map(key)),
        el("div", { "class": "pan-key-row pan-key-row-bottom" }, [4, 5, 6].map(key))
      ]),
      el("div", { "class": "pan-controls" }, [
        el("button", { "class": "pan-delete", text: "Delete", attrs: { type: "button" } }),
        el("button", { "class": "pan-shuffle", text: "Shuffle", attrs: { type: "button" } }),
        el("button", { "class": "pan-enter", text: "Enter", attrs: { type: "button" } })
      ]),
      el("button", { "class": "pan-finish", text: o.confirming ? "Tap again to finish" : "Finish", attrs: { type: "button" } }),
      el("ul", { "class": "pan-found", attrs: { "aria-label": "Words found" } }, found)
    ]);
  }

  /* FIVE LETTERS: { status, rows: 6 x ({word, marks[5]: 0 absent|1 present|2 right} | {draft} | null), keyMarks: {letter: mark} } */
  var FL_MARK_GLYPH = ["\u00D7", "\u25CB", "\u25CF"], FL_MARK_WORD = ["absent", "present", "right"];
  function FiveLettersBoard(o) {
    var rows = [];
    for (var r = 0; r < 6; r++) {
      var row = (o.rows || [])[r] || null, tiles = [];
      for (var c = 0; c < 5; c++) {
        var letter = row ? (row.word ? row.word[c] : (row.draft || "")[c]) : "";
        var mark = row && row.marks ? row.marks[c] : null;
        var kids = [el("span", { "class": "fl-letter", text: (letter || "").toUpperCase() }), el("span", { "class": "fl-mark", text: mark == null ? "" : FL_MARK_GLYPH[mark], attrs: { "aria-hidden": "true" } })];
        tiles.push(el("div", { "class": "fl-tile", attrs: mark == null ? {} : { "data-mark": String(mark) } }, kids));
      }
      rows.push(el("div", { "class": "fl-row", attrs: { role: "group" } }, tiles));
    }
    var km = o.keyMarks || {};
    var keyRows = ["abcdefg", "hijklmn", "opqrstu", "vwxyz"].map(function (letters, i) {
      var ks = letters.split("").map(function (ch) {
        var m = km[ch];
        return el("button", { "class": "fl-key", text: ch.toUpperCase(), attrs: Object.assign({ type: "button", "data-letter": ch }, m == null ? {} : { "data-mark": String(m), "aria-label": ch.toUpperCase() + ", " + FL_MARK_WORD[m] }) });
      });
      if (i === 3) {
        ks.push(el("button", { "class": "fl-key fl-key-wide", text: "Del", attrs: { type: "button", "aria-label": "Delete" } }));
        ks.push(el("button", { "class": "fl-key fl-key-wide", text: "Enter", attrs: { type: "button" } }));
      }
      return el("div", { "class": "fl-key-row" }, ks);
    });
    return el("div", { "class": "fl-game" }, [
      el("p", { "class": "fl-status", text: o.status || "", attrs: { role: "status", "aria-live": "polite" } }),
      el("div", { "class": "fl-board", attrs: { role: "group", "aria-label": "Guesses" } }, rows),
      el("div", { "class": "fl-keys", attrs: { role: "group", "aria-label": "Letter keys" } }, keyRows)
    ]);
  }

  window.DailyKit = { Header: Header, Countdown: Countdown, formatDuration: formatDuration, HelpPanel: HelpPanel, GridCursor: GridCursor, PokerGridBoard: PokerGridBoard, VectorBoard: VectorBoard, CipherBoard: CipherBoard, RotateLockBoard: RotateLockBoard, DifferenceRelayBoard: DifferenceRelayBoard, HubCard: HubCard, HubStreak: HubStreak, HubDailyCard: HubDailyCard, HubFooter: HubFooter, Notice: Notice, EndScreen: EndScreen, CrossPromo: CrossPromo, ArchiveList: ArchiveList, CopyBox: CopyBox, ChangelogList: ChangelogList, AboutPage: AboutPage, Icon: Icon, ICONS: ICON_SVG, ICON_LABEL: ICON_LABEL, GAMES: GAMES, GameIcon: GameIcon, GameLogo: GameLogo, GameButton: GameButton, TierBadge: TierBadge, TIERS: TIERS, WordLadderBoard: WordLadderBoard, PangramBoard: PangramBoard, FiveLettersBoard: FiveLettersBoard };
})();
