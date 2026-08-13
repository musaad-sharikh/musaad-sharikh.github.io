// Pure SVG-string chart renderers — no DOM, no dependencies, no external state.
// Each function takes plain data and returns a complete <svg>…</svg> string, which
// is exactly what makes them unit-testable in Node (see tools/charts.test.mjs) and
// safe to inject via innerHTML: the string is entirely our own construction, never
// user input.
//
// Colour comes ONLY from var(--chart-N) (never a literal hex) so both themes work
// with zero JavaScript involvement on themechange — the browser repaints the SVG
// the instant the custom property resolves to a new value. The one thing that DOES
// require a re-render is a language change, because direction (mirroring) and any
// label text passed in by the caller can only be baked in at render time.
//
// Every chart is `aria-hidden="true"` — a real <table> elsewhere on the page (see
// demos/dashboard/index.html) is the accessible copy of the same data, per the
// dataviz skill's rule that information is never graphic-only.

const NS = 'http://www.w3.org/2000/svg';

function esc(value) {
  return String(value).replace(/[&<>"']/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[c]));
}

/** Mirrors an x-coordinate for RTL rendering — the one geometry change a language
 *  switch requires (everything else is CSS custom properties + real DOM text). */
function mirrorX(x, width, dir) {
  return dir === 'rtl' ? width - x : x;
}

/** Rounds to 1 decimal place — keeps generated SVG source free of long floating
 *  point tails (e.g. 61.599999999999994) without visibly affecting geometry. */
function round1(n) {
  return Math.round(n * 10) / 10;
}

function svgWrap({ width, height, body }) {
  return `<svg xmlns="${NS}" width="${width}" height="${height}" viewBox="0 0 ${width} ${height}" `
    + `aria-hidden="true" focusable="false">${body}</svg>`;
}

// ---------------------------------------------------------------------------
// Line chart — trend over time, one categorical hue per named series (the
// dataviz skill's job table: "tell distinct series apart" -> categorical).
// ---------------------------------------------------------------------------

const LINE_PAD = { top: 12, right: 12, bottom: 24, left: 12 };

export function lineChart({ series = [], width, height, dir = 'ltr', xLabels = [] }) {
  const pad = LINE_PAD;
  const plotW = Math.max(width - pad.left - pad.right, 1);
  const plotH = Math.max(height - pad.top - pad.bottom, 1);

  const allValues = series.flatMap((s) => s.points ?? []);
  const maxVal = allValues.length ? Math.max(0, ...allValues) : 0;
  const ceilMax = maxVal > 0 ? maxVal * 1.15 : 1;
  const pointCount = series.length ? Math.max(0, ...series.map((s) => (s.points ?? []).length)) : 0;

  // Recessive hairline gridlines, one step off the surface — never dashed.
  const gridlines = [0, 0.5, 1]
    .map((f) => {
      const y = (pad.top + plotH * (1 - f)).toFixed(1);
      return `<line x1="${pad.left}" y1="${y}" x2="${pad.left + plotW}" y2="${y}" `
        + `stroke="var(--color-border)" stroke-width="1"/>`;
    })
    .join('');

  const xAt = (idx) => {
    const frac = pointCount > 1 ? idx / (pointCount - 1) : 0.5;
    return mirrorX(pad.left + frac * plotW, width, dir);
  };
  const yAt = (v) => pad.top + plotH * (1 - v / ceilMax);

  const xTickLabels = xLabels.length
    ? xLabels
      .map((label, idx) => {
        if (pointCount < 2 && idx > 0) return '';
        const x = xAt(idx).toFixed(1);
        return `<text x="${x}" y="${height - 6}" text-anchor="middle" font-size="10" `
          + `fill="var(--color-text-muted)">${esc(label)}</text>`;
      })
      .join('')
    : '';

  const linesMarkup = series
    .map((s, i) => {
      const color = `var(--chart-${i + 1})`;
      const points = s.points ?? [];
      if (!points.length) return '';
      const coords = points.map((v, idx) => `${xAt(idx).toFixed(1)},${yAt(v).toFixed(1)}`);
      const path = `<polyline points="${coords.join(' ')}" fill="none" stroke="${color}" `
        + `stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/>`;
      const [lastX, lastY] = coords[coords.length - 1].split(',');
      const marker = `<circle cx="${lastX}" cy="${lastY}" r="4" fill="${color}" `
        + `stroke="var(--color-surface)" stroke-width="2"/>`;
      // Direct end-label — the mark spec's "label the endpoint" rule; the legend
      // (real DOM, outside this aria-hidden SVG) still carries identity for AT.
      const anchor = dir === 'rtl' ? 'end' : 'start';
      const labelX = dir === 'rtl' ? Number(lastX) - 8 : Number(lastX) + 8;
      const label = s.label != null
        ? `<text x="${labelX}" y="${Number(lastY) + 3}" text-anchor="${anchor}" `
          + `font-size="11" fill="var(--color-text)">${esc(s.label)}</text>`
        : '';
      return path + marker + label;
    })
    .join('');

  return svgWrap({ width, height, body: gridlines + linesMarkup + xTickLabels });
}

// ---------------------------------------------------------------------------
// Bar chart — comparing magnitude across categories of the SAME measure.
// Per the dataviz skill's job table ("compare magnitude" -> sequential, one
// hue) every bar shares a single colour (--chart-1); identity comes from the
// category tick label under each bar, not from a distinct hue per bar.
// ---------------------------------------------------------------------------

const BAR_PAD = { top: 20, right: 12, bottom: 26, left: 12 };
const BAR_MAX_THICKNESS = 24;
const BAR_RADIUS = 4;

function roundedTopBar(x, y, w, h, r) {
  const rad = Math.min(r, w / 2, h);
  if (rad <= 0) return `M${x},${y + h} h${w} v${-h} h${-w} Z`;
  return `M${x},${y + h} `
    + `L${x},${y + rad} `
    + `Q${x},${y} ${x + rad},${y} `
    + `L${x + w - rad},${y} `
    + `Q${x + w},${y} ${x + w},${y + rad} `
    + `L${x + w},${y + h} Z`;
}

export function barChart({ data = [], width, height, dir = 'ltr' }) {
  const pad = BAR_PAD;
  const plotW = Math.max(width - pad.left - pad.right, 1);
  const plotH = Math.max(height - pad.top - pad.bottom, 1);
  const count = data.length;

  const maxVal = count ? Math.max(0, ...data.map((d) => d.value)) : 0;
  const ceilMax = maxVal > 0 ? maxVal * 1.15 : 1;

  const baseline = `<line x1="${pad.left}" y1="${pad.top + plotH}" x2="${pad.left + plotW}" `
    + `y2="${pad.top + plotH}" stroke="var(--color-border-strong)" stroke-width="1"/>`;

  if (!count) return svgWrap({ width, height, body: baseline });

  const bandWidth = plotW / count;
  const barWidth = Math.min(BAR_MAX_THICKNESS, bandWidth * 0.55);

  const bars = data
    .map((d, i) => {
      const bandCenterLtr = pad.left + (i + 0.5) * bandWidth;
      const barLeftLtr = bandCenterLtr - barWidth / 2;
      const barLeft = round1(dir === 'rtl' ? width - barLeftLtr - barWidth : barLeftLtr);
      const barHeight = round1((d.value / ceilMax) * plotH);
      const barTop = round1(pad.top + plotH - barHeight);
      const path = roundedTopBar(barLeft, barTop, round1(barWidth), barHeight, BAR_RADIUS);
      const bandCenterFinal = dir === 'rtl' ? width - bandCenterLtr : bandCenterLtr;
      const valueLabel = `<text x="${bandCenterFinal.toFixed(1)}" y="${(barTop - 6).toFixed(1)}" `
        + `text-anchor="middle" font-size="11" fill="var(--color-text)">${esc(d.value)}</text>`;
      const categoryLabel = d.label != null
        ? `<text x="${bandCenterFinal.toFixed(1)}" y="${height - 6}" text-anchor="middle" `
          + `font-size="10" fill="var(--color-text-muted)">${esc(d.label)}</text>`
        : '';
      return `<path d="${path}" fill="var(--chart-1)"/>${valueLabel}${categoryLabel}`;
    })
    .join('');

  return svgWrap({ width, height, body: baseline + bars });
}

// ---------------------------------------------------------------------------
// Donut chart — part-to-whole across a handful of named categories. Per the
// dataviz skill's job table this IS a categorical job (each slice is a
// distinct identity), so each slice gets the next fixed --chart-N slot.
// ---------------------------------------------------------------------------

const DONUT_GAP_PX = 2; // the two-spacer rule: a surface-colour gap between fills

export function donutChart({ data = [], size }) {
  const cx = size / 2;
  const cy = size / 2;
  const strokeWidth = Math.max(size * 0.16, 8);
  const r = size / 2 - strokeWidth / 2 - 2;
  const circumference = 2 * Math.PI * r;

  const total = data.reduce((sum, d) => sum + (d.value > 0 ? d.value : 0), 0);
  if (!total) return svgWrap({ width: size, height: size, body: '' });

  let cumulative = 0;
  const slices = data
    .filter((d) => d.value > 0)
    .map((d, i) => {
      const fraction = d.value / total;
      const rawLength = fraction * circumference;
      const length = Math.max(rawLength - DONUT_GAP_PX, 0);
      const dashoffset = -cumulative;
      cumulative += rawLength;
      return `<circle cx="${cx}" cy="${cy}" r="${r}" fill="none" stroke="var(--chart-${i + 1})" `
        + `stroke-width="${strokeWidth}" stroke-dasharray="${length.toFixed(2)} ${(circumference - length).toFixed(2)}" `
        + `stroke-dashoffset="${dashoffset.toFixed(2)}" `
        + `transform="rotate(-90 ${cx} ${cy})"/>`;
    })
    .join('');

  return svgWrap({ width: size, height: size, body: slices });
}
