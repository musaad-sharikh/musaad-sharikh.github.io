# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## What this is

A bilingual (English/Arabic, LTR/RTL) personal portfolio served by GitHub Pages from the
repository root of a *user site* — pushing `main` is the deploy. Hand-written HTML, CSS and
ES modules with **no runtime dependencies**: there is no `package.json`, no bundler and no
build step for the site itself. Everything under `tools/` is development-only, uses Node's
standard library, and is never served.

`docs/design-spec.md` is the spec of record — the rationale behind every constraint below
lives there. `docs/implementation-plan.md` is the task-by-task plan the site was built from.

## Commands

```bash
node --test                              # all gates (76 checks, ~0.5s)
node --test tools/i18n.test.mjs          # one file
node --test --test-name-pattern="clamped" tools/cart.test.mjs

python3 -m http.server 8000              # local preview — ES modules need http, not file://
```

End-to-end (Playwright, 133 browser checks over all four pages — **not** picked up by
`node --test`, since it is not named `*.test.mjs`):

```bash
ln -sfn /path/to/any/project/node_modules node_modules   # must contain playwright; not vendored
DISPLAY=:0 node tools/e2e/e2e.mjs                        # headed
HEADLESS=1 node tools/e2e/e2e.mjs                        # headless
node tools/e2e/e2e.mjs "D. keyboard"                     # one group
```

The symlink can stay: the walker skips `node_modules` by name before it inspects the entry
type. See `tools/e2e/README.md` for the traps that have bitten this suite.

Regenerating assets (both need tools this repo does not vendor):

```bash
tools/build-fonts.sh                     # needs fontTools + Brotli, and the source families in ~/.local/share/fonts
python3 tools/build-cv.py                # needs reportlab, arabic-reshaper, python-bidi in a venv OUTSIDE the repo
```

`pdftotext` (poppler) must be on `PATH` or `tools/pdf.test.mjs` fails.

## The gates

Each test in `tools/` guards an invariant that is otherwise invisible. Read the gate before
working around it — the comments record what already broke.

- **Privacy** (`privacy.test.mjs`, `pdf.test.mjs`) — the owner's phone number and the private
  vault path must appear nowhere in the tree, *including the text layer of the published CV
  PDFs*. Both patterns live only in `tools/lib/forbidden.mjs`; import from there, never
  re-declare. The CV PDFs are **regenerated** phone-free by `tools/build-cv.py`, never
  post-processed — stripping text from an existing PDF leaves the glyphs recoverable.
- **The walker** (`tools/lib/html.mjs`, proven by `walk.test.mjs`) — every checker's reach.
  `SKIP_DIRS` is `.git` and `node_modules` only. Adding a name silently narrows the privacy
  scan; that is exactly how a generated-artifact directory once hid quoted secrets. Symlinks
  are scanned as the target path they store, never followed.
- **Logical properties** (`logical-css.test.mjs`) — no physical CSS anywhere, property names
  *and* values (`float: left`, `object-position: right`). Escape hatch: a `physical-ok:`
  comment on the same line. Nothing currently uses it.
- **Contrast** (`contrast.test.mjs`) — the `PAIRS` table gates text at 4.5:1 and boundaries,
  focus rings and chart marks at 3:1, in both themes. It parses `css/tokens.css` with a
  regex, so every colour token must stay a single `light-dark(#hex, #hex)` declaration inside
  the one `:root` block. `--color-border` is deliberately ungated (decorative);
  `--color-border-strong` is the functional one.
- **Fonts** (`fonts.test.mjs`) — the four shipped WOFF2 files, no orphans, every `@font-face`
  `src` resolving, and IBM Plex Sans Arabic declared at exactly 400/600/700. A weight in
  `build-fonts.sh` without a matching face in `tokens.css` ships dead bytes; a missing one
  makes the browser synthesise it and wreck the Arabic joins.
- **i18n parity** (`i18n.test.mjs`) — for each page, every `data-i18n` key has an Arabic
  string and every dictionary key has markup, in both directions, and Arabic values actually
  contain Arabic script. Adding a page means adding it to `PAGES`. Keys written by JavaScript
  at runtime go in the `DYNAMIC_KEYS` allow-list — the only permitted exemption.
- **Charts** (`charts.test.mjs`) — SVG output colours from `var(--chart-N)` only, never
  literal hex, and never past the five declared slots.

## Architecture

**English is the served HTML; Arabic is applied client-side.** `index.html` and each demo
ship complete English copy, so the page works with JavaScript disabled. Arabic lives once per
page in an ES-module dictionary (`i18n/ar.js`, `demos/*/ar.js`) keyed by `data-i18n`.
Attributes are translated via `data-i18n-attr="aria-label:some.key, title:other.key"`. A
`key#html` entry is a rich variant applied with `innerHTML` (dictionary-only, never user
input) and requires a plain sibling key.

`js/i18n.js` caches each node's English `textContent` in a `Map` on first application, so
switching back restores the served markup rather than a second English dictionary. `apply()`
takes `userInitiated`: only a deliberate toggle writes `localStorage`, rewrites the URL, or
announces via the live region — a shared `?lang=` link decides what *this* page renders
without speaking for the reader. Resolution order is `?lang=` → `localStorage` → English.

**Theme is `color-scheme`, nothing else.** `css/tokens.css` states every colour once as
`light-dark(light, dark)`; `:root[data-theme]` overrides only `color-scheme`, so the two
themes cannot drift. `js/theme.js`'s toggle owns its own `aria-label` outright and carries
**no** `data-i18n-attr` — its label depends on both theme and language, and letting the i18n
engine manage an attribute another module rewrites corrupts the engine's cache of originals.

Both `index.html` and every demo repeat a small inline `<script>` in `<head>` that applies the
stored theme and language before first paint. A new page needs that block copied, or it
flashes.

**One token file drives everything.** The main page and all three demos load the same
`css/tokens.css`, `base.css` and `components.css`; changing a token changes the site and every
demo at once — that is the component-library claim, demonstrated. The Arabic optical uplift is
`--script-scale` on the *type scale* (not `body { font-size }` — nothing inherits from body),
and `:root[lang='ar']` zeroes the tracking tokens, because letter-spacing breaks Arabic
cursive outright.

Each `@font-face` `unicode-range` is load-bearing, not an optimisation: an English reader
never downloads the Arabic face at all. Inter sits *second* in `--font-arabic` so Latin runs
embedded in Arabic sentences resolve to the same face as on the English page.

**Demos** (`demos/components|commerce|dashboard/`) are self-contained pages importing the
shared `js/i18n.js` and `js/theme.js` plus their own `demo.js`, `ar.js` and (commerce/
dashboard) a testable pure module — `cart.js` takes a storage object, `charts.js` returns SVG
strings. Dashboard charts are hand-authored SVG, `aria-hidden`, paired with a real data table
as the accessible equivalent. Every demo carries the visible "Personal concept project — not
client work" label; no fabricated client, metric or testimonial appears anywhere.

## Conventions

- Comments explain **why**, at length, and cite the failure that motivated the rule. Match
  that register — a bare restatement of the code is noise here.
- Latin runs inside Arabic copy are wrapped in `<span lang="en" dir="ltr">`; the e2e
  untranslated-text gate is zero-tolerance and relies on it.
- Numbers stay Western-Arabic in both languages. `Intl` locales are requested as
  `ar-SA-u-nu-latn` — plain `ar-SA` yields Arabic-Indic digits.
- Interactive targets are 44×44 CSS px; WCAG 2.2 AA is the floor, not the goal.
- `.gitignore` admits exactly one file under `.claude/` (`settings.json`, the plugin scoping);
  everything else there is regenerable harness payload.
