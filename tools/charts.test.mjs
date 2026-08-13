import { test } from 'node:test';
import assert from 'node:assert/strict';
import { lineChart, barChart, donutChart } from '../demos/dashboard/charts.js';

const SERIES = [{ label: 'a', points: [1, 5, 3, 8] }];

test('lineChart returns SVG sized as requested', () => {
  const svg = lineChart({ series: SERIES, width: 400, height: 200, dir: 'ltr' });
  assert.match(svg, /^<svg /);
  assert.match(svg, /viewBox="0 0 400 200"/);
});

test('charts are decorative to assistive tech — the data table is the accessible copy', () => {
  const svg = barChart({ data: [{ label: 'a', value: 3 }], width: 300, height: 150, dir: 'ltr' });
  assert.match(svg, /aria-hidden="true"/);
});

test('RTL mirrors the horizontal axis', () => {
  const ltr = lineChart({ series: SERIES, width: 400, height: 200, dir: 'ltr' });
  const rtl = lineChart({ series: SERIES, width: 400, height: 200, dir: 'rtl' });
  assert.notEqual(ltr, rtl, 'RTL output must differ from LTR');
});

test('charts colour from tokens, never from literal hex', () => {
  const svg = donutChart({ data: [{ label: 'a', value: 1 }, { label: 'b', value: 2 }], size: 200 });
  // Scoped to paint attributes: a bare /#[0-9a-f]{3,6}/ would also match
  // legitimate internal references such as fill="url(#slice-a1b2c3)".
  assert.doesNotMatch(svg, /(?:fill|stroke|stop-color)="#/, 'use var(--chart-N), not literal hex');
  assert.match(svg, /var\(--chart-1\)/);
});

test('an empty series produces a valid empty chart, not a crash', () => {
  assert.match(barChart({ data: [], width: 300, height: 150, dir: 'ltr' }), /^<svg /);
});
