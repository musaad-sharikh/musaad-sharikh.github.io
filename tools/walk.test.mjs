import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtemp, mkdir, writeFile, symlink, rm } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, relative } from 'node:path';
import { readAllFiles } from './lib/html.mjs';

/** A throwaway tree containing the shapes that have broken the walker. */
async function fixture() {
  const root = await mkdtemp(join(tmpdir(), 'portfolio-walk-'));
  const outside = await mkdtemp(join(tmpdir(), 'portfolio-outside-'));
  await writeFile(join(outside, 'index.js'), 'module.exports = 1;\n');
  await mkdir(join(root, 'css'));
  await writeFile(join(root, 'css/tokens.css'), ':root { --x: 1px; }\n');
  // A dotted, gitignored directory of generated artifacts — the shape that hid
  // sensitive text from the privacy scan when the walker skipped it by name.
  await mkdir(join(root, '.superpowers/sdd'), { recursive: true });
  await writeFile(join(root, '.superpowers/sdd/report.md'), 'generated artifact\n');
  // The link tools/e2e/README.md tells you to create before a Playwright run.
  await symlink(outside, join(root, 'node_modules'), 'dir');
  // A link that is NOT skipped by name, to prove links are scanned rather than
  // followed or dropped.
  await symlink(join(outside, 'index.js'), join(root, 'linked-note.txt'), 'file');
  return { root, outside };
}

test('a symlinked node_modules does not break the repository scan', async () => {
  const { root, outside } = await fixture();
  try {
    const files = await readAllFiles(root);
    const paths = files.map((f) => relative(root, f.path)).sort();
    assert.deepEqual(paths, ['.superpowers/sdd/report.md', 'css/tokens.css', 'linked-note.txt'],
      'node_modules must be skipped by name, whether it is a directory or a link to one');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

// The privacy scan is only as wide as this walker. A dotted directory of
// generated artifacts is precisely where a quoted phone number ends up, so
// reaching into it is the behaviour under test — not an incidental detail.
test('generated-artifact directories are scanned, not skipped by name', async () => {
  const { root, outside } = await fixture();
  try {
    const files = await readAllFiles(root);
    const artifact = files.find((f) => f.path.endsWith('report.md'));
    assert.ok(artifact, 'a file under .superpowers/ must appear in the scan');
    assert.equal(artifact.text.trim(), 'generated artifact');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});

test('a symlink is scanned as the target path it stores, never followed', async () => {
  const { root, outside } = await fixture();
  try {
    const link = (await readAllFiles(root)).find((f) => f.path.endsWith('linked-note.txt'));
    assert.ok(link, 'the symlink itself must appear in the scan');
    assert.equal(link.text, join(outside, 'index.js'),
      'the link must contribute its target path — that is what git stores for it, '
      + 'and what would carry a private vault path if one were ever linked in');
    assert.doesNotMatch(link.text, /module\.exports/,
      'following the link would pull in content from outside the repository');
  } finally {
    await rm(root, { recursive: true, force: true });
    await rm(outside, { recursive: true, force: true });
  }
});
