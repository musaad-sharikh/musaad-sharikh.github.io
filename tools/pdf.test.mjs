import { test } from 'node:test';
import assert from 'node:assert/strict';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import { readdir } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
// The one place the number's shape is written down. This file used to keep its
// own copy, using the unbounded-gap pattern forbidden.mjs documents as broken —
// two gates drifting apart is how one of them ends up silenced.
import { PHONE } from './lib/forbidden.mjs';

const run = promisify(execFile);
const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');
const CV_DIR = join(ROOT, 'assets/cv');

// Digits of the private number, tolerant of any separator or line break between them.


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
