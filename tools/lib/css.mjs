/** Custom properties declared inside the block for `selector`. */
export function parseCustomProperties(css, selector) {
  const escaped = selector.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
  const block = new RegExp(`${escaped}\\s*\\{([^}]*)\\}`).exec(css);
  if (!block) throw new Error(`selector not found: ${selector}`);
  const props = new Map();
  for (const m of block[1].matchAll(/(--[\w-]+)\s*:\s*([^;]+);/g)) {
    props.set(m[1], m[2].trim());
  }
  return props;
}

/** Both halves of a `light-dark(#aaa, #bbb)` declaration. */
export function splitLightDark(value) {
  const m = /^light-dark\(\s*(#[0-9a-fA-F]{3,8})\s*,\s*(#[0-9a-fA-F]{3,8})\s*\)$/.exec(value.trim());
  if (!m) throw new Error(`expected light-dark(<hex>, <hex>), got: ${value}`);
  return { light: m[1], dark: m[2] };
}

function channel(value) {
  const c = value / 255;
  return c <= 0.03928 ? c / 12.92 : ((c + 0.055) / 1.055) ** 2.4;
}

function luminance(hex) {
  const h = hex.replace('#', '');
  const full = h.length === 3 ? [...h].map((c) => c + c).join('') : h;
  const [r, g, b] = [0, 2, 4].map((i) => parseInt(full.slice(i, i + 2), 16));
  return 0.2126 * channel(r) + 0.7152 * channel(g) + 0.0722 * channel(b);
}

/** WCAG 2.x contrast ratio, 1–21. */
export function contrastRatio(hexA, hexB) {
  const [a, b] = [luminance(hexA), luminance(hexB)];
  return (Math.max(a, b) + 0.05) / (Math.min(a, b) + 0.05);
}
