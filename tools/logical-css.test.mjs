import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fileURLToPath } from 'node:url';
import { dirname, join } from 'node:path';
import { readAllFiles } from './lib/html.mjs';

const ROOT = join(dirname(fileURLToPath(import.meta.url)), '..');

// Physical is not only a property name. `float: left` and `object-position: right`
// break a mirrored layout exactly as `margin-left` does, and the original pattern
// looked only at names plus `text-align`, so all of them would have shipped
// unremarked. The value-side properties are listed explicitly rather than matching
// any `left`/`right` anywhere, which would flag `linear-gradient(to right, …)` and
// other places the words are not a direction the layout depends on.
//
// Case-insensitive: CSS property names are, and a lone capital would otherwise
// walk straight past the gate.
const PHYSICAL = new RegExp(
  [
    String.raw`\b(margin|padding|border|inset)-(left|right)\b`,
    String.raw`(?<![\w-])(left|right)\s*:`,
    String.raw`\b(text-align|float|clear)\s*:\s*[^;]*\b(left|right)\b`,
    String.raw`\b(background-position|object-position|transform-origin|perspective-origin)\s*:\s*[^;]*\b(left|right)\b`,
  ].join('|'),
  'i',
);

// The gate is only as good as this pattern, and a pattern that quietly stops
// matching is indistinguishable from a clean stylesheet. These are the shapes it
// exists to catch, and the shapes it must not mistake for direction.
test('the physical-property pattern catches what it claims to', () => {
  const caught = [
    'margin-left: 4px;', 'padding-right: 0;', 'border-left: 1px solid;', 'inset-left: 0;',
    'left: 0;', 'right: 12px;', 'text-align: left;', 'Text-Align: Left;',
    'float: left;', 'clear: right;', 'background-position: left center;',
    'object-position: right top;', 'transform-origin: left;',
  ];
  const ignored = [
    'margin-inline-start: 4px;', 'inset-inline-end: 0;', 'text-align: start;',
    'background: linear-gradient(to right, #000, #fff);', 'transform: translateY(-2px);',
    '.right-rail { color: red; }', 'border-radius: 2px 2px 0 0;',
  ];
  for (const line of caught) assert.ok(PHYSICAL.test(line), `should be caught: ${line}`);
  for (const line of ignored) assert.ok(!PHYSICAL.test(line), `should be ignored: ${line}`);
});

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
