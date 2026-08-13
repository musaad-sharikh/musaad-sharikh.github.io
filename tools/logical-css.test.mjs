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
