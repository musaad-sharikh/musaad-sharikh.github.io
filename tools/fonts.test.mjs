import { test } from 'node:test';
import assert from 'node:assert/strict';
import { stat, readFile, readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const FONT_DIR = join(ROOT, 'assets/fonts');
const BUDGET = 120 * 1024; // per-file ceiling, keeps total page weight under 300 KB

const EXPECTED = [
  'inter-subset.woff2',
  'ibm-plex-sans-arabic-400.woff2',
  'ibm-plex-sans-arabic-600.woff2',
  'ibm-plex-sans-arabic-700.woff2',
];

for (const name of EXPECTED) {
  test(`${name} exists and fits the budget`, async () => {
    const info = await stat(join(FONT_DIR, name));
    assert.ok(info.size > 0, `${name} is empty`);
    assert.ok(info.size < BUDGET, `${name} is ${info.size} bytes, over ${BUDGET}`);
  });
}

test('no orphaned font files are shipped', async () => {
  const onDisk = (await readdir(FONT_DIR)).filter((f) => f.endsWith('.woff2'));
  const orphans = onDisk.filter((f) => !EXPECTED.includes(f));
  assert.deepEqual(orphans, [], `unreferenced font files still in assets/fonts: ${orphans.join(', ')}`);
});

test('every @font-face src resolves to a file that exists', async () => {
  const css = await readFile(join(ROOT, 'css/tokens.css'), 'utf8');
  const srcs = [...css.matchAll(/url\('\.\.\/assets\/fonts\/([^']+)'\)/g)].map((m) => m[1]);
  assert.ok(srcs.length > 0, 'no @font-face src found in tokens.css');
  const onDisk = new Set(await readdir(FONT_DIR));
  const missing = srcs.filter((f) => !onDisk.has(f));
  assert.deepEqual(missing, [], `tokens.css references missing fonts: ${missing.join(', ')}`);
});

test('the Arabic face is declared at each weight the design paints', async () => {
  const css = await readFile(join(ROOT, 'css/tokens.css'), 'utf8');
  const faces = [...css.matchAll(/@font-face\s*\{[^}]*?font-family:\s*'IBM Plex Sans Arabic'[^}]*?font-weight:\s*(\d+)[^}]*?\}/g)]
    .map((m) => Number(m[1]));
  // 400 body copy, 600 UI labels, 700 headings and <th> (which default to bold).
  assert.deepEqual(faces.sort((a, b) => a - b), [400, 600, 700],
    `declared Arabic weights: ${faces.join(', ')} — a missing weight means the browser synthesises it, which distorts Arabic letterforms`);
});
