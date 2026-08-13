# Bilingual Portfolio Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build and publish a bilingual (English/Arabic, LTR/RTL) personal portfolio for Musaad Muhammad at `https://musaad-sharikh.github.io`, using hand-written HTML, CSS, and JavaScript with no runtime dependencies.

**Architecture:** A single static page whose English copy lives in the served HTML and whose Arabic copy lives in an ES-module dictionary applied client-side. One token file drives the visual language for the main page and three self-contained demo projects. Verification is done by `node --test` scripts under `tools/`, which use only Node's standard library — the repository has no `package.json` and ships no dependencies.

**Tech Stack:** HTML5, CSS3 (custom properties, logical properties, `clamp()`), JavaScript ES2022 modules, Node 22 built-in test runner (development only), `fontTools` + Brotli for font subsetting (development only), GitHub Pages.

**Reference spec:** `docs/design-spec.md`

## Global Constraints

Every task's requirements implicitly include this section.

- **No runtime dependencies.** No npm package is installed, no bundler runs, no `package.json` is created. Everything under `tools/` uses Node's standard library only and is never served.
- **The phone number must not appear anywhere in the repository**, in any format or spacing variant, and **not inside the published CV PDFs either**. The served PDFs are regenerated phone-free by `tools/build-cv.py`; the originals are never copied in. Enforced by automated tests from Tasks 1 and 10 onward.
- **Nothing is published until the owner approves.** No GitHub repository is created, no remote is added, and nothing is pushed until the owner has reviewed the finished local site and said so explicitly. Task 16 is blocked until then.
- **No fabricated professional claims.** No invented clients, employers, metrics, testimonials, or dates. Every biographical statement traces to `Musaad | Front-end.pdf` or `build_cv_ar.py`.
- **All three demos carry a visible label** reading `Personal concept project — not client work` / `مشروع شخصي تجريبي — وليس عملاً لعميل`.
- **All CSS uses logical properties** (`margin-inline`, `padding-inline-start`, `border-inline-end`, `inset-inline`, `text-align: start|end`). Physical properties require an inline `/* physical-ok: <reason> */` comment on the same line. Enforced by an automated test from Task 4 onward.
- **Every user-visible string carries a `data-i18n` key** with a matching entry in the page's Arabic dictionary. Enforced by an automated test from Task 7 onward.
- **WCAG 2.2 AA** is the accessibility floor, not a target.
- **Verbatim copy:** English strings come from the English CV; Arabic strings come from the Arabic strings inline in `build_cv_ar.py`. Neither is paraphrased or machine-translated.
- **Commits and pushes require explicit user authorization** at execution time. Steps labelled `Commit` and the publication steps in Task 16 pause for confirmation.
- **`$VAULT`** is the owner's private document repository. Export it before running any command below. It is written as a variable, never spelled out, because this document ships in the public repository and the privacy guard scans `docs/` along with everything else:

  ```bash
  # The owner's private documents repository — the sibling checkout under
  # ~/Github/Musaad-Sharikh/. Its directory name is deliberately not written out
  # here: the privacy guard scans docs/ too, so spelling it would make this very
  # document fail the check it specifies.
  export VAULT=~/Github/Musaad-Sharikh/<private-documents-repo>
  ```

- **Source paths** (read-only, never modified, never copied into the repository):
  - `$VAULT/Professional-Documents/CV/build_cv_en.py` — layout reference for the EN CV
  - `$VAULT/Professional-Documents/CV/build_cv_ar.py` — layout reference and Arabic copy source
  - `/home/mbm/.local/share/fonts/Inter/Inter[opsz,wght].ttf`
  - `/home/mbm/.local/share/fonts/Noto_Sans_Arabic/NotoSansArabic-VariableFont_wdth,wght.ttf`
  - `/home/mbm/.local/share/fonts/Noto_Sans_Arabic/static/NotoSansArabic-{Regular,Bold}.ttf` — used by the CV builder
- **Python environment:** `reportlab`, `arabic-reshaper`, and `python-bidi` are not installed system-wide. Task 10 uses a virtual environment created **outside the repository**, in the session scratchpad, so the repository stays dependency-free.
- **Project root:** `/home/mbm/Github/Musaad-Sharikh/musaad-sharikh.github.io/`

---

## File Structure

| Path | Responsibility |
|------|----------------|
| `index.html` | Main page markup and English copy |
| `css/tokens.css` | `@font-face`, custom properties, light and dark themes |
| `css/base.css` | Reset, typography, layout primitives, focus styles |
| `css/components.css` | Shared component styles used by the page and all demos |
| `css/print.css` | Print rendering of the main page |
| `js/i18n.js` | Reusable language engine — resolution, DOM application, persistence |
| `js/theme.js` | Theme resolution, toggle, persistence |
| `js/main.js` | Main-page wiring: nav, scroll spy, toggle mounting |
| `i18n/ar.js` | Arabic dictionary for the main page |
| `demos/components/{index.html,demo.js,ar.js}` | Component library demo |
| `demos/commerce/{index.html,demo.js,ar.js}` | Commerce flow demo |
| `demos/dashboard/{index.html,demo.js,charts.js,ar.js}` | Dashboard demo |
| `tools/lib/css.mjs` | Shared CSS parsing helpers for tests |
| `tools/lib/html.mjs` | Shared HTML scanning helpers for tests |
| `tools/privacy.test.mjs` | Asserts no phone number, no vault paths |
| `tools/contrast.test.mjs` | Asserts WCAG AA on every declared color pair |
| `tools/logical-css.test.mjs` | Asserts no unannotated physical CSS properties |
| `tools/i18n.test.mjs` | Asserts `resolveLanguage` behaviour and EN/AR key parity |
| `tools/pdf.test.mjs` | Extracts text from every published PDF and asserts no phone number |
| `tools/build-fonts.sh` | One-shot font subsetting; not run at deploy time |
| `tools/build-cv.py` | Renders the two phone-free CV PDFs; not run at deploy time |
| `assets/fonts/` | `inter-subset.woff2`, `noto-sans-arabic-subset.woff2` |
| `assets/cv/` | `Musaad-Muhammad-CV-EN.pdf`, `Musaad-Muhammad-CV-AR.pdf` — generated, phone-free |

---

### Task 1: Repository scaffold and privacy guard

**Files:**
- Create: `.gitignore`, `.nojekyll`, `robots.txt`, `README.md`
- Create: `tools/lib/html.mjs`
- Test: `tools/privacy.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces:
  - `readAllFiles(rootDir): Promise<Array<{path: string, text: string}>>` from `tools/lib/html.mjs` — every non-binary, non-`.git` file in the tree as UTF-8 text. Later test tasks import it.
  - `extractI18nKeys(html): Set<string>` from `tools/lib/html.mjs`.
  - `PHONE: RegExp`, `VAULT: RegExp`, `SELF: string` from `tools/lib/forbidden.mjs`.

**Note on test invocation.** `node --test tools/` does **not** work: positional
arguments to `--test` are glob patterns, not directories to recurse, so it exits
non-zero having run nothing. Use bare **`node --test`** to run the whole suite from the
repository root, or a full file path (`node --test tools/privacy.test.mjs`) for one file.
Verified on Node v22.23.1.

- [ ] **Step 1: Initialise the repository**

```bash
cd "/home/mbm/Github/Musaad-Sharikh/musaad-sharikh.github.io"
git init -b main
mkdir -p css js i18n assets/fonts assets/cv assets/icons tools/lib demos/components demos/commerce demos/dashboard
touch .nojekyll
```

- [ ] **Step 2: Write the file-walking helper**

Create `tools/lib/html.mjs`:

```js
import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const SKIP_DIRS = new Set(['.git', 'node_modules', 'assets']);
const BINARY_EXT = new Set(['.pdf', '.woff2', '.png', '.jpg', '.jpeg', '.ico', '.ttf']);

/** Every text file in the tree, as { path, text }. */
export async function readAllFiles(rootDir) {
  const out = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(join(dir, entry.name));
      } else if (!BINARY_EXT.has(extname(entry.name).toLowerCase())) {
        const path = join(dir, entry.name);
        out.push({ path, text: await readFile(path, 'utf8') });
      }
    }
  }
  await walk(rootDir);
  return out;
}

/** All data-i18n keys in an HTML string, including attribute-target keys. */
export function extractI18nKeys(html) {
  const keys = new Set();
  for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) keys.add(m[1]);
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    for (const pair of m[1].split(/\s*,\s*/)) {
      const key = pair.split(':')[1];
      if (key) keys.add(key.trim());
    }
  }
  return keys;
}
```

- [ ] **Step 3: Write the forbidden-pattern module**

The pattern has to be written down somewhere, and wherever it lives is a file that trips
its own guard. Confine that to exactly one file so exactly one file needs exempting —
rather than exempting whole directories, which would blind the guard to
`tools/build-cv.py` in Task 10, the one place a phone number could plausibly reappear.

Create `tools/lib/forbidden.mjs`:

```js
// The single place the private number's shape is written down. Every checker
// imports from here, so SELF is the only path the scan has to skip.
//
// The gap between digits is capped at two characters and restricted to real
// phone separators. An unbounded gap (\D*) is NOT usable here: across a long
// document those twelve digits occur in order by chance, and the pattern
// matches a span of arbitrary length. Measured on this plan file, \D* matched
// a 45-character stretch of ordinary prose.
const SEP = String.raw`[\s.()\- ]{0,2}`;
export const PHONE = new RegExp(
  ['9', '6', '6', '5', '1', '2', '3', '0', '2', '7', '2', '5'].join(SEP),
);
// Assembled from parts for the same reason the paths in this plan use $VAULT:
// writing the literal would make this document — and this module — trip the very
// check they define.
export const VAULT = new RegExp(['Personal', 'Documents'].join('-'));
export const SELF = 'tools/lib/forbidden.mjs';
```

`\s` in `SEP` covers the newlines `pdftotext` inserts, so the same pattern serves both the
text scan and the PDF scan in Task 10.

Neither `docs/` nor the rest of `tools/` is exempt. Both ship publicly, so both are
scanned. Keeping them scannable is why no planning document in this repository writes the
digits out.

- [ ] **Step 4: Write the failing privacy test**

Create `tools/privacy.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join, relative } from 'node:path';
import { readAllFiles } from './lib/html.mjs';
import { PHONE, VAULT, SELF } from './lib/forbidden.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const isSelf = (f) => relative(ROOT, f.path) === SELF;

test('no phone number anywhere in the repository', async () => {
  const hits = (await readAllFiles(ROOT))
    .filter((f) => !isSelf(f))
    .filter((f) => PHONE.test(f.text))
    .map((f) => relative(ROOT, f.path));
  assert.deepEqual(hits, [], `phone number found in: ${hits.join(', ')}`);
});

test('no private vault paths anywhere in the repository', async () => {
  const hits = (await readAllFiles(ROOT))
    .filter((f) => !isSelf(f))
    .filter((f) => VAULT.test(f.text))
    .map((f) => relative(ROOT, f.path));
  assert.deepEqual(hits, [], `vault path referenced in: ${hits.join(', ')}`);
});
```

- [ ] **Step 5: Run the test to verify it passes on the current tree**

Run: `node --test tools/privacy.test.mjs`
Expected: PASS, 2 tests. (This guard runs green now and must stay green; it fails the moment a phone number is pasted in.)

- [ ] **Step 6: Prove the guard actually catches a violation**

Read the real number out of the vault CV at runtime rather than typing it here — this
document is published, and the guard now scans `docs/` precisely so that it cannot contain
the number:

```bash
CV="$VAULT/Professional-Documents/CV/Musaad | Front-end.pdf"
PHONE=$(pdftotext "$CV" - | grep -oE '\+966[0-9 ]+' | head -1)
[ -n "$PHONE" ] || { echo "could not read the number — fix this before trusting the guard"; exit 1; }

printf 'call %s\n' "$PHONE" > ./canary.html
node --test tools/privacy.test.mjs      # expect FAIL, naming canary.html
rm ./canary.html
node --test tools/privacy.test.mjs      # expect PASS
```

A guard nobody has watched fail is not a guard. Paste both real outputs into the report.

- [ ] **Step 7: Write the supporting files**

`.gitignore`:

```
.DS_Store
*.swp
/tmp/
```

`robots.txt`:

```
User-agent: *
Allow: /
Sitemap: https://musaad-sharikh.github.io/sitemap.xml
```

`README.md`: project title, one-paragraph description, the live URL, a "Built with" line naming HTML/CSS/JS with no dependencies, a "Local preview" line (`python3 -m http.server 8000`), and a "Checks" line (`node --test`). No phone number.

- [ ] **Step 8: Commit**

```bash
git add .gitignore .nojekyll robots.txt README.md tools/
git commit -m "chore: scaffold repository with privacy guard tests"
```

---

### Task 2: Self-hosted font subsets

**Files:**
- Create: `tools/build-fonts.sh`
- Create: `assets/fonts/inter-subset.woff2`, `assets/fonts/noto-sans-arabic-subset.woff2`
- Test: `tools/fonts.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces: two WOFF2 files at the paths above, referenced by `css/tokens.css` in Task 3.

- [ ] **Step 1: Write the failing test**

Create `tools/fonts.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stat } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const BUDGET = 120 * 1024; // per-file ceiling, keeps total page weight under 300 KB

for (const name of ['inter-subset.woff2', 'noto-sans-arabic-subset.woff2']) {
  test(`${name} exists and fits the budget`, async () => {
    const info = await stat(join(ROOT, 'assets/fonts', name));
    assert.ok(info.size > 0, `${name} is empty`);
    assert.ok(info.size < BUDGET, `${name} is ${info.size} bytes, over ${BUDGET}`);
  });
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tools/fonts.test.mjs`
Expected: FAIL, both tests, `ENOENT`.

- [ ] **Step 3: Write the subsetting script**

Create `tools/build-fonts.sh` (run once; not part of deployment):

```bash
#!/usr/bin/env bash
set -euo pipefail
OUT="$(cd "$(dirname "$0")/.." && pwd)/assets/fonts"
FONTS="$HOME/.local/share/fonts"

pyftsubset "$FONTS/Inter/Inter[opsz,wght].ttf" \
  --output-file="$OUT/inter-subset.woff2" \
  --flavor=woff2 --layout-features='*' \
  --unicodes='U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+2000-206F,U+2074,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD'

pyftsubset "$FONTS/Noto_Sans_Arabic/NotoSansArabic-VariableFont_wdth,wght.ttf" \
  --output-file="$OUT/noto-sans-arabic-subset.woff2" \
  --flavor=woff2 --layout-features='*' \
  --unicodes='U+0000-00FF,U+0600-06FF,U+0750-077F,U+08A0-08FF,U+FB50-FDFF,U+FE70-FEFF,U+200C-200F,U+2000-206F,U+FEFF'

ls -l "$OUT"
```

Both source fonts are variable, so a single file per script covers the whole weight range.
`--layout-features='*'` is mandatory for the Arabic font — dropping it would break contextual
shaping and the text would render as disconnected letterforms.

**Invocation:** Fedora ships `fonttools` as a module without the `pyftsubset` console script,
so call it as `python3 -m fontTools.subset` with the same flags.

**Budget:** the literal ranges above yield a 321 KB Arabic file, well over the 120 KB per-file
ceiling. Getting under it requires pinning the unused `wdth` axis and dropping the Latin and
Presentation-Forms-A codepoints from the *embedded glyphs*. Whatever you drop from the glyphs
must also come out of the CSS `unicode-range` — a face that claims a codepoint it cannot render
draws tofu instead of falling back.

The matching `unicode-range` descriptors go in `css/tokens.css` in Task 3, so that a reader on
the English page never downloads the Arabic face and vice versa.

- [ ] **Step 4: Run the script and the test**

Run: `chmod +x tools/build-fonts.sh && ./tools/build-fonts.sh && node --test tools/fonts.test.mjs`
Expected: PASS, both tests.

- [ ] **Step 5: Visually confirm Arabic shaping**

Create a throwaway `/tmp/shape.html` that `@font-face`s the Arabic subset and renders
`مساعد محمد — مهندس واجهات أمامية`. Open it in a browser. Letters must be joined and
correctly formed. If they are disconnected, the subset dropped layout features — rerun Step 3.
Delete `/tmp/shape.html` afterwards.

- [ ] **Step 6: Commit** *(pause for user authorization)*

```bash
git add tools/build-fonts.sh tools/fonts.test.mjs assets/fonts/
git commit -m "build: add self-hosted Inter and Noto Sans Arabic subsets"
```

---

### Task 3: Design tokens with an automated contrast gate

**Files:**
- Create: `css/tokens.css`
- Create: `tools/lib/css.mjs`
- Test: `tools/contrast.test.mjs`

**Interfaces:**
- Consumes: `assets/fonts/*.woff2` from Task 2.
- Produces:
  - `parseCustomProperties(css, selector): Map<string, string>` from `tools/lib/css.mjs`.
  - `contrastRatio(hexA, hexB): number` from `tools/lib/css.mjs`.
  - CSS custom properties consumed by every later CSS and demo task:
    `--color-bg`, `--color-surface`, `--color-text`, `--color-text-muted`,
    `--color-accent`, `--color-on-accent`, `--color-border`, `--color-border-strong`,
    `--color-focus`, `--space-1` … `--space-8`, `--text-sm` … `--text-3xl`,
    `--radius-sm`, `--radius-md`, `--radius-lg`, `--shadow-1`, `--duration-fast`, `--measure`.

`--color-border` is decorative (hairlines, section rules) and carries no contrast floor.
`--color-border-strong` is for boundaries that are the only signal a control exists — input
outlines, secondary-button edges — and is gated at 3:1. Using the wrong one is the single
easiest way to fail the contrast test in a later task.

- [ ] **Step 1: Write the CSS parsing and contrast helpers**

Create `tools/lib/css.mjs`:

```js
/** Custom properties declared inside the block for `selector`. */
export function parseCustomProperties(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  if (!block) throw new Error(`selector not found: ${selector}`);
  const props = new Map();
  for (const m of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    props.set(m[1], m[2].trim());
  }
  return props;
}

/** Both halves of a `light-dark(#aaa, #bbb)` declaration. */
export function splitLightDark(value) {
  const m = /^light-dark\(\s*(#[0-9a-fA-F]{3,8})\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)$/.exec(value.trim());
  if (!m) throw new Error(`expected light-dark(<hex>, <hex>), got: ${value}`);
  return { light: m[1], dark: m[2] };
}

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio, 1–21. */
export function contrastRatio(hexA, hexB) {
  const [a, b] = [luminance(hexA), luminance(hexB)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
```

- [ ] **Step 2: Write the failing contrast test**

Create `tools/contrast.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { parseCustomProperties, contrastRatio, splitLightDark } from './lib/css.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// [foreground, background, minimum ratio, what it is]
//
// Accent is gated at 4.5 rather than 3.0: it colours links set in running body text,
// which do not qualify for the large-text exemption.
// --color-border is absent by design — it is decorative, and WCAG 1.4.11 does not
// apply to it. Functional boundaries use --color-border-strong, which is gated.
const PAIRS = [
  ['--color-text', '--color-bg', 4.5, 'body text on page background'],
  ['--color-text', '--color-surface', 4.5, 'body text on card surface'],
  ['--color-text-muted', '--color-bg', 4.5, 'muted text on page background'],
  ['--color-text-muted', '--color-surface', 4.5, 'muted text on card surface'],
  ['--color-on-accent', '--color-accent', 4.5, 'label on accent button'],
  ['--color-accent', '--color-bg', 4.5, 'accent link on page background'],
  ['--color-accent', '--color-surface', 4.5, 'accent link on card surface'],
  ['--color-border-strong', '--color-bg', 3.0, 'control boundary on page background'],
  ['--color-border-strong', '--color-surface', 3.0, 'control boundary on card surface'],
  ['--color-focus', '--color-bg', 3.0, 'focus ring on page background'],
  ['--color-focus', '--color-surface', 3.0, 'focus ring on card surface'],
];

const css = await readFile(join(ROOT, 'css/tokens.css'), 'utf8');

// Every colour token is a single light-dark() declaration in :root, so both themes
// are read from one place and cannot drift apart.
const props = parseCustomProperties(css, ':root');

for (const theme of ['light', 'dark']) {
  for (const [fg, bg, min, label] of PAIRS) {
    test(`${theme}: ${label} meets ${min}:1`, () => {
      const rawFg = props.get(fg);
      const rawBg = props.get(bg);
      assert.ok(rawFg, `missing token: ${fg}`);
      assert.ok(rawBg, `missing token: ${bg}`);
      const ratio = contrastRatio(splitLightDark(rawFg)[theme], splitLightDark(rawBg)[theme]);
      assert.ok(ratio >= min, `${label} is ${ratio.toFixed(2)}:1, needs ${min}:1`);
    });
  }
}
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node --test tools/contrast.test.mjs`
Expected: FAIL, `ENOENT` on `css/tokens.css`.

- [ ] **Step 4: Write the token file**

Create `css/tokens.css`. It contains, in order: the two `@font-face` blocks; a single `:root`
block declaring every colour once via `light-dark()` alongside the type, space, radius and
motion scales; and two one-line `[data-theme]` rules that override nothing but `color-scheme`.

There is no `@media (prefers-color-scheme: dark)` block and no second copy of the palette.
`color-scheme: light dark` on `:root` makes the OS preference the default, and setting
`data-theme` on `<html>` overrides it — `light-dark()` then resolves every token accordingly.
`light-dark()` is supported in Chrome 123+, Safari 17.5+, and Firefox 120+.

```css
/* unicode-range is load-bearing: it stops the English page from ever fetching the
   Arabic face, and stops the Arabic page from fetching Inter for anything but the
   Latin runs embedded in Arabic sentences. */
@font-face {
  font-family: 'Inter';
  src: url('../assets/fonts/inter-subset.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
  unicode-range: U+0000-00FF, U+0131, U+0152-0153, U+02BB-02BC, U+2000-206F, U+2074,
                 U+20AC, U+2122, U+2191, U+2193, U+2212, U+2215, U+FEFF, U+FFFD;
}

@font-face {
  font-family: 'Noto Sans Arabic';
  src: url('../assets/fonts/noto-sans-arabic-subset.woff2') format('woff2-variations');
  font-weight: 100 900;
  font-display: swap;
  unicode-range: U+0600-06FF, U+0750-077F, U+08A0-08FF, U+200C-200F, U+FB50-FDFF, U+FE70-FEFF;
}

:root {
  /* Declaring both schemes lets light-dark() resolve, and lets [data-theme] override
     it by changing nothing but color-scheme. Every colour is stated once, so the two
     themes cannot drift apart. */
  color-scheme: light dark;

  --color-bg:            light-dark(#ffffff, #101216);
  --color-surface:       light-dark(#f6f7f9, #191c22);
  --color-text:          light-dark(#16181d, #e9ecf1);
  --color-text-muted:    light-dark(#5b6270, #a3abb9);
  --color-accent:        light-dark(#1c5fd6, #7aa7ff);
  --color-on-accent:     light-dark(#ffffff, #0d1017);
  --color-border:        light-dark(#d9dde4, #2a303a); /* decorative — no contrast floor */
  --color-border-strong: light-dark(#767e8c, #666e7c); /* control boundaries — gated at 3:1 */
  --color-focus:         light-dark(#1c5fd6, #7aa7ff);

  --font-latin: 'Inter', system-ui, -apple-system, 'Segoe UI', sans-serif;
  --font-arabic: 'Noto Sans Arabic', 'Segoe UI', Tahoma, sans-serif;

  --text-sm: clamp(0.82rem, 0.79rem + 0.14vw, 0.9rem);
  --text-base: clamp(1rem, 0.96rem + 0.2vw, 1.08rem);
  --text-lg: clamp(1.16rem, 1.08rem + 0.4vw, 1.35rem);
  --text-xl: clamp(1.4rem, 1.25rem + 0.75vw, 1.85rem);
  --text-2xl: clamp(1.75rem, 1.45rem + 1.5vw, 2.6rem);
  --text-3xl: clamp(2.25rem, 1.7rem + 2.75vw, 4rem);

  --space-1: 0.25rem;
  --space-2: 0.5rem;
  --space-3: 0.75rem;
  --space-4: 1rem;
  --space-5: 1.5rem;
  --space-6: 2rem;
  --space-7: 3rem;
  --space-8: 4.5rem;

  --radius-sm: 6px;
  --radius-md: 10px;
  --radius-lg: 16px;
  --shadow-1: 0 1px 2px rgb(0 0 0 / 6%), 0 4px 16px rgb(0 0 0 / 6%);
  --duration-fast: 160ms;

  --measure: 68ch;
}

/* An explicit choice is expressed purely as a color-scheme override. No colour is
   restated, so there is no second copy of the palette to keep in sync. With no
   [data-theme] present, color-scheme: light dark means the OS preference wins. */
:root[data-theme='light'] { color-scheme: light; }
:root[data-theme='dark']  { color-scheme: dark; }

```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tools/contrast.test.mjs`
Expected: PASS, 22 tests. If any pair fails, adjust the offending hex value in `tokens.css` and
rerun — do not relax the threshold in the test.

For reference, the values above were measured during planning and have this headroom:
light theme text/bg 17.76:1, muted/bg 6.13:1, accent/bg 5.74:1, border-strong/surface 3.82:1;
dark theme text/bg 15.83:1, muted/bg 8.11:1, accent/bg 7.86:1, border-strong/surface 3.32:1.

- [ ] **Step 6: Commit** *(pause for user authorization)*

```bash
git add css/tokens.css tools/lib/css.mjs tools/contrast.test.mjs
git commit -m "feat: add design tokens with automated WCAG contrast gate"
```

---

### Task 4: Base stylesheet and the logical-properties gate

**Files:**
- Create: `css/base.css`
- Test: `tools/logical-css.test.mjs`

**Interfaces:**
- Consumes: tokens from Task 3.
- Produces: utility classes consumed by every later markup task — `.skip-link`, `.container`,
  `.visually-hidden`, `.stack`, `.section`, `.section__title`.

- [ ] **Step 1: Write the failing logical-properties test**

Create `tools/logical-css.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readAllFiles } from './lib/html.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

const PHYSICAL = /\b(margin|padding|border)-(left|right)\b|(?<![\w-])(left|right)\s*:|text-align\s*:\s*(left|right)\b/;

test('stylesheets use logical properties only', async () => {
  const files = (await readAllFiles(ROOT)).filter((f) => f.path.endsWith('.css'));
  assert.ok(files.length > 0, 'no stylesheets found');

  const offenders = [];
  for (const file of files) {
    file.text.split('\n').forEach((line, i) => {
      if (PHYSICAL.test(line) && !line.includes('physical-ok:')) {
        offenders.push(`${file.path}:${i + 1}: ${line.trim()}`);
      }
    });
  }
  assert.deepEqual(offenders, [], `physical properties without justification:\n${offenders.join('\n')}`);
});
```

- [ ] **Step 2: Run it to verify it fails**

`css/tokens.css` already exists and is clean, so this gate passes on the current tree. A gate
that has never been seen to fail is not a gate — prove it bites before trusting it:

```bash
printf '\n.canary { margin-left: 10px; }\n' >> css/tokens.css
node --test tools/logical-css.test.mjs   # expect FAIL, naming css/tokens.css and the line number
git checkout -- css/tokens.css 2>/dev/null || sed -i '/\.canary/d' css/tokens.css
node --test tools/logical-css.test.mjs   # expect PASS
```

Then confirm the escape hatch works: `.canary { margin-left: 10px; /* physical-ok: test */ }`
must PASS. Remove it afterwards.

- [ ] **Step 3: Write the base stylesheet**

Create `css/base.css` with, at minimum:

```css
*, *::before, *::after { box-sizing: border-box; }

body {
  margin: 0;
  background: var(--color-bg);
  color: var(--color-text);
  font-family: var(--font-latin);
  font-size: var(--text-base);
  line-height: 1.65;
  -webkit-font-smoothing: antialiased;
}

/* Arabic sits visually smaller than Latin at the same nominal size. */
:root[lang='ar'] body {
  font-family: var(--font-arabic);
  font-size: calc(var(--text-base) * 1.08);
  line-height: 1.9;
}

:where(a) { color: var(--color-accent); }

:where(h1, h2, h3) { line-height: 1.2; text-wrap: balance; }

:where(p) { max-inline-size: var(--measure); text-wrap: pretty; }

:focus-visible {
  outline: 3px solid var(--color-focus);
  outline-offset: 2px;
  border-radius: var(--radius-sm);
}

.visually-hidden {
  position: absolute;
  inline-size: 1px;
  block-size: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

.skip-link {
  position: absolute;
  inset-block-start: var(--space-2);
  inset-inline-start: var(--space-2);
  z-index: 10;
  padding: var(--space-2) var(--space-4);
  background: var(--color-accent);
  color: var(--color-on-accent);
  border-radius: var(--radius-sm);
  transform: translateY(-200%);
}

.skip-link:focus-visible { transform: none; }

.container {
  inline-size: min(100% - var(--space-5) * 2, 72rem);
  margin-inline: auto;
}

.section { padding-block: var(--space-8); }

.section__title {
  font-size: var(--text-xl);
  margin-block: 0 var(--space-5);
  padding-block-end: var(--space-2);
  border-block-end: 1px solid var(--color-border);
}

@media (prefers-reduced-motion: reduce) {
  *, *::before, *::after {
    animation-duration: 0.01ms !important;
    animation-iteration-count: 1 !important;
    transition-duration: 0.01ms !important;
    scroll-behavior: auto !important;
  }
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/logical-css.test.mjs`
Expected: PASS.

- [ ] **Step 5: Commit** *(pause for user authorization)*

```bash
git add css/base.css tools/logical-css.test.mjs
git commit -m "feat: add base stylesheet with logical-properties gate"
```

---

### Task 5: Language engine

**Files:**
- Create: `js/i18n.js`
- Test: `tools/i18n.test.mjs`

**Interfaces:**
- Consumes: nothing.
- Produces, all imported by Tasks 6–13:
  - `LANGS: readonly ['en', 'ar']`
  - `DEFAULT_LANG: 'en'`
  - `STORAGE_KEY: 'portfolio:lang'`
  - `resolveLanguage({ search?: string, stored?: string | null }): 'en' | 'ar'`
  - `oppositeOf(lang: 'en'|'ar'): 'en'|'ar'`
  - `createI18n({ root: Document, dictionary: Record<string,string>, statusEl?: Element }): { apply(lang): void, current(): 'en'|'ar', toggle(): 'en'|'ar', boot(): void }`
  - `mountLanguageToggle({ button, i18n }): void`

`root` is always the `document`. It is a parameter rather than a global so the module imports
cleanly in Node for unit testing — every DOM reference must sit inside a function body, never at
module scope.

- [ ] **Step 1: Write the failing unit test**

Create `tools/i18n.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveLanguage, oppositeOf, LANGS, DEFAULT_LANG } from '../js/i18n.js';

test('query parameter wins over storage', () => {
  assert.equal(resolveLanguage({ search: '?lang=ar', stored: 'en' }), 'ar');
  assert.equal(resolveLanguage({ search: '?lang=en', stored: 'ar' }), 'en');
});

test('storage is used when no query parameter is present', () => {
  assert.equal(resolveLanguage({ search: '', stored: 'ar' }), 'ar');
});

test('unknown values fall back to the default', () => {
  assert.equal(resolveLanguage({ search: '?lang=fr', stored: null }), DEFAULT_LANG);
  assert.equal(resolveLanguage({ search: '', stored: 'klingon' }), DEFAULT_LANG);
  assert.equal(resolveLanguage({}), DEFAULT_LANG);
});

test('oppositeOf flips between the two supported languages', () => {
  assert.equal(oppositeOf('en'), 'ar');
  assert.equal(oppositeOf('ar'), 'en');
});

test('exactly two languages are supported', () => {
  assert.deepEqual([...LANGS], ['en', 'ar']);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tools/i18n.test.mjs`
Expected: FAIL — cannot resolve `../js/i18n.js`.

- [ ] **Step 3: Write the engine**

Create `js/i18n.js`. The module must be importable in Node with no DOM present, so every
DOM reference sits inside a function body, never at module scope.

```js
export const LANGS = Object.freeze(['en', 'ar']);
export const DEFAULT_LANG = 'en';
export const STORAGE_KEY = 'portfolio:lang';

const DIR = { en: 'ltr', ar: 'rtl' };

export function oppositeOf(lang) {
  return lang === 'ar' ? 'en' : 'ar';
}

export function resolveLanguage({ search = '', stored = null } = {}) {
  const queried = new URLSearchParams(search).get('lang');
  if (LANGS.includes(queried)) return queried;
  if (LANGS.includes(stored)) return stored;
  return DEFAULT_LANG;
}

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // private browsing, storage disabled
  }
}

function writeStored(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* non-fatal */
  }
}

export function createI18n({ root, dictionary, statusEl = null }) {
  // English originals, captured once from the served HTML.
  const originals = new Map();
  let current = DEFAULT_LANG;

  function cache(node, prop, value) {
    const bucket = originals.get(node) ?? {};
    if (!(prop in bucket)) {
      bucket[prop] = value;
      originals.set(node, bucket);
    }
  }

  function applyText(lang) {
    for (const node of root.querySelectorAll('[data-i18n]')) {
      const key = node.dataset.i18n;
      cache(node, 'text', node.textContent);
      node.textContent = lang === 'ar' ? (dictionary[key] ?? originals.get(node).text)
                                       : originals.get(node).text;
    }
  }

  function applyAttrs(lang) {
    // data-i18n-attr="aria-label:nav.menu, title:nav.menuTitle"
    for (const node of root.querySelectorAll('[data-i18n-attr]')) {
      for (const pair of node.dataset.i18nAttr.split(',')) {
        const [attr, key] = pair.split(':').map((s) => s.trim());
        if (!attr || !key) continue;
        cache(node, attr, node.getAttribute(attr) ?? '');
        node.setAttribute(attr, lang === 'ar' ? (dictionary[key] ?? originals.get(node)[attr])
                                              : originals.get(node)[attr]);
      }
    }
  }

  function apply(lang) {
    current = LANGS.includes(lang) ? lang : DEFAULT_LANG;
    const el = root.documentElement;
    el.lang = current;
    el.dir = DIR[current];
    applyText(current);
    applyAttrs(current);
    writeStored(current);

    const url = new URL(root.location.href);
    url.searchParams.set('lang', current);
    history.replaceState(null, '', url);

    if (statusEl) {
      statusEl.textContent = current === 'ar' ? 'تم تغيير اللغة إلى العربية'
                                              : 'Language changed to English';
    }
    root.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: current } }));
  }

  return {
    apply,
    current: () => current,
    toggle() {
      apply(oppositeOf(current));
      return current;
    },
    boot() {
      apply(resolveLanguage({ search: root.location.search, stored: readStored() }));
    },
  };
}

export function mountLanguageToggle({ button, i18n }) {
  const sync = () => {
    const lang = i18n.current();
    button.setAttribute('aria-pressed', String(lang === 'ar'));
    // The button always advertises the language it switches TO.
    button.textContent = lang === 'ar' ? 'EN' : 'ع';
    button.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
  };
  button.addEventListener('click', () => { i18n.toggle(); sync(); });
  document.addEventListener('languagechange', sync);
  sync();
}
```

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/i18n.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 5: Commit** *(pause for user authorization)*

```bash
git add js/i18n.js tools/i18n.test.mjs
git commit -m "feat: add bilingual language engine with unit tests"
```

---

### Task 6: Main page markup and English content

**Files:**
- Create: `index.html`
- Modify: `css/components.css` (create)

**Interfaces:**
- Consumes: `css/tokens.css`, `css/base.css`, `js/i18n.js`.
- Produces: the `data-i18n` key namespace consumed by Task 7 — `hero.*`, `nav.*`,
  `exp.*`, `work.*`, `skills.*`, `certs.*`, `langs.*`, `footer.*`.

- [ ] **Step 1: Write the document skeleton**

`index.html` starts with `<!doctype html><html lang="en" dir="ltr">`, `<meta charset>`,
`<meta name="viewport" content="width=device-width, initial-scale=1">`, a `<title>` of
`Musaad Muhammad — Design Engineer, Front-End & UI`, a `<meta name="description">`, the three
stylesheets, and `<script type="module" src="js/main.js"></script>` with no `defer` needed.

A blocking inline script in `<head>` sets `documentElement.dataset.theme` and `lang`/`dir` from
storage before first paint, to avoid a flash of the wrong theme or direction:

```html
<script>
  try {
    const t = localStorage.getItem('portfolio:theme');
    if (t) document.documentElement.dataset.theme = t;
    const q = new URLSearchParams(location.search).get('lang');
    const l = q === 'ar' || q === 'en' ? q : localStorage.getItem('portfolio:lang');
    if (l === 'ar') { document.documentElement.lang = 'ar'; document.documentElement.dir = 'rtl'; }
  } catch {}
</script>
```

- [ ] **Step 2: Write the body structure**

Order: `.skip-link` → `<header>` with `<nav>` (anchor links to each section, language toggle
button, theme toggle button) → `<main id="main">` holding the seven sections → `<footer>` →
a `<div class="visually-hidden" role="status" aria-live="polite" id="i18n-status"></div>`.

Every section is `<section class="section" aria-labelledby="<id>-title">` with an
`<h2 class="section__title" id="<id>-title" data-i18n="<key>">`.

Every user-visible text node carries `data-i18n`. Icon-only buttons carry
`data-i18n-attr="aria-label:<key>"`.

- [ ] **Step 3: Fill in the English copy verbatim**

Hero `<h1 data-i18n="hero.name">Musaad Muhammad</h1>`, tagline
`Design Engineer · Front-End & UI`, and the summary paragraph exactly as it reads in the CV:

> I'm a UI designer who learned to build what I design. After seven years designing web interfaces, I now write the front-end too — HTML, CSS, and JavaScript — so I can take a screen from a Figma file all the way to a working page. I'm most useful where design and front-end meet: component libraries, prototypes, and clean hand-offs.

Hero actions: `mailto:musaad.sharikh@gmail.com`, `https://linkedin.com/in/musaad-muhammad`,
`https://github.com/musaad-sharikh`, and a CV download link whose `href` is
`assets/cv/Musaad-Muhammad-CV-EN.pdf`, carrying
`data-i18n-attr="href:cv.href"` so Task 7 can point it at the Arabic PDF.

External links get `rel="noopener"`. Do not add `target="_blank"` — it removes the reader's
choice and is a minor accessibility annoyance.

Experience, Skills, Certifications, and Languages sections reproduce the CV bullets verbatim.
Skills use the CV's three group labels: Front-End; Design & Systems; Tools.

Work section: three cards, one per demo, each with a title, a one-sentence description, the
badge text `Personal concept project — not client work`, a link to the demo, and a link to its
source folder on GitHub. Cards are written now and point at `demos/<name>/`; the demos
themselves land in Tasks 11–13.

- [ ] **Step 4: Write the shared component styles**

Create `css/components.css` covering: `.nav`, `.nav__list`, `.toggle` (the two toggle buttons,
minimum 44×44px target), `.hero`, `.actions`, `.card`, `.badge`, `.timeline`, `.timeline__role`
(role and date on one row, date aligned to the inline-end edge via
`justify-content: space-between`, wrapping to two lines under 30rem), `.tag-list`, `.footer`.
Logical properties only.

- [ ] **Step 5: Serve and check**

Run: `python3 -m http.server 8000` and open `http://localhost:8000`.
Expected: the full page renders in English, correctly typeset, in light and dark, with no
console errors. The toggles do nothing yet — that is Tasks 7 and 8.

- [ ] **Step 6: Run every test**

Run: `node --test`
Expected: PASS, all suites. The privacy test now scans real content.

- [ ] **Step 7: Commit** *(pause for user authorization)*

```bash
git add index.html css/components.css
git commit -m "feat: add main page structure and English content"
```

---

### Task 7: Arabic dictionary and the key-parity gate

**Files:**
- Create: `i18n/ar.js`
- Modify: `tools/i18n.test.mjs` (append the parity suite)

**Interfaces:**
- Consumes: `data-i18n` keys from Task 6; `extractI18nKeys` from Task 1.
- Produces: `export default { ... }` — a flat `Record<string,string>` keyed identically to the
  page's `data-i18n` attributes. Tasks 11–13 create sibling dictionaries with the same shape.

- [ ] **Step 1: Write the failing parity test**

Append to `tools/i18n.test.mjs`:

```js
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { extractI18nKeys } from './lib/html.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// [html file, arabic dictionary module]
const PAGES = [
  ['index.html', 'i18n/ar.js'],
  ['demos/components/index.html', 'demos/components/ar.js'],
  ['demos/commerce/index.html', 'demos/commerce/ar.js'],
  ['demos/dashboard/index.html', 'demos/dashboard/ar.js'],
];

for (const [htmlPath, dictPath] of PAGES) {
  test(`${htmlPath}: every key has an Arabic translation`, async (t) => {
    let html;
    try {
      html = await readFile(join(ROOT, htmlPath), 'utf8');
    } catch {
      t.skip(`${htmlPath} not built yet`);
      return;
    }
    const dict = (await import(join(ROOT, dictPath))).default;
    const htmlKeys = extractI18nKeys(html);
    const dictKeys = new Set(Object.keys(dict));

    const missing = [...htmlKeys].filter((k) => !dictKeys.has(k));
    const orphaned = [...dictKeys].filter((k) => !htmlKeys.has(k));

    assert.deepEqual(missing, [], `no Arabic for: ${missing.join(', ')}`);
    assert.deepEqual(orphaned, [], `Arabic with no markup: ${orphaned.join(', ')}`);
    assert.ok(htmlKeys.size > 0, `${htmlPath} has no data-i18n keys`);
  });

  test(`${htmlPath}: Arabic values are actually Arabic`, async (t) => {
    let dict;
    try {
      dict = (await import(join(ROOT, dictPath))).default;
    } catch {
      t.skip(`${dictPath} not built yet`);
      return;
    }
    // Keys whose value is legitimately Latin-only (URLs, brand names, email).
    const LATIN_OK = /^(cv\.href|.*\.url|.*\.email)$/;
    const wrong = Object.entries(dict)
      .filter(([k, v]) => !LATIN_OK.test(k) && !/[؀-ۿ]/.test(v))
      .map(([k]) => k);
    assert.deepEqual(wrong, [], `untranslated (no Arabic script): ${wrong.join(', ')}`);
  });
}
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tools/i18n.test.mjs`
Expected: FAIL on `index.html` — `i18n/ar.js` cannot be resolved. The three demo pages skip.

- [ ] **Step 3: Write the Arabic dictionary**

Create `i18n/ar.js` as `export default { ... }`. Values come verbatim from
`build_cv_ar.py`. Reference values (transcribed from the Arabic CV source):

```js
export default {
  'hero.name': 'مساعد محمد',
  'hero.title': 'مهندس واجهات أمامية ومصمّم تجربة المستخدم',
  'hero.summary':
    'مصمّم واجهات يمتدّ عمله إلى تطوير الواجهة الأمامية. بعد سبع سنوات في تصميم واجهات الويب، ' +
    'أصبحتُ أُبرمج ما أُصمّمه باستخدام HTML وCSS وJavaScript، بما يتيح نقل التصميم من Figma إلى ' +
    'صفحة متكاملة جاهزة للعمل. وتتركّز خبرتي عند نقطة التقاء التصميم والتطوير: بناء مكتبات المكوّنات، ' +
    'وإعداد النماذج التفاعلية، وتسليم تصاميم دقيقة قابلة للتنفيذ مباشرةً.',
  'exp.title': 'الخبرة العملية',
  'exp.adawliah.role': 'مصمّم واجهات (UX/UI) — aDawliah',
  'exp.adawliah.b1':
    'صمّمتُ أكثر من 70 شاشة ومخطّطًا أوّليًا في Figma لمنتجات التجارة الإلكترونية ولوحات التحكّم، ' +
    'مع إعداد المواصفات التي اعتمد عليها المطوّرون في التنفيذ.',
  'exp.adawliah.b2':
    'أنشأتُ أوّل مكتبة مكوّنات موحّدة للفريق في Figma، ما خفّض دورات المراجعة بين التصميم والتطوير بنحو 30%.',
  'exp.adawliah.b3':
    'تعاونتُ مباشرةً مع مطوّري الواجهة الأمامية لتحويل المخطّطات إلى نماذج تفاعلية قابلة للاستخدام.',
  'exp.freelance.role': 'مصمّم واجهات مستقل ومطوّر واجهات أمامية',
  'exp.freelance.b1':
    'نفّذتُ أكثر من 5 مشاريع لشركات صغيرة وناشئة، من الفكرة الأولى حتى إطلاق الموقع، متولّيًا التصميم والتطوير معًا.',
  'exp.freelance.b2':
    'برمجتُ تخطيطات متجاوبة يدويًا باستخدام HTML وCSS، وسلّمتُ كل مشروع خلال أسبوعين.',
  'skills.title': 'اللغات والتقنيات',
  'skills.frontend.label': 'تطوير الواجهات الأمامية',
  'skills.design.label': 'التصميم والأنظمة',
  'skills.tools.label': 'الأدوات',
  'certs.title': 'الشهادات',
  'certs.meta': 'البرمجة بلغة JavaScript — Meta (Coursera، 2025)',
  'certs.tuwaiq': 'JavaScript 101 — أكاديمية طويق، منصّة سطر (2025)',
  'certs.fcc': 'تصميم ويب متجاوب — freeCodeCamp (2024)',
  'certs.ixdf': 'تصميم تجربة المستخدم — Interaction Design Foundation (2024)',
  'langs.title': 'اللغات',
  'langs.body': 'العربية (اللغة الأم) · الإنجليزية (إجادة مهنية في بيئة العمل — STEP 66، قياس 2022)',
  'work.badge': 'مشروع شخصي تجريبي — وليس عملاً لعميل',
  'cv.href': 'assets/cv/Musaad-Muhammad-CV-AR.pdf',
  // …one entry per remaining data-i18n key in index.html
};
```

Every remaining key from Task 6 — navigation labels, section titles, action labels, work-card
titles and descriptions, footer text — gets an entry. Nothing may be left in English.

- [ ] **Step 4: Wrap Latin runs inside Arabic strings**

Where an Arabic value embeds a Latin token (`HTML`, `CSS`, `JavaScript`, `Figma`, `aDawliah`,
`Meta`, `Coursera`, `freeCodeCamp`, `WCAG`, `STEP`), the dictionary supplies a second entry
under the same key with a `#html` suffix, whose value wraps each Latin run in
`<span lang="en" dir="ltr">…</span>`.

Modify `applyText` in `js/i18n.js`. **Order matters** — the English original must be cached
before any early exit, or switching back to English will restore nothing:

```js
function applyText(lang) {
  for (const node of root.querySelectorAll('[data-i18n]')) {
    const key = node.dataset.i18n;
    cache(node, 'text', node.textContent);   // always first
    const original = originals.get(node).text;

    if (lang !== 'ar') { node.textContent = original; continue; }

    const rich = dictionary[`${key}#html`];
    if (rich) node.innerHTML = rich;          // dictionary-only, never user input
    else node.textContent = dictionary[key] ?? original;
  }
}
```

Restoring English uses `textContent`, which discards the injected spans — correct, because the
English original never had them.

Add the `#html` keys to the parity test's allow-list so they are not reported as orphaned:

```js
const isRichVariant = (k) => k.endsWith('#html');
```

and require that every `foo#html` key has a plain `foo` sibling, so a rich variant can never be
the only translation.

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tools/i18n.test.mjs`
Expected: PASS. `index.html` parity is green; the three demo pages still skip.

- [ ] **Step 6: Verify in the browser**

Serve, click the `ع` toggle. Expected: every string flips to Arabic, the layout mirrors, the
CV download link points at the Arabic PDF, the URL gains `?lang=ar`, and a reload keeps Arabic.
Click `EN`: everything returns, including the English CV link.

- [ ] **Step 7: Commit** *(pause for user authorization)*

```bash
git add i18n/ar.js js/i18n.js tools/i18n.test.mjs
git commit -m "feat: add Arabic dictionary with key-parity gate"
```

---

### Task 8: Theme toggle

**Files:**
- Create: `js/theme.js`

**Interfaces:**
- Consumes: `[data-theme]` tokens from Task 3.
- Produces: `createTheme(): { current(): 'light'|'dark', toggle(): void, boot(): void }` and
  `mountThemeToggle({ button, theme }): void`, both imported by Tasks 9 and 11–13.
- Storage key: `portfolio:theme`.

- [ ] **Step 1: Write the module**

```js
const STORAGE_KEY = 'portfolio:theme';

function stored() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function systemPreference() {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function createTheme() {
  const el = document.documentElement;
  const apply = (theme) => {
    el.dataset.theme = theme;
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  };
  return {
    current: () => el.dataset.theme || systemPreference(),
    toggle() { apply(this.current() === 'dark' ? 'light' : 'dark'); },
    boot() { const s = stored(); if (s) apply(s); },
  };
}

// The label depends on two independent things — the theme and the language — so this
// button owns its own aria-label outright and carries no data-i18n-attr. Letting the
// i18n engine manage an attribute that another module also rewrites would corrupt the
// engine's cache of English originals.
export function mountThemeToggle({ button, theme, i18n, dictionary }) {
  const label = (key, english) =>
    i18n.current() === 'ar' ? (dictionary[key] ?? english) : english;

  const sync = () => {
    const dark = theme.current() === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute(
      'aria-label',
      dark
        ? label('theme.toLight', 'Switch to light theme')
        : label('theme.toDark', 'Switch to dark theme'),
    );
  };

  button.addEventListener('click', () => { theme.toggle(); sync(); });
  document.addEventListener('themechange', sync);
  document.addEventListener('languagechange', sync);
  sync();
}
```

- [ ] **Step 2: Add the two theme keys to `i18n/ar.js`**

```js
  'theme.toLight': 'التبديل إلى المظهر الفاتح',
  'theme.toDark': 'التبديل إلى المظهر الداكن',
```

These keys are read directly by `mountThemeToggle` and never appear as a `data-i18n` attribute
in the markup, so the parity test would otherwise flag them as orphaned. Declare them as known
dynamic keys at the top of `tools/i18n.test.mjs` and subtract them from `orphaned` before the
assertion:

```js
const DYNAMIC_KEYS = new Set(['theme.toLight', 'theme.toDark']);
```

This allow-list is the only permitted exemption. Anything else missing from the markup is a
genuine orphan and must be fixed rather than exempted.

- [ ] **Step 3: Verify**

Run: `node --test` → PASS. Serve, toggle the theme in both languages, reload, confirm
persistence and that no flash of the wrong theme occurs on load.

- [ ] **Step 4: Commit** *(pause for user authorization)*

```bash
git add js/theme.js i18n/ar.js tools/i18n.test.mjs index.html
git commit -m "feat: add persistent light/dark theme toggle"
```

---

### Task 9: Main page wiring

**Files:**
- Create: `js/main.js`

**Interfaces:**
- Consumes: `createI18n`, `mountLanguageToggle` (Task 5); `createTheme`, `mountThemeToggle`
  (Task 8); `i18n/ar.js` (Task 7).
- Produces: nothing imported elsewhere.

- [ ] **Step 1: Write the wiring module**

```js
import { createI18n, mountLanguageToggle } from './i18n.js';
import { createTheme, mountThemeToggle } from './theme.js';
import dictionary from '../i18n/ar.js';

// i18n is created before the theme toggle mounts, because the theme button's
// aria-label is written in the active language.
const i18n = createI18n({
  root: document,
  dictionary,
  statusEl: document.querySelector('#i18n-status'),
});
i18n.boot();
mountLanguageToggle({ button: document.querySelector('#lang-toggle'), i18n });

const theme = createTheme();
theme.boot();
mountThemeToggle({
  button: document.querySelector('#theme-toggle'),
  theme,
  i18n,
  dictionary,
});

// Scroll spy: mark the nav link for the section currently in view.
const links = new Map(
  [...document.querySelectorAll('.nav__list a[href^="#"]')].map((a) => [a.hash.slice(1), a]),
);
const spy = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const link = links.get(entry.target.id);
      if (!link) continue;
      link.classList.toggle('is-current', entry.isIntersecting);
      if (entry.isIntersecting) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  },
  { rootMargin: '-45% 0px -45% 0px' },
);
for (const id of links.keys()) {
  const section = document.getElementById(id);
  if (section) spy.observe(section);
}
```

- [ ] **Step 2: Verify**

Serve. Expected: both toggles work, the nav highlights the section in view, keyboard
navigation reaches every control, the skip link appears on first `Tab` and jumps to `#main`,
and the browser console is clean.

- [ ] **Step 3: Run every test**

Run: `node --test` → PASS.

- [ ] **Step 4: Commit** *(pause for user authorization)*

```bash
git add js/main.js
git commit -m "feat: wire up toggles and scroll spy on the main page"
```

---

### Task 10: Public-safe CV generation and print stylesheet

**Files:**
- Create: `tools/build-cv.py`
- Create: `assets/cv/Musaad-Muhammad-CV-EN.pdf`, `assets/cv/Musaad-Muhammad-CV-AR.pdf`
- Create: `css/print.css`
- Test: `tools/pdf.test.mjs`
- Modify: `index.html` (link the print stylesheet)

**Interfaces:**
- Consumes: `cv.href` key from Task 7.
- Produces: the two published, phone-free PDFs referenced by the hero download action.

The originals in the vault carry the phone number in their contact line. They are **not**
copied. `tools/build-cv.py` re-renders both from the same content and layout with that one
run removed. Post-processing an existing PDF is not acceptable here: text removed by a
content-stream edit generally remains recoverable, so a copy "redacted" that way would still
surrender the number to `pdftotext`.

- [ ] **Step 1: Write the failing PDF privacy test**

Create `tools/pdf.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CV_DIR = join(ROOT, 'assets/cv');

// Digits of the private number, tolerant of any separator or line break between them.
const PHONE = /9\D*6\D*6\D*5\D*1\D*2\D*3\D*0\D*2\D*7\D*2\D*5/;

const pdfs = (await readdir(CV_DIR)).filter((f) => f.endsWith('.pdf'));

test('both CV PDFs are present', () => {
  assert.deepEqual(pdfs.sort(), ['Musaad-Muhammad-CV-AR.pdf', 'Musaad-Muhammad-CV-EN.pdf']);
});

for (const pdf of pdfs) {
  test(`${pdf} contains no phone number in its text layer`, async () => {
    const { stdout } = await run('pdftotext', [join(CV_DIR, pdf), '-']);
    assert.ok(!PHONE.test(stdout), `phone number extractable from ${pdf}`);
  });

  test(`${pdf} still contains the email address`, async () => {
    const { stdout } = await run('pdftotext', [join(CV_DIR, pdf), '-']);
    assert.match(stdout, /musaad\.sharikh@gmail\.com/, `${pdf} lost its contact line`);
  });
}
```

The second assertion matters: a build that silently produced an empty or broken PDF would
otherwise pass the phone check trivially.

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tools/pdf.test.mjs`
Expected: FAIL — `assets/cv` is empty.

- [ ] **Step 3: Write the CV builder**

Create `tools/build-cv.py`. It renders both language versions in one run. Derive it from the
vault's `build_cv_en.py` and `build_cv_ar.py` — same page geometry, same styles, same content —
with exactly one deliberate difference in each: the contact line drops the phone number and the
separator that followed it.

English contact line, after the change:

```python
s.append(Paragraph(
    '<a href="mailto:musaad.sharikh@gmail.com" color="#555555">musaad.sharikh@gmail.com</a> '
    '&nbsp;·&nbsp; '
    '<a href="https://linkedin.com/in/musaad-muhammad" color="#555555"><u>LinkedIn</u></a> '
    '&nbsp;·&nbsp; '
    '<a href="https://github.com/musaad-sharikh" color="#555555"><u>GitHub</u></a>',
    contact_s))
```

Arabic contact line, after the change:

```python
s.append(Paragraph(
    '<a href="https://github.com/musaad-sharikh" color="#555555"><u>GitHub</u></a> '
    '&nbsp;·&nbsp; '
    '<a href="https://linkedin.com/in/musaad-muhammad" color="#555555"><u>LinkedIn</u></a> '
    '&nbsp;·&nbsp; '
    '<a href="mailto:musaad.sharikh@gmail.com" color="#555555">musaad.sharikh@gmail.com</a>',
    contact_s))
```

The script writes directly to `assets/cv/Musaad-Muhammad-CV-EN.pdf` and
`assets/cv/Musaad-Muhammad-CV-AR.pdf`. The Arabic renderer needs
`arabic_reshaper.reshape()` then `bidi.algorithm.get_display()` on every Arabic string, and
registers `NotoSansArabic-Regular.ttf` and `-Bold.ttf` from
`~/.local/share/fonts/Noto_Sans_Arabic/static/`. Make that directory overridable with a
`NOTO_ARABIC_DIR` environment variable, defaulting to that path, so the script is reproducible
on another machine.

Add a hard self-check at the end of the script — a build that reintroduces the number should
fail loudly rather than ship:

```python
import re

# No country code, no digit run long enough to be a phone number, in either contact line.
PHONEY = re.compile(r"\+?\s*9\s*6\s*6|\d[\d\s-]{7,}")
for label, src in (("EN", EN_CONTACT), ("AR", AR_CONTACT)):
    assert not PHONEY.search(src), f"{label} contact line looks like it carries a phone number"
```

- [ ] **Step 4: Build the PDFs from a virtual environment outside the repository**

`reportlab`, `arabic-reshaper`, and `python-bidi` are not installed system-wide. Create the
environment in the session scratchpad, never inside the repository:

```bash
VENV="$SCRATCH/cvenv"          # session scratchpad, outside the repo
python3 -m venv "$VENV"
"$VENV/bin/pip" install --quiet reportlab arabic-reshaper python-bidi
"$VENV/bin/python" tools/build-cv.py
ls -l assets/cv/
```

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tools/pdf.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 6: Confirm both PDFs by eye**

Open each in a PDF viewer. Expected: the EN file is the English CV and the AR file is the
Arabic CV with correctly joined letterforms; both contact lines read email · LinkedIn · GitHub
with no phone number and no leftover separator; layout is otherwise unchanged from the
originals.

- [ ] **Step 7: Write the print stylesheet**

`css/print.css`, loaded with `media="print"`. It hides `.nav`, the toggles, the skip link and
the footer links; forces `--color-bg: #fff` and `--color-text: #000`; removes shadows and
background fills; sets `a[href^="http"]::after { content: " (" attr(href) ")"; }` so links
survive on paper; and applies `break-inside: avoid` to cards and timeline entries.

- [ ] **Step 8: Verify the print output**

Print-preview the page in both languages. Expected: a clean two-page document, no navigation
chrome, Arabic still right-to-left.

- [ ] **Step 9: Run every test**

Run: `node --test` → PASS. `privacy.test.mjs` covers repository text and skips PDF bytes
as binary; `pdf.test.mjs` covers the PDFs' extracted text layer. Together they close the gap.

- [ ] **Step 10: Commit** *(pause for user authorization)*

```bash
git add assets/cv/ css/print.css index.html tools/build-cv.py tools/pdf.test.mjs
git commit -m "feat: generate phone-free CV downloads and add print stylesheet"
```

---

### Task 11: Component library demo

**Files:**
- Create: `demos/components/index.html`, `demos/components/demo.js`, `demos/components/ar.js`
- Modify: `css/components.css` (add demo-only classes)

**Interfaces:**
- Consumes: all tokens, `js/i18n.js`, `js/theme.js`.
- Produces: nothing imported elsewhere. Its `data-i18n` keys are checked by the Task 7 parity
  suite, which stops skipping once `demos/components/index.html` exists.

- [ ] **Step 1: Build the page shell**

Same `<head>` pattern as `index.html`, plus a back-link to the portfolio, the two toggles, and
a direction override control: a `<fieldset>` of two radios, `LTR` and `RTL`, that set `dir` on
the gallery container only. This lets a reviewer inspect RTL component behaviour without
switching the page language.

The visible badge `Personal concept project — not client work` sits directly under the `<h1>`.

- [ ] **Step 2: Build the component gallery**

Nine sections, each `<section aria-labelledby>` containing a rendered example and a
`<pre><code>` snippet with a copy button:

buttons (primary, secondary, ghost, disabled) · text input with label, hint, and error state ·
select · checkbox and radio groups · card · tabs · accordion · toast · modal dialog.

Tabs implement the WAI-ARIA tabs pattern: `role="tablist"`, `aria-selected`, roving `tabindex`,
`ArrowLeft`/`ArrowRight` moving selection, and **arrow direction swapped under RTL** — in RTL,
`ArrowLeft` moves to the *next* tab. This is exactly the detail that separates a real RTL
implementation from a mirrored screenshot; it must be implemented and manually verified.

The modal uses the native `<dialog>` element with `showModal()`, which gives focus trapping and
`Escape` handling from the platform. Focus returns to the trigger on close.

- [ ] **Step 3: Implement the copy-to-clipboard button**

```js
for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const code = document.getElementById(button.dataset.copy).textContent;
    try {
      await navigator.clipboard.writeText(code);
      announce(button, 'copied');
    } catch {
      announce(button, 'copyFailed');
    }
  });
}
```

`announce` writes into the page's `aria-live` status region in the active language, so the
confirmation is spoken as well as shown. Define it once at the top of `demo.js`:

```js
const status = document.querySelector('#i18n-status');

function announce(key, english) {
  const text = i18n.current() === 'ar' ? (dictionary[key] ?? english) : english;
  // Clearing first forces a re-announcement when the same message repeats.
  status.textContent = '';
  requestAnimationFrame(() => { status.textContent = text; });
}
```

Called as `announce('copy.done', 'Snippet copied')` and
`announce('copy.failed', 'Could not copy — select the snippet and copy manually')`. Both keys
go in `demos/components/ar.js` and in the `DYNAMIC_KEYS` allow-list, since neither appears as a
`data-i18n` attribute.

- [ ] **Step 4: Write the Arabic dictionary**

`demos/components/ar.js`, one key per `data-i18n` on the page, same `export default` shape.

- [ ] **Step 5: Verify**

Run: `node --test` → PASS, including the now-active parity suite for this page.

In the browser: every component renders correctly in all four combinations of
{light, dark} × {LTR, RTL}. Tab through the whole gallery — focus is always visible, the tabs
respond to arrow keys in the correct direction for the current direction, the modal traps focus
and restores it, and the toast is announced.

- [ ] **Step 6: Commit** *(pause for user authorization)*

```bash
git add demos/components/ css/components.css
git commit -m "feat: add bilingual component library demo"
```

---

### Task 12: Commerce flow demo

**Files:**
- Create: `demos/commerce/index.html`, `demos/commerce/demo.js`, `demos/commerce/ar.js`
- Create: `demos/commerce/cart.js`

**Interfaces:**
- Consumes: tokens, `js/i18n.js`, `js/theme.js`.
- Produces: `createCart(storage): { add(id, qty), setQty(id, qty), remove(id), items(), total(), subscribe(fn) }`
  from `cart.js` — a DOM-free module, unit-tested in Node.

- [ ] **Step 1: Write the failing cart test**

Create `tools/cart.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createCart } from '../demos/commerce/cart.js';

const memory = () => {
  const map = new Map();
  return { getItem: (k) => map.get(k) ?? null, setItem: (k, v) => map.set(k, v) };
};

test('adding the same product twice increments quantity', () => {
  const cart = createCart(memory());
  cart.add('p1', 1);
  cart.add('p1', 2);
  assert.deepEqual(cart.items(), [{ id: 'p1', qty: 3 }]);
});

test('setting quantity to zero removes the line', () => {
  const cart = createCart(memory());
  cart.add('p1', 2);
  cart.setQty('p1', 0);
  assert.deepEqual(cart.items(), []);
});

test('quantity is clamped to a non-negative integer', () => {
  const cart = createCart(memory());
  cart.add('p1', -5);
  assert.deepEqual(cart.items(), []);
  cart.add('p2', 2.7);
  assert.deepEqual(cart.items(), [{ id: 'p2', qty: 2 }]);
});

test('state survives a reload through storage', () => {
  const storage = memory();
  createCart(storage).add('p1', 4);
  assert.deepEqual(createCart(storage).items(), [{ id: 'p1', qty: 4 }]);
});

test('subscribers are notified on every mutation', () => {
  const cart = createCart(memory());
  let calls = 0;
  cart.subscribe(() => { calls += 1; });
  cart.add('p1', 1);
  cart.setQty('p1', 3);
  cart.remove('p1');
  assert.equal(calls, 3);
});
```

- [ ] **Step 2: Run it to verify it fails**

Run: `node --test tools/cart.test.mjs`
Expected: FAIL — cannot resolve `../demos/commerce/cart.js`.

- [ ] **Step 3: Implement `cart.js`**

A closure over an array of `{id, qty}`, persisted to the injected `storage` under
`commerce:cart` as JSON, with a subscriber list. `add` clamps with
`Math.max(0, Math.floor(qty))` and drops zero-quantity lines. Storage access is wrapped in
`try/catch` so a disabled-storage browser degrades to in-memory.

- [ ] **Step 4: Run the test to verify it passes**

Run: `node --test tools/cart.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 5: Build the page**

A product grid of eight items (synthetic products, generic names, no real brands), a cart
drawer that opens from the inline-end edge, quantity steppers, and a checkout form.

Prices render through `Intl.NumberFormat`, recomputed on `languagechange`:

```js
const money = (lang) =>
  new Intl.NumberFormat(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-SA', {
    style: 'currency',
    currency: 'SAR',
  });
```

The `-u-nu-latn` extension is required, not cosmetic. Plain `ar-SA` formats with Arabic-Indic
digits (١٢٣), which would contradict the spec's rule that numerals stay Western in both
languages — and would clash with the Western digits used in the CV content on the same page.

The drawer is a `<dialog>` so focus trapping and `Escape` come from the platform. Cart count is
mirrored into a visually-hidden `aria-live="polite"` region so additions are announced.

- [ ] **Step 6: Implement accessible form validation**

On submit, validation runs against every field. For each invalid field: set
`aria-invalid="true"`, point `aria-describedby` at its error element, and write the translated
message. Then write a summary into the `aria-live` region and move focus to the first invalid
field. Validation is bilingual — messages come from the active dictionary, not hardcoded.

Native `required`/`type` attributes stay on the fields so the form degrades correctly, but
`novalidate` is set on the `<form>` so the custom, translated messaging is what the user sees.

- [ ] **Step 7: Write `demos/commerce/ar.js`**

One key per `data-i18n`, including every validation message.

- [ ] **Step 8: Verify**

Run: `node --test` → PASS, including this page's parity suite.

In the browser: add items, edit quantities, reload and confirm the cart persists; submit an
empty form and confirm focus lands on the first invalid field with an announced message; repeat
the whole flow in Arabic and confirm the drawer opens from the correct edge and prices format
as SAR in Arabic.

- [ ] **Step 9: Commit** *(pause for user authorization)*

```bash
git add demos/commerce/ tools/cart.test.mjs
git commit -m "feat: add bilingual commerce flow demo with accessible validation"
```

---

### Task 13: Dashboard demo

**Files:**
- Create: `demos/dashboard/index.html`, `demos/dashboard/demo.js`, `demos/dashboard/charts.js`, `demos/dashboard/ar.js`

**Interfaces:**
- Consumes: tokens, `js/i18n.js`, `js/theme.js`.
- Produces: from `charts.js`, three pure functions returning SVG strings —
  `lineChart({ series, width, height, dir })`, `barChart({ data, width, height, dir })`,
  `donutChart({ data, size })`. Pure string output means they are unit-testable in Node.

- [ ] **Step 1: Invoke the dataviz skill**

Before writing any chart code, invoke the `dataviz` skill and follow its guidance for the
categorical palette, mark specs, and dashboard layout. The palette it yields must be added to
`css/tokens.css` as `--chart-1` … `--chart-5` for both themes, and added to the Task 3 contrast
test as pairs against `--color-surface` at a 3:1 minimum.

- [ ] **Step 2: Write the failing chart test**

Create `tools/charts.test.mjs`:

```js
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineChart, barChart, donutChart } from '../demos/dashboard/charts.js';

const SERIES = [{ label: 'a', points: [1, 5, 3, 8] }];

test('lineChart returns SVG sized as requested', () => {
  const svg = lineChart({ series: SERIES, width: 400, height: 200, dir: 'ltr' });
  assert.match(svg, /^<svg /);
  assert.match(svg, /viewBox="0 0 400 200"/);
});

test('charts are decorative to assistive tech — the data table is the accessible copy', () => {
  const svg = barChart({ data: [{ label: 'a', value: 3 }], width: 300, height: 150, dir: 'ltr' });
  assert.match(svg, /aria-hidden="true"/);
});

test('RTL mirrors the horizontal axis', () => {
  const ltr = lineChart({ series: SERIES, width: 400, height: 200, dir: 'ltr' });
  const rtl = lineChart({ series: SERIES, width: 400, height: 200, dir: 'rtl' });
  assert.notEqual(ltr, rtl, 'RTL output must differ from LTR');
});

test('charts colour from tokens, never from literal hex', () => {
  const svg = donutChart({ data: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }], size: 200 });
  // Scoped to paint attributes: a bare /#[0-9a-f]{3,6}/ would also match
  // legitimate internal references such as fill="url(#slice-a1b2c3)".
  assert.doesNotMatch(svg, /(?:fill|stroke|stop-color)="#/, 'use var(--chart-N), not literal hex');
  assert.match(svg, /var\(--chart-1\)/);
});

test('an empty series produces a valid empty chart, not a crash', () => {
  assert.match(barChart({ data: [], width: 300, height: 150, dir: 'ltr' }), /^<svg /);
});
```

- [ ] **Step 3: Run it to verify it fails**

Run: `node --test tools/charts.test.mjs`
Expected: FAIL — cannot resolve `../demos/dashboard/charts.js`.

- [ ] **Step 4: Implement `charts.js`**

Pure functions, no DOM, no dependencies. Each returns an SVG string with `aria-hidden="true"`
and `focusable="false"`, colouring strictly through `var(--chart-N)` so both themes work with no
JavaScript involvement. `dir: 'rtl'` reverses the x-axis ordering and anchors labels to the
opposite edge.

- [ ] **Step 5: Run the test to verify it passes**

Run: `node --test tools/charts.test.mjs`
Expected: PASS, 5 tests.

- [ ] **Step 6: Build the page**

A KPI tile row, a line chart, a bar chart, a donut chart, and a sortable data table. Each chart
sits in a `<figure>` with a `<figcaption>` and is paired with a `<details>` containing the same
data as an accessible `<table>` — so the information is never graphic-only.

A visible note states that all figures are synthetic sample data.

Charts re-render on `languagechange` (to flip direction and relabel) and need no re-render on
`themechange`, because colour comes from CSS custom properties.

- [ ] **Step 7: Write `demos/dashboard/ar.js`**

- [ ] **Step 8: Verify**

Run: `node --test` → PASS.

In the browser: charts render in both themes with adequate contrast, mirror correctly in
Arabic, the data tables expand and match the graphics, and the table sort controls are
keyboard-operable with `aria-sort` reflecting current state.

- [ ] **Step 9: Commit** *(pause for user authorization)*

```bash
git add demos/dashboard/ tools/charts.test.mjs css/tokens.css tools/contrast.test.mjs
git commit -m "feat: add bilingual dashboard demo with hand-authored SVG charts"
```

---

### Task 14: Metadata, icons, and sitemap

**Files:**
- Create: `assets/icons/favicon.svg`, `assets/icons/apple-touch-icon.png`, `sitemap.xml`
- Modify: `index.html` and all three demo `index.html` files

**Interfaces:**
- Consumes: brand colors from Task 3.
- Produces: nothing imported elsewhere.

- [ ] **Step 1: Create the favicon**

`assets/icons/favicon.svg` — an SVG monogram using `--color-accent`'s hex value, with a
`<style>` block using `prefers-color-scheme` so it adapts in the browser tab. Generate
`apple-touch-icon.png` at 180×180 from the SVG with `rsvg-convert` or ImageMagick; if neither is
installed, omit the PNG and its `<link>` rather than shipping a broken reference.

- [ ] **Step 2: Add metadata to every page**

Each page gets `<meta name="description">`, `<meta name="author" content="Musaad Muhammad">`,
`<link rel="canonical">`, `<link rel="icon">`, and Open Graph plus Twitter card tags with
`og:title`, `og:description`, `og:url`, `og:type`, and `og:locale` (`en_US`, with
`og:locale:alternate` of `ar_SA`).

Each page also gets both alternate-language links:

```html
<link rel="alternate" hreflang="en" href="https://musaad-sharikh.github.io/?lang=en">
<link rel="alternate" hreflang="ar" href="https://musaad-sharikh.github.io/?lang=ar">
<link rel="alternate" hreflang="x-default" href="https://musaad-sharikh.github.io/">
```

If no `og:image` is produced, omit the `og:image` tag entirely rather than pointing at a
missing file.

- [ ] **Step 3: Add a Person JSON-LD block to `index.html`**

`name`, `jobTitle`, `email`, `url`, and `sameAs` listing the LinkedIn and GitHub URLs. No
`telephone` property.

- [ ] **Step 4: Write `sitemap.xml`**

Four `<url>` entries: the root and the three demo pages.

- [ ] **Step 5: Verify**

Run: `node --test` → PASS, privacy test included — confirming no phone number leaked
into the JSON-LD.

Check each page's `<head>` in DevTools; confirm the favicon renders in both browser themes.

- [ ] **Step 6: Commit** *(pause for user authorization)*

```bash
git add assets/icons/ sitemap.xml index.html demos/
git commit -m "feat: add favicons, metadata, structured data, and sitemap"
```

---

### Task 15: Full verification sweep

**Files:**
- Modify: whatever the sweep turns up.

**Interfaces:**
- Consumes: everything.
- Produces: a green tree, ready to publish.

- [ ] **Step 1: Run the whole suite**

Run: `node --test`
Expected: PASS, every suite, zero skips. A skip here means a demo page is missing.

- [ ] **Step 2: Confirm the privacy constraint by hand**

```bash
CV="$VAULT/Professional-Documents/CV/Musaad | Front-end.pdf"
PHONE=$(pdftotext "$CV" - | grep -oE '\+966[0-9 ]+' | head -1)
DIGITS=$(printf '%s' "$PHONE" | tr -cd '0-9')

grep -rIn -e "$PHONE" -e "$DIGITS" . --exclude-dir=.git --exclude-dir=.superpowers \
  || echo "text clean"
for f in assets/cv/*.pdf; do
  printf -- '--- %s: ' "$f"
  pdftotext "$f" - | tr -cd '0-9' | grep -q "$DIGITS" && echo "LEAK" || echo "pdf clean"
done
```

Expected: `text clean`, and `pdf clean` for both files. Any hit is a blocker — there are no
acceptable exceptions, since `tools/lib/forbidden.mjs` stores the pattern, never the number.

- [ ] **Step 3: Keyboard-only pass**

With the mouse untouched, tab through the main page and all three demos. Confirm: skip link
first, focus always visible, logical order, every control operable, modals trap and restore
focus, no keyboard trap anywhere else.

- [ ] **Step 4: Language and direction pass**

On each of the four pages: switch to Arabic, reload, confirm persistence; check that nothing is
left in English; check that no text is clipped or overlapping in RTL; check that the CV link
points at the Arabic PDF.

- [ ] **Step 5: No-JavaScript and no-CSS pass**

Disable JavaScript: the main page must be fully readable in English. Disable CSS: DOM order
must match reading order on all four pages.

- [ ] **Step 6: Responsive pass**

Check 320px, 768px, 1280px, and 1920px widths, in both directions. No horizontal scrollbar at
any width.

- [ ] **Step 7: Preference-query pass**

Toggle OS dark mode and confirm the theme follows when no explicit choice is stored. Enable
reduced motion and confirm transitions stop.

- [ ] **Step 8: Weight check**

In DevTools with a disabled cache, confirm the main page transfers under 300 KB total.

- [ ] **Step 9: Fix and re-run**

Fix everything the sweep found, then repeat Steps 1–8 until clean.

- [ ] **Step 10: Commit** *(pause for user authorization)*

```bash
git add -- <only the files changed by this sweep>
git commit -m "fix: address findings from the full verification sweep"
```

---

### Task 16: Publish

**Files:** none created.

**Interfaces:**
- Consumes: a green tree from Task 15.
- Produces: the live site.

> **This task is blocked.** It does not begin until the owner has reviewed the finished local
> site and explicitly approved publication. Tasks 1–15 leave a complete, working site on disk
> with no remote configured and nothing pushed.

- [ ] **Step 1: Get explicit publication authorization**

This creates the account's first public repository and pushes personal content to the open web.
Confirm before proceeding, restating: repository name, visibility, the exact file list being
published, and the fact that the two CV PDFs are the regenerated phone-free versions — verified
by `pdf.test.mjs`, not assumed.

- [ ] **Step 2: Final pre-flight**

```bash
node --test tools/
git status --short
git log --oneline
```

Expected: all tests pass, working tree clean, history readable.

- [ ] **Step 3: Create the repository and push**

```bash
gh repo create musaad-sharikh.github.io --public \
  --description "Bilingual (EN/AR) portfolio — Design Engineer, Front-End & UI" \
  --source . --remote origin --push
```

- [ ] **Step 4: Enable Pages**

```bash
gh api -X POST repos/musaad-sharikh/musaad-sharikh.github.io/pages \
  -f 'source[branch]=main' -f 'source[path]=/'
```

- [ ] **Step 5: Wait for the first build and confirm it is green**

```bash
gh api repos/musaad-sharikh/musaad-sharikh.github.io/pages --jq '.status, .html_url'
```

Expected: `built` and `https://musaad-sharikh.github.io/`.

- [ ] **Step 6: Verify the live site**

Load `https://musaad-sharikh.github.io/` in a real browser. Check: fonts load, both languages
work, `?lang=ar` deep-links correctly, both CV PDFs download, all three demos load, and no
console errors or mixed-content warnings.

- [ ] **Step 7: Set the repository homepage and topics**

```bash
gh repo edit musaad-sharikh/musaad-sharikh.github.io \
  --homepage "https://musaad-sharikh.github.io" \
  --add-topic portfolio --add-topic html-css-javascript \
  --add-topic rtl --add-topic accessibility --add-topic i18n
```

---

## Self-Review

**Spec coverage.** Each spec section maps to a task: purpose and audience → Task 6; content
source of truth → Tasks 6, 7, 10; information architecture → Task 6; bilingual and RTL
architecture → Tasks 5, 7; design system → Tasks 3, 4, 6; accessibility → Tasks 4, 6, 11, 12,
13, 15; demo projects → Tasks 11, 12, 13; file layout → Tasks 1–14; performance budget →
Tasks 2, 15; deployment → Task 16; verification → Tasks 10, 15.

**Findings from the review pass, all fixed above.**

1. `--color-border` measured 1.58:1 (light) and 1.64:1 (dark) against the page background and
   would have failed its own 3:1 gate on the first run. Split into `--color-border` (decorative,
   ungated) and `--color-border-strong` (functional, gated), with values measured to pass.
2. Accent-on-background was gated at 3:1. It colours links inside running text, which get no
   large-text exemption. Raised to 4.5:1 and extended to cover the card surface.
3. The palette was declared twice — once in `[data-theme="dark"]` and again inside a
   `prefers-color-scheme` media query — which is two copies to keep in sync. Replaced with one
   `light-dark()` declaration per token; `[data-theme]` now overrides `color-scheme` alone.
4. Task 10 contradicted the spec: it copied the vault PDFs in while the spec demanded the phone
   number appear nowhere. Superseded — the PDFs are now regenerated phone-free, and
   `pdf.test.mjs` verifies the extracted text layer rather than trusting the build.
5. `mountThemeToggle` rewrote `data-i18n-attr` at runtime, which would have corrupted the i18n
   engine's cache of English originals. The theme button now owns its own `aria-label`.
6. Task 4's "verify it fails" step was self-contradictory. Rewritten as a real canary that also
   exercises the `physical-ok:` escape hatch.
7. Task 7's `#html` snippet could return before caching the English original, so switching back
   to English would have restored nothing. Cache-first ordering is now explicit.
8. Task 12 specified `ar-SA`, which yields Arabic-Indic digits and contradicts the spec's
   Western-numerals rule. Changed to `ar-SA-u-nu-latn`.
9. Task 13's "no literal hex" assertion would have false-positived on `url(#gradient-id)`.
   Scoped to paint attributes.
10. `announce()` was used in Task 11 without ever being defined. Now defined in full.
11. `createI18n`'s interface block omitted `boot()`, and `mountLanguageToggle`'s stated
    signature did not match its implementation. Both corrected.
12. Added `unicode-range` to both `@font-face` rules, so an English-only reader never downloads
    the Arabic face. This is what makes the 300 KB budget comfortable rather than borderline.

**Placeholder scan.** No `TBD`, no `implement later`, no "similar to Task N". Where a task
describes markup rather than quoting it in full (Tasks 6, 11, 12, 13), the required elements,
attributes, and ARIA patterns are enumerated explicitly and the load-bearing JavaScript is
given in full.

**Type consistency.** `createI18n` is defined in Task 5 and consumed under that name in
Tasks 9, 11, 12, 13. `resolveLanguage`, `oppositeOf`, `mountLanguageToggle`, `createTheme`,
`mountThemeToggle`, `createCart`, `lineChart`, `barChart`, `donutChart`, `readAllFiles`,
`extractI18nKeys`, `parseCustomProperties`, and `contrastRatio` each appear with the same
signature at definition and at every call site. Storage keys are `portfolio:lang`,
`portfolio:theme`, and `commerce:cart`, used consistently. Task 7 modifies `applyText` from
Task 5 for the `#html` suffix, and that modification is stated in the task that makes it.
