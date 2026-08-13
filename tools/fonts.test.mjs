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
