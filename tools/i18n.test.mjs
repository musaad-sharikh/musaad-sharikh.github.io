import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { resolveLanguage, oppositeOf, LANGS, DEFAULT_LANG } from '../js/i18n.js';
import { extractI18nKeys } from './lib/html.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

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

// [html file, arabic dictionary module]
const PAGES = [
  ['index.html', 'i18n/ar.js'],
  ['demos/components/index.html', 'demos/components/ar.js'],
  ['demos/commerce/index.html', 'demos/commerce/ar.js'],
  ['demos/dashboard/index.html', 'demos/dashboard/ar.js'],
];

const isRichVariant = (k) => k.endsWith('#html');

// Read directly by mountThemeToggle (js/theme.js) rather than via a data-i18n-attr
// in the markup, so the parity check below would otherwise flag them as orphaned.
// 'copy.done'/'copy.failed' (demos/components), 'checkout.errorSummary' and the
// three 'cart.line.*Label' keys (demos/commerce), and 'sort.ascending'/
// 'sort.descending'/'sort.announcement' (demos/dashboard) are read the same way,
// by each page's own demo.js, for text built at runtime rather than applied by
// the shared i18n engine (e.g. the sortable table's live-region announcement
// folds the already-translated column label into the sentence, which the
// engine's fixed key-per-element model can't express).
// This allow-list is the only permitted exemption — anything else missing from the
// markup is a genuine orphan and must be fixed rather than exempted.
const DYNAMIC_KEYS = new Set([
  'theme.toLight',
  'theme.toDark',
  'copy.done',
  'copy.failed',
  'cart.line.decreaseLabel',
  'cart.line.increaseLabel',
  'cart.line.removeLabel',
  'checkout.errorSummary',
  'sort.ascending',
  'sort.descending',
  'sort.announcement',
]);

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
    // #html keys are rich variants of a plain key, not markup targets of their own,
    // so they are exempt from the orphan check.
    const orphaned = [...dictKeys]
      .filter((k) => !isRichVariant(k) && !htmlKeys.has(k))
      .filter((k) => !DYNAMIC_KEYS.has(k));
    // A rich variant can never be the only translation for a key.
    const richWithoutPlain = [...dictKeys]
      .filter(isRichVariant)
      .map((k) => k.slice(0, -'#html'.length))
      .filter((base) => !dictKeys.has(base));

    assert.deepEqual(missing, [], `no Arabic for: ${missing.join(', ')}`);
    assert.deepEqual(orphaned, [], `Arabic with no markup: ${orphaned.join(', ')}`);
    assert.deepEqual(richWithoutPlain, [], `#html variant without plain sibling: ${richWithoutPlain.join(', ')}`);
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
