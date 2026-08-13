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
