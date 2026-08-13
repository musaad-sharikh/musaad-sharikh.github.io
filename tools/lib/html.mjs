import { readdir, readFile, stat } from 'node:fs/promises';
import { join, extname } from 'node:path';

const SKIP_DIRS = new Set(['.git', 'node_modules', '.superpowers']);
const BINARY_EXT = new Set(['.pdf', '.woff2', '.png', '.jpg', '.jpeg', '.ico', '.ttf']);

/** Every text file in the tree, as { path, text }. */
export async function readAllFiles(rootDir) {
  const out = [];
  async function walk(dir) {
    for (const entry of await readdir(dir, { withFileTypes: true })) {
      if (entry.isDirectory()) {
        if (SKIP_DIRS.has(entry.name)) continue;
        await walk(join(dir, entry.name));
      } else if (!BINARY_EXT.has(extname(entry.name).toLowerCase())) {
        const path = join(dir, entry.name);
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
