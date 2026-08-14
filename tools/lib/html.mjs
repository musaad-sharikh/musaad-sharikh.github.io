import { readdir, readFile, readlink } from 'node:fs/promises';
import { join, extname } from 'node:path';

const SKIP_DIRS = new Set(['.git', 'node_modules', '.superpowers']);
const BINARY_EXT = new Set(['.pdf', '.woff2', '.png', '.jpg', '.jpeg', '.ico', '.ttf']);

/** Every text file in the tree, as { path, text }.
 *
 *  Two things about symlinks, both learned from `node_modules`, which
 *  tools/e2e/README.md tells you to link in from another checkout so the
 *  Playwright run can resolve `playwright`:
 *
 *  - The name check has to come before the type check. A symlink pointing at a
 *    directory reports isDirectory() === false and isSymbolicLink() === true, so
 *    testing the type first sent a linked `node_modules` down the file branch and
 *    readFile() threw EISDIR — which failed three tests for a reason that had
 *    nothing to do with the repository's contents.
 *  - A symlink is never followed. Its target is not repository content, may sit
 *    outside the tree entirely, and following it invites cycles. The link itself
 *    is still scanned, as the target path it stores — which is what git commits
 *    for a symlink, and what would carry a private vault path if one were ever
 *    linked in. Skipping symlinks outright would have been the smaller change
 *    and a real hole in the privacy scan.
 */
export async function readAllFiles(rootDir) {
  const out = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (SKIP_DIRS.has(entry.name)) continue;
      const path = join(dir, entry.name);
      if (entry.isSymbolicLink()) {
        out.push({ path, text: await readlink(path) });
      } else if (entry.isDirectory()) {
        await walk(path);
      } else if (!BINARY_EXT.has(extname(entry.name).toLowerCase())) {
        out.push({ path, text: await readFile(path, 'utf8') });
      }
    }
  }
  await walk(rootDir);
  return out;
}

/** All data-i18n keys in an HTML string, including attribute-target keys. */
export function extractI18nKeys(html) {
  const keys = new Set();
  for (const m of html.matchAll(/data-i18n="([^"]+)"/g)) keys.add(m[1]);
  for (const m of html.matchAll(/data-i18n-attr="([^"]+)"/g)) {
    for (const pair of m[1].split(/\s*,\s*/)) {
      const key = pair.split(':')[1];
      if (key) keys.add(key.trim());
    }
  }
  return keys;
}
