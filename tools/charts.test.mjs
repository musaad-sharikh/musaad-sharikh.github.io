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

// tokens.css declares five chart slots. More categories than slots used to index
// --chart-6 and beyond, which resolve to nothing: the slice paints as no colour
// at all while the legend still lists it. Both renderers wrap instead.
test('more categories than palette slots never reference an undeclared token', () => {
  const many = Array.from({ length: 8 }, (_, i) => ({ label: `c${i}`, value: i + 1 }));
  const donut = donutChart({ data: many, size: 200 });
  const line = lineChart({
    series: many.map((d) => ({ label: d.label, points: [1, 2] })),
    width: 400,
    height: 200,
    dir: 'ltr',
  });
  for (const svg of [donut, line]) {
    const slots = [...svg.matchAll(/--chart-(\d+)/g)].map((m) => Number(m[1]));
    assert.ok(slots.length > 0, 'expected chart tokens in the output');
    assert.deepEqual([...new Set(slots)].sort(), [1, 2, 3, 4, 5],
      `referenced slots outside the declared palette: ${[...new Set(slots)].join(', ')}`);
  }
});

test('the line chart keeps its end labels inside the viewBox', () => {
  const svg = lineChart({
    series: [{ label: 'Organic search', points: [1, 5, 3, 8] }],
    width: 400,
    height: 200,
    dir: 'ltr',
  });
  // The label is anchored at start, so its left edge plus its own width has to
  // fit. Character width is approximated the same way the renderer does it.
  const x = Number(svg.match(/<text x="([\d.]+)"[^>]*font-size="11"/)[1]);
  assert.ok(x + 'Organic search'.length * 6.2 <= 400,
    `end label starts at ${x} and would overflow the 400-wide viewBox`);
});
