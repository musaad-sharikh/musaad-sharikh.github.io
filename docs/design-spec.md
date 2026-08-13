# Bilingual Portfolio — Design Specification

Personal portfolio for Musaad Muhammad, Design Engineer (Front-End & UI). English and
Arabic, hand-written HTML/CSS/JavaScript, deployed on GitHub Pages at
`https://musaad-sharikh.github.io`.

## Purpose and audience

The reader is a hiring manager or recruiter who has ten seconds to decide whether to keep
reading. Two audiences matter: Saudi employers who will read Arabic, and regional or remote
front-end teams who will read English. The site must serve both without either feeling like a
translation afterthought.

The site is also itself a work sample. Every claim on the CV — component libraries, responsive
layout, accessibility, JavaScript — has to be demonstrably true of the page the reader is
looking at. A portfolio that claims WCAG competence and fails a keyboard-only pass is worse
than no portfolio.

## Non-goals

- No framework, bundler, transpiler, or package manager. The repo is deployable as-is.
- No contact form. A form needs a backend; `mailto:` and LinkedIn do not.
- No analytics, tracking pixels, or third-party embeds.
- No CMS or content build step. Editing content means editing two files.
- No blog.

## Content — source of truth

All copy is lifted verbatim from the existing CV pair, not translated by machine:

| Language | Source |
|----------|--------|
| English | `$VAULT/Professional-Documents/CV/Musaad \| Front-end.pdf` |
| Arabic | `$VAULT/Professional-Documents/CV/build_cv_ar.py` (Arabic strings inline) |

Fixed facts used across the site:

- Name — Musaad Muhammad / مساعد محمد
- Title — Design Engineer · Front-End & UI / مهندس واجهات أمامية ومصمّم تجربة المستخدم
- Email — `musaad.sharikh@gmail.com`
- LinkedIn — `linkedin.com/in/musaad-muhammad`
- GitHub — `github.com/musaad-sharikh`
- Experience — UX/UI Designer at aDawliah (2019–2024); Freelance UI Designer & Front-End (2017–2019)
- Certifications — Meta/Coursera 2025, Tuwaiq Academy 2025, freeCodeCamp 2024, IxDF 2024

**The phone number must not appear anywhere in the repository — including inside the published
PDFs.** The CV files served from this site are *public-safe copies*: regenerated from a
phone-free build script, not copied out of the vault. Their contact line carries email,
LinkedIn, and GitHub only. This is a hard constraint, enforced by an automated test that both
greps repository text and extracts the text layer of every published PDF.

## Information architecture

Single page, seven sections, anchor navigation:

1. **Hero** — name, title, the summary paragraph, and four actions: email, LinkedIn, GitHub, download CV.
2. **Experience** — two roles, dates aligned to the inline-end edge, CV bullets verbatim.
3. **Work** — the three demo projects (see below), each a card linking to its live demo and source.
4. **Skills** — the CV's three groups: Front-End, Design & Systems, Tools.
5. **Certifications** — four entries with issuer and year.
6. **Languages** — Arabic native, English professional working proficiency (STEP 66, Qiyas 2022).
7. **Footer** — contact repeat, language toggle, theme toggle, source link.

The CV's own "Projects" entries (E-Commerce UI in Figma, Portfolio Site) are folded into
**Work** rather than given a separate section — the Portfolio Site entry is this site, and
listing it as a project on itself is noise.

## Bilingual and RTL architecture

**English is the served HTML.** `index.html` ships with English text in the markup. The page is
complete and readable with JavaScript disabled, indexes correctly, and needs no hydration
flash. Arabic is applied client-side.

**Arabic lives in one dictionary per page.** `i18n/ar.js` maps `data-i18n` keys to Arabic
strings. Nothing is duplicated: English exists once in the HTML, Arabic once in the dictionary.

**Switching.** On the first toggle, the engine walks every `[data-i18n]` node and caches its
original English `textContent` in a `Map`. Switching to Arabic writes dictionary values;
switching back writes cached values. The engine also sets `documentElement.lang` and
`documentElement.dir`, swaps `[data-i18n-attr]` attributes (`aria-label`, `title`, `alt`,
`href` for the CV download), and updates the toggle's `aria-pressed` state.

**Persistence and entry.** Resolution order on load: `?lang=` query parameter → `localStorage`
→ default English. The query parameter exists so a link can be shared in a specific language;
selecting a language writes it to `localStorage` and updates the URL with `history.replaceState`
so a reload is stable.

**Announcing the change.** The toggle is a `<button aria-pressed>`, not a link. After a switch,
a visually-hidden `aria-live="polite"` region announces the new language so screen-reader users
get confirmation that is not purely visual.

**Mixed-direction text.** Arabic copy contains Latin runs ("HTML", "Figma", "aDawliah",
"WCAG"). Each is wrapped in `<span lang="en" dir="ltr">` so screen readers switch pronunciation
and the bidi algorithm does not mangle punctuation at run boundaries. Numbers stay Western
Arabic numerals in both languages — the Arabic CV uses them, and Saudi professional Arabic
overwhelmingly does too. Anywhere numbers are produced by `Intl`, the locale is requested as
`ar-SA-u-nu-latn`; plain `ar-SA` would default to Arabic-Indic digits (٤٥٦) and silently
contradict this rule.

**RTL layout.** The stylesheet uses CSS logical properties throughout — `margin-inline`,
`padding-inline-start`, `border-inline-end`, `inset-inline`, `text-align: start/end` — so
`dir="rtl"` mirrors the layout with no direction-specific rules. The only physical exceptions
are things that must not mirror: arrow glyphs that indicate reading direction, and any
left-to-right diagram. These get an explicit `[dir="rtl"] { scale: -1 1 }` and are documented
inline where they occur.

## Design system

**Tokens.** One `:root` block of custom properties defines the entire visual language:
color, type scale, spacing scale, radii, shadow, and motion duration. Both themes and all
three demos consume the same tokens. Changing a token changes the site and every demo at once
— which is the component-library claim from the CV, demonstrated rather than asserted.

**Color.** A restrained neutral base with one accent. Light and dark themes are both authored;
the initial theme follows `prefers-color-scheme` and a toggle overrides it into `localStorage`.
Every text/background pair meets WCAG AA — 4.5:1 for body text, including accent-colored links,
which sit in running text and do not qualify for the large-text exemption.

Borders are two tokens, not one, because WCAG 1.4.11 applies to boundaries that carry meaning
and not to decoration:

- `--color-border-strong` — boundaries that are the only indication a control exists, such as
  an input outline. Gated at 3:1 against both `--color-bg` and `--color-surface`.
- `--color-border` — decorative hairlines and section rules, which convey nothing that is not
  already conveyed by spacing and headings. No contrast floor; deliberately subtle.

Collapsing these into one token forces a choice between heavy-looking dividers and inaccessible
form fields. Every gated pair is verified by a contrast script rather than by eye.

**Type.** Latin and Arabic are set in different families, sized so their x-heights and visual
weight match rather than their nominal point size — Arabic typically needs a slightly larger
size to sit correctly next to Latin, applied via `[lang="ar"]` on the root.

- Latin: Inter, self-hosted WOFF2 variable, with a system-UI fallback stack.
- Arabic: IBM Plex Sans Arabic, self-hosted WOFF2 at three static weights.

Inter is variable, so one file covers its whole weight range. IBM Plex Sans Arabic has no
variable build, so each weight is a separate face; only the three the design actually paints
are shipped — 400 for body copy, 600 for UI labels, 700 for headings and `<th>`, which default
to bold. Shipping fewer would leave the browser to synthesise the missing weight, and faux-bold
thickens Arabic strokes in a way that damages the joins.

Inter is second in the Arabic stack, not absent from it. IBM Plex Sans Arabic's `unicode-range`
claims no Latin, so the Latin runs embedded in Arabic sentences fall through to the next family;
without Inter there they landed on an arbitrary system font, and the same word was set in one
typeface on the English page and another on the Arabic one.

The downloadable CV PDFs remain set in Noto Sans Arabic, matching the owner's master documents
rather than the site.

Each `@font-face` declares a `unicode-range`. This is not a micro-optimisation: it means a
visitor reading the English page never downloads the Arabic font at all, and vice versa. The
browser fetches a face only when the page actually renders a codepoint inside its range, so the
bilingual capability costs nothing to the monolingual reader.

Fonts are self-hosted rather than loaded from Google Fonts: no third-party request, no layout
shift from a blocked CDN, and it works offline. Both are subset and served with
`font-display: swap`. If the WOFF2 toolchain is unavailable at build time, the fallback is a
documented system stack (`system-ui` for Latin, `"Segoe UI", Tahoma` plus the OS Arabic default)
— degraded typography, no broken page.

**Fluid scale.** Type and spacing use `clamp()` against viewport width, so the layout has no
breakpoint jumps. Explicit breakpoints exist only where the grid genuinely changes shape.

**Motion.** Entrance transitions are short and subtle, gated behind
`@media (prefers-reduced-motion: no-preference)`. Nothing animates on the critical path.

## Accessibility requirements

These are acceptance criteria, not aspirations. Each is verified before deploy.

- Skip-to-content link, first in tab order, visible on focus.
- One `<h1>`; heading levels descend without gaps.
- Landmarks: `header`, `nav`, `main`, `footer`, and `section` elements with `aria-labelledby`.
- Every interactive element reachable and operable by keyboard, in a logical order, with a
  visible `:focus-visible` ring that meets 3:1 against its background.
- Both toggles are `<button>` with `aria-pressed`; neither is a `div` with a click handler.
- Modal and drawer components in the demos trap focus, close on `Escape`, and restore focus to
  the trigger.
- All images have `alt`; decorative SVG is `aria-hidden="true"`; icon-only buttons have
  `aria-label` that is translated alongside the visible copy.
- `prefers-reduced-motion` respected globally.
- Page passes with CSS disabled — content order in the DOM matches reading order.
- Target size for interactive controls is 44×44 CSS pixels, exceeding the 24×24 WCAG 2.2 AA
  floor, because the two header toggles are small icon buttons and are the most-used controls
  on the site.

## Demo projects

Three self-contained demos live under `demos/`. Each shares the site's token file and i18n
engine, is fully bilingual with RTL support, is keyboard-accessible, and carries a visible
label reading **"Personal concept project — not client work"** (and its Arabic equivalent).
No demo is presented as a client engagement, and no fabricated client, metric, or testimonial
appears anywhere.

### 1. Component Library (`demos/components/`)

A live gallery of the design system: buttons, form fields with validation states, cards,
tabs, accordion, toast, modal, and badge. Each component shows a rendered preview plus a
copy-to-clipboard HTML snippet. Global controls flip the whole gallery between LTR and RTL and
between light and dark, so a reviewer can see every component in all four combinations.

This is the demo that substantiates the CV's strongest claim — "built the team's first shared
component library." Here the library is real, running, and inspectable.

### 2. Commerce Flow (`demos/commerce/`)

A working slice of the shopping experience the CV describes as a Figma concept: a product
grid, a cart drawer, quantity editing, and a checkout form. State is plain JavaScript with
`localStorage` persistence. The checkout form does accessible client-side validation — errors
announced via `aria-live`, each field wired with `aria-describedby` and `aria-invalid`, and
focus moved to the first invalid field on submit. Prices render through `Intl.NumberFormat` in
SAR, formatted per the active locale.

### 3. Dashboard (`demos/dashboard/`)

An analytics view matching the "dashboard products" line on the CV. Charts are hand-authored
SVG — no charting library — which makes them theme-aware, RTL-mirrorable, and inspectable.
Every chart carries a keyboard-navigable data table as its accessible equivalent, so the
information is available without seeing the graphic. Chart color follows the project's
data-visualization guidance for categorical palettes and contrast, checked in both themes.

Demo data is clearly synthetic and labeled as such.

## File layout

```
musaad-sharikh.github.io/
├── index.html
├── css/
│   ├── tokens.css          design tokens, themes, font faces
│   ├── base.css            reset, typography, layout primitives
│   ├── components.css      shared component styles
│   └── print.css           print stylesheet for the main page
├── js/
│   ├── i18n.js             reusable engine; takes a dictionary, exports setLanguage()
│   ├── theme.js            theme toggle + prefers-color-scheme
│   └── main.js             nav, scroll spy, page wiring
├── i18n/
│   └── ar.js               Arabic dictionary for the main page
├── demos/
│   ├── components/         index.html, demo.js, ar.js
│   ├── commerce/           index.html, demo.js, ar.js
│   └── dashboard/          index.html, demo.js, ar.js, charts.js
├── assets/
│   ├── fonts/              self-hosted WOFF2
│   ├── cv/                 generated, phone-free CV PDFs (EN + AR)
│   └── icons/              favicon set, og-image
├── docs/
│   └── design-spec.md      this file
├── .nojekyll
├── robots.txt
├── sitemap.xml
└── README.md
```

The published CV PDFs are **generated, not copied**. `tools/build-cv.py` renders both language
versions with the same fonts and layout as the originals but with the phone number omitted from
the contact line. Nothing is copied out of the private document vault, no vault path appears in
any shipped file, and the vault itself is read-only for the whole of this project.

Regenerating rather than post-processing matters: stripping text out of an existing PDF leaves
the removed glyphs recoverable in the content stream, so a "redacted" copy made that way would
still leak the number to anyone running `pdftotext`.

## Performance budget

- No render-blocking third-party requests.
- Under 300 KB transferred for a cold-cache visit in either language. Because each font face
  declares a `unicode-range`, only one script's font is fetched per visit, so the bilingual
  build does not cost the monolingual reader anything.
- Above-the-fold content paints without waiting on JavaScript.
- Images, where present, use explicit `width`/`height` to reserve space, and `loading="lazy"`
  below the fold.

## Deployment

Public repository `musaad-sharikh/musaad-sharikh.github.io`, GitHub Pages serving `main` from
the repository root. A user-site repository gives the apex URL `https://musaad-sharikh.github.io`
with no path suffix. `.nojekyll` is present to keep Pages from running the file tree through
Jekyll.

Because this is the account's first public repository, the pre-publication check is explicit
and blocking: grep the whole tree for the phone number, extract and grep the text layer of both
published PDFs, and confirm no path referencing the private document vault appears in any
shipped file. Publication itself does not happen until the owner has reviewed the finished local
site and explicitly approved it.

## Verification

Run before the site is called done:

1. `grep -r` for the phone number across repository text — must return nothing.
1. `pdftotext` over both published CV PDFs — the extracted text must contain no phone number.
2. Keyboard-only pass over the main page and all three demos: every control reachable, focus
   always visible, no trap outside the intentional modal traps.
3. Language toggle exercised on every page, in both directions, with a reload in between to
   confirm persistence.
4. Contrast check on every token pair in both themes.
5. `prefers-reduced-motion` and `prefers-color-scheme` both exercised.
6. Page rendered with JavaScript disabled — English content fully present.
7. Live check of the deployed URL, both languages, after Pages goes green.

## Resolved during review

- Font subsetting: `fonttools` with Brotli is present, and both families are installed as
  variable fonts. Two WOFF2 files cover every weight.
- CV regeneration: `reportlab`, `arabic-reshaper`, and `python-bidi` are not installed system-wide.
  The build script runs from a throwaway virtual environment outside the repository, so the
  repository stays dependency-free.
- `--color-border` at its original value measured 1.58:1 against the page background and would
  have failed the 3:1 gate. Split into the two tokens described under Color.
- Accent-on-background was gated at 3:1, which is wrong for links set in running text. Raised
  to 4.5:1.

## Open item

The Open Graph preview image is a stretch goal. If it is not produced, the `og:image` tag is
omitted rather than left pointing at a missing file.
