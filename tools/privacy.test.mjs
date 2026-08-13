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
