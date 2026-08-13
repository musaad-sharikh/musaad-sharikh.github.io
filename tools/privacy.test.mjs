import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readAllFiles } from './lib/html.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Digits of the private number, tolerant of any separator between them.
const PHONE = /9\D*6\D*6\D*5\D*1\D*2\D*3\D*0\D*2\D*7\D*2\D*5/;
const VAULT = /Personal-Documents/;

test('no phone number anywhere in the repository', async () => {
  const hits = (await readAllFiles(ROOT))
    .filter((f) => !f.path.includes('/docs/') && !f.path.includes('/tools/'))
    .filter((f) => PHONE.test(f.text))
    .map((f) => f.path);
  assert.deepEqual(hits, [], `phone number found in: ${hits.join(', ')}`);
});

test('no private vault paths in shipped files', async () => {
  const hits = (await readAllFiles(ROOT))
    .filter((f) => !f.path.includes('/docs/') && !f.path.includes('/tools/'))
    .filter((f) => VAULT.test(f.text))
    .map((f) => f.path);
  assert.deepEqual(hits, [], `vault path referenced in: ${hits.join(', ')}`);
});
