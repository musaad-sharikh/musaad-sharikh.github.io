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
