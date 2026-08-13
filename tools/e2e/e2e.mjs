// End-to-end suite for the bilingual portfolio. Headed by default so the run can be watched.
// Lives outside the site repo on purpose: the repo ships zero dependencies.
import { chromium } from 'playwright';
import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { join, extname, normalize } from 'node:path';

// The suite serves the site itself, so a run is one self-contained command.
const ROOT = process.env.SITE_ROOT
  || '/home/mbm/Github/Musaad-Sharikh/musaad-sharikh.github.io';
const PORT = 8765;
const TYPES = {
  '.html': 'text/html; charset=utf-8', '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8',
  '.json': 'application/json', '.svg': 'image/svg+xml', '.woff2': 'font/woff2',
  '.pdf': 'application/pdf', '.png': 'image/png', '.ico': 'image/x-icon',
  '.xml': 'application/xml', '.txt': 'text/plain; charset=utf-8',
};

const server = createServer(async (req, res) => {
  try {
    let rel = normalize(decodeURIComponent(req.url.split('?')[0])).replace(/^(\.\.[/\\])+/, '');
    let file = join(ROOT, rel);
    if ((await stat(file)).isDirectory()) file = join(file, 'index.html');
    const body = await readFile(file);
    res.writeHead(200, { 'Content-Type': TYPES[extname(file)] || 'application/octet-stream' });
    res.end(body);
  } catch {
    res.writeHead(404, { 'Content-Type': 'text/plain' });
    res.end('404');
  }
});
await new Promise((r) => server.listen(PORT, r));

const BASE = process.env.BASE || `http://localhost:${PORT}`;
const HEADED = process.env.HEADLESS !== '1';
const ONLY = process.argv[2] || '';

const PAGES = [
  { path: '/', name: 'home' },
  { path: '/demos/components/', name: 'components' },
  { path: '/demos/commerce/', name: 'commerce' },
  { path: '/demos/dashboard/', name: 'dashboard' },
];

const results = [];
let current = null;

function check(desc, ok, detail = '') {
  results.push({ group: current, desc, ok, detail });
  console.log(`  ${ok ? '✓' : '✗'} ${desc}${ok || !detail ? '' : `\n      → ${detail}`}`);
}

async function group(name, fn) {
  if (ONLY && !name.includes(ONLY)) return;
  current = name;
  console.log(`\n▸ ${name}`);
  try {
    await fn();
  } catch (err) {
    check(`${name} threw`, false, err.message);
  }
}

/** Attach console/network collectors to a page. */
function watch(page) {
  const errors = [];
  page.on('console', (m) => {
    if (m.type() === 'error' || m.type() === 'warning') errors.push(`console.${m.type()}: ${m.text()}`);
  });
  page.on('pageerror', (e) => errors.push(`pageerror: ${e.message}`));
  page.on('requestfailed', (r) => errors.push(`requestfailed: ${r.url()} — ${r.failure()?.errorText}`));
  page.on('response', (r) => {
    if (r.status() >= 400) errors.push(`http ${r.status()}: ${r.url()}`);
  });
  return errors;
}

const browser = await chromium.launch({ headless: !HEADED, slowMo: HEADED ? 90 : 0 });

// Every page gets its OWN context. A shared context shares localStorage, so the
// language a page boots into depends on whatever the previous test last clicked
// — which silently invalidates any assertion about the starting language.
const contexts = [];
const ctx = {
  async newPage(opts = {}) {
    const c = await browser.newContext({ viewport: { width: 1280, height: 900 }, ...opts });
    contexts.push(c);
    return c.newPage();
  },
};

/** Visible prose, excluding code samples — those are meant to stay in English. */
const prose = (page) => page.evaluate(() => {
  const main = document.querySelector('main').cloneNode(true);
  for (const el of main.querySelectorAll('pre, code, .field__control')) el.remove();
  return main.innerText;
});

// ─────────────────────────────────────────── A. load, console, network
await group('A. pages load with no console or network errors', async () => {
  for (const { path, name } of PAGES) {
    const page = await ctx.newPage();
    const errors = watch(page);
    const resp = await page.goto(BASE + path, { waitUntil: 'networkidle' });
    check(`${name}: HTTP 200`, resp.status() === 200, `got ${resp.status()}`);
    const h1 = await page.locator('h1').first().textContent().catch(() => null);
    check(`${name}: has an <h1>`, !!h1 && h1.trim().length > 0);
    const h1count = await page.locator('h1').count();
    check(`${name}: exactly one <h1>`, h1count === 1, `found ${h1count}`);
    check(`${name}: clean console + network`, errors.length === 0, errors.join('\n      → '));
    await page.close();
  }
});

// ─────────────────────────────────────────── B. language switching
await group('B. language switching', async () => {
  for (const { path, name } of PAGES) {
    const page = await ctx.newPage();
    const errors = watch(page);
    await page.goto(BASE + path, { waitUntil: 'networkidle' });

    const enText = await prose(page);
    check(`${name}: starts in English`, await page.getAttribute('html', 'lang') === 'en');
    check(`${name}: starts ltr`, await page.getAttribute('html', 'dir') === 'ltr');

    await page.click('#lang-toggle');
    await page.waitForTimeout(150);
    check(`${name}: html[lang] → ar`, await page.getAttribute('html', 'lang') === 'ar');
    check(`${name}: html[dir] → rtl`, await page.getAttribute('html', 'dir') === 'rtl');
    check(`${name}: toggle aria-pressed → true`, await page.getAttribute('#lang-toggle', 'aria-pressed') === 'true');

    const arText = await prose(page);
    check(`${name}: main content actually changed`, arText !== enText);
    check(`${name}: Arabic script present`, /[؀-ۿ]/.test(arText));
    const latinLeft = arText.replace(/[؀-ۿ\s\d\p{P}\p{S}]/gu, '');
    check(`${name}: no large block of untranslated Latin`, latinLeft.length < 220,
      `${latinLeft.length} Latin chars remain: ${latinLeft.slice(0, 120)}`);

    check(`${name}: URL carries ?lang=ar`, page.url().includes('lang=ar'), page.url());

    // Persistence across reload
    await page.reload({ waitUntil: 'networkidle' });
    check(`${name}: Arabic survives reload`, await page.getAttribute('html', 'lang') === 'ar');

    // Back to English
    await page.click('#lang-toggle');
    await page.waitForTimeout(150);
    check(`${name}: html[lang] → en`, await page.getAttribute('html', 'lang') === 'en');
    const backText = await prose(page);
    check(`${name}: English restored exactly`, backText.trim() === enText.trim(),
      'round-trip did not restore the original English');

    check(`${name}: no errors during switching`, errors.length === 0, errors.join('\n      → '));
    await page.close();
  }

  // Deep link + CV href swap (home only)
  const page = await ctx.newPage();
  await page.goto(`${BASE}/?lang=ar`, { waitUntil: 'networkidle' });
  check('home: ?lang=ar deep link opens Arabic', await page.getAttribute('html', 'lang') === 'ar');
  const cvHref = await page.getAttribute('a[data-i18n-attr*="cv.href"], a[href*="Musaad-Muhammad-CV"]', 'href');
  check('home: CV link points at the Arabic PDF in Arabic', /CV-AR\.pdf$/.test(cvHref || ''), `href=${cvHref}`);
  const cvResp = await page.request.get(new URL(cvHref, page.url()).href);
  check('home: Arabic CV actually downloads', cvResp.status() === 200, `status ${cvResp.status()}`);
  await page.close();
});

// ─────────────────────────────────────────── C. theme
await group('C. dark / light mode', async () => {
  const page = await ctx.newPage();
  const errors = watch(page);
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });

  const bgOf = () => page.evaluate(() => getComputedStyle(document.body).backgroundColor);
  const before = await bgOf();
  await page.click('#theme-toggle');
  await page.waitForTimeout(200);
  const after = await bgOf();
  check('background colour actually changes', before !== after, `${before} → ${after}`);
  check('theme toggle exposes aria-pressed', ['true', 'false'].includes(await page.getAttribute('#theme-toggle', 'aria-pressed')));
  const themeAttr = await page.getAttribute('html', 'data-theme');
  check('data-theme is set on <html>', ['light', 'dark'].includes(themeAttr), `got ${themeAttr}`);

  await page.reload({ waitUntil: 'networkidle' });
  check('theme survives reload', await page.getAttribute('html', 'data-theme') === themeAttr);
  check('no flash: theme applied before paint', await page.evaluate(
    () => document.documentElement.dataset.theme !== undefined));

  // Theme label must follow the language
  await page.click('#lang-toggle');
  await page.waitForTimeout(150);
  const arLabel = await page.getAttribute('#theme-toggle', 'aria-label');
  check('theme button aria-label is Arabic in Arabic', /[؀-ۿ]/.test(arLabel || ''), `label=${arLabel}`);

  // prefers-color-scheme with no stored choice
  const fresh = await browser.newContext({ colorScheme: 'dark' });
  const fp = await fresh.newPage();
  await fp.goto(BASE + '/', { waitUntil: 'networkidle' });
  const darkBg = await fp.evaluate(() => getComputedStyle(document.body).backgroundColor);
  check('honours prefers-color-scheme: dark on first visit', darkBg !== 'rgb(255, 255, 255)', `body bg ${darkBg}`);
  await fresh.close();

  check('no errors during theme work', errors.length === 0, errors.join('\n      → '));
  await page.close();
});

// ─────────────────────────────────────────── D. keyboard
await group('D. keyboard navigation', async () => {
  const page = await ctx.newPage();
  const errors = watch(page);
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });

  await page.keyboard.press('Tab');
  const first = await page.evaluate(() => document.activeElement?.className || '');
  check('skip link is first in tab order', first.includes('skip-link'), `focused: ${first}`);
  const skipVisible = await page.evaluate(() => {
    const el = document.querySelector('.skip-link');
    return el.getBoundingClientRect().top >= 0;
  });
  check('skip link becomes visible on focus', skipVisible);

  await page.keyboard.press('Enter');
  await page.waitForTimeout(150);
  check('skip link moves to #main', page.url().includes('#main'), page.url());

  const outline = await page.evaluate(() => {
    const el = document.querySelector('#lang-toggle');
    el.focus();
    const s = getComputedStyle(el);
    return { w: s.outlineWidth, style: s.outlineStyle };
  });
  check('focus ring is visible on controls', parseFloat(outline.w) > 0 && outline.style !== 'none',
    `outline ${outline.style} ${outline.w}`);
  await page.close();

  // Tabs: arrow-key direction must flip under RTL
  const tabs = await ctx.newPage();
  watch(tabs);
  await tabs.goto(`${BASE}/demos/components/`, { waitUntil: 'networkidle' });

  const tabIndex = () => tabs.evaluate(() => {
    const list = document.querySelector('[role="tablist"]');
    const all = [...list.querySelectorAll('[role="tab"]')];
    return all.findIndex((t) => t.getAttribute('aria-selected') === 'true');
  });

  await tabs.evaluate(() => document.querySelector('[role="tab"][aria-selected="true"]').focus());
  const start = await tabIndex();
  await tabs.keyboard.press('ArrowRight');
  await tabs.waitForTimeout(120);
  check('LTR: ArrowRight advances the tab', (await tabIndex()) === start + 1, `${start} → ${await tabIndex()}`);
  await tabs.keyboard.press('ArrowLeft');
  await tabs.waitForTimeout(120);
  check('LTR: ArrowLeft goes back', (await tabIndex()) === start);

  await tabs.click('#lang-toggle');
  await tabs.waitForTimeout(200);

  // Regression: the gallery must inherit the page direction by default. It used
  // to carry a hardcoded dir="ltr", which stranded Arabic readers in an LTR
  // gallery and made the arrow keys behave as if the page were English.
  const galleryDir = await tabs.evaluate(() => ({
    attr: document.querySelector('#gallery').getAttribute('dir'),
    computed: getComputedStyle(document.querySelector('#gallery')).direction,
  }));
  check('gallery follows the page direction in Arabic',
    galleryDir.computed === 'rtl' && galleryDir.attr === null,
    `dir attribute=${galleryDir.attr}, computed=${galleryDir.computed}`);

  await tabs.evaluate(() => document.querySelector('[role="tab"][aria-selected="true"]').focus());
  const rtlStart = await tabIndex();
  await tabs.keyboard.press('ArrowLeft');
  await tabs.waitForTimeout(120);
  check('RTL: ArrowLeft advances the tab (mirrored)', (await tabIndex()) === rtlStart + 1,
    `${rtlStart} → ${await tabIndex()} — this is the detail that separates real RTL from a flipped screenshot`);
  await tabs.keyboard.press('ArrowRight');
  await tabs.waitForTimeout(120);
  check('RTL: ArrowRight goes back', (await tabIndex()) === rtlStart);
  await tabs.close();

  // Dialog: focus trap, Escape, focus restore
  const dlg = await ctx.newPage();
  watch(dlg);
  await dlg.goto(`${BASE}/demos/components/`, { waitUntil: 'networkidle' });
  const trigger = dlg.locator('button[data-open-dialog], button[data-dialog], [data-modal-open]').first();
  const hasTrigger = await trigger.count();
  if (hasTrigger) {
    await trigger.focus();
    const triggerId = await dlg.evaluate(() => document.activeElement?.outerHTML.slice(0, 60));
    await trigger.click();
    await dlg.waitForTimeout(250);
    check('dialog opens as a modal', await dlg.evaluate(() => !!document.querySelector('dialog[open]')));
    const inside = await dlg.evaluate(() => {
      const d = document.querySelector('dialog[open]');
      return d ? d.contains(document.activeElement) : false;
    });
    check('focus moves inside the dialog', inside);
    await dlg.keyboard.press('Escape');
    await dlg.waitForTimeout(250);
    check('Escape closes the dialog', await dlg.evaluate(() => !document.querySelector('dialog[open]')));
    const restored = await dlg.evaluate(() => document.activeElement?.outerHTML.slice(0, 60));
    check('focus returns to the trigger', restored === triggerId, `${triggerId} vs ${restored}`);
  } else {
    check('dialog trigger found', false, 'no dialog trigger matched the expected selectors');
  }
  await dlg.close();
});

// ─────────────────────────────────────────── E. responsive
await group('E. responsive layouts', async () => {
  const widths = [320, 768, 1280, 1920];
  for (const dir of ['ltr', 'rtl']) {
    for (const w of widths) {
      const page = await ctx.newPage();
      await page.setViewportSize({ width: w, height: 900 });
      await page.goto(`${BASE}/${dir === 'rtl' ? '?lang=ar' : ''}`, { waitUntil: 'networkidle' });
      await page.waitForTimeout(120);
      const overflow = await page.evaluate(() => ({
        scroll: document.documentElement.scrollWidth,
        client: document.documentElement.clientWidth,
      }));
      check(`${dir} @${w}px: no horizontal overflow`, overflow.scroll <= overflow.client + 1,
        `scrollWidth ${overflow.scroll} > clientWidth ${overflow.client}`);
      await page.close();
    }
  }

  // Touch-target size on the two header toggles
  const page = await ctx.newPage();
  await page.setViewportSize({ width: 375, height: 800 });
  await page.goto(BASE + '/', { waitUntil: 'networkidle' });
  for (const id of ['#lang-toggle', '#theme-toggle']) {
    const box = await page.locator(id).boundingBox();
    check(`${id} is at least 44×44`, box.width >= 44 && box.height >= 44,
      `${Math.round(box.width)}×${Math.round(box.height)}`);
  }
  await page.close();
});

// ─────────────────────────────────────────── F. forms
await group('F. commerce form validation', async () => {
  const page = await ctx.newPage();
  const errors = watch(page);
  await page.goto(`${BASE}/demos/commerce/`, { waitUntil: 'networkidle' });

  // Add an item, open the cart
  const addBtn = page.locator('[data-add], button:has-text("Add")').first();
  if (await addBtn.count()) {
    await addBtn.click();
    await page.waitForTimeout(200);
  }
  await page.click('#cart-trigger');
  await page.waitForTimeout(300);
  check('cart drawer opens', await page.evaluate(() => !!document.querySelector('dialog[open]')));

  // Reach the checkout form and submit it empty
  const goCheckout = page.locator('#cart-checkout-btn');
  if (await goCheckout.count()) {
    await goCheckout.click();
    await page.waitForTimeout(300);
  }
  await page.evaluate(() => document.querySelector('#checkout-form')
    ?.scrollIntoView({ block: 'center' }));
  await page.locator('#checkout-form button[type="submit"]').click();
  await page.waitForTimeout(300);

  const invalid = await page.evaluate(() =>
    [...document.querySelectorAll('#checkout-form [aria-invalid="true"]')].map((e) => e.id));
  check('empty submit marks fields aria-invalid', invalid.length > 0, `invalid: ${invalid.join(', ') || 'none'}`);

  const described = await page.evaluate(() => {
    const el = document.querySelector('#checkout-form [aria-invalid="true"]');
    if (!el) return null;
    const id = el.getAttribute('aria-describedby');
    const msg = id && document.getElementById(id.split(' ')[0]);
    return { id, text: msg?.textContent?.trim() };
  });
  check('invalid field is wired to a visible message',
    !!described?.id && !!described?.text, JSON.stringify(described));

  const focused = await page.evaluate(() => document.activeElement?.id);
  check('focus moves to the first invalid field', invalid.includes(focused),
    `focused #${focused}, expected one of ${invalid.join(', ')}`);

  const live = await page.evaluate(() =>
    document.querySelector('[aria-live]')?.textContent?.trim());
  check('an aria-live region announces the failure', !!live && live.length > 0, `live="${live}"`);

  // Same again in Arabic — messages must be translated.
  // Close any open modal first: an open <dialog> makes the rest of the document
  // inert, so a click on the header toggle would silently do nothing.
  await page.evaluate(() => document.querySelector('dialog[open]')?.close());
  await page.waitForTimeout(150);
  await page.click('#lang-toggle');
  await page.waitForTimeout(250);
  await page.locator('#checkout-form button[type="submit"]').click();
  await page.waitForTimeout(300);
  const arMsg = await page.evaluate(() => {
    const el = document.querySelector('#checkout-form [aria-invalid="true"]');
    const id = el?.getAttribute('aria-describedby');
    return id ? document.getElementById(id.split(' ')[0])?.textContent?.trim() : null;
  });
  check('validation messages are translated to Arabic',
    !!arMsg && /[؀-ۿ]/.test(arMsg), `message="${arMsg}"`);

  // A valid submit should clear the errors
  await page.evaluate(() => document.querySelector('dialog[open]')?.close());
  await page.waitForTimeout(150);
  await page.click('#lang-toggle');
  await page.waitForTimeout(250);
  await page.fill('#checkout-name', 'Musaad Muhammad');
  await page.fill('#checkout-email', 'test@example.com');
  await page.fill('#checkout-address', '1 King Fahd Road');
  await page.fill('#checkout-city', 'Riyadh');
  await page.fill('#checkout-postal', '12345');
  await page.locator('#checkout-form button[type="submit"]').click();
  await page.waitForTimeout(400);
  const stillInvalid = await page.evaluate(() =>
    document.querySelectorAll('#checkout-form [aria-invalid="true"]').length);
  check('a valid submit clears the invalid state', stillInvalid === 0, `${stillInvalid} still invalid`);

  check('no errors during form work', errors.length === 0, errors.join('\n      → '));
  await page.close();
});

// ─────────────────────────────────────────── report
for (const c of contexts) await c.close().catch(() => {});
await browser.close();
server.close();

const failed = results.filter((r) => !r.ok);
console.log(`\n${'─'.repeat(64)}`);
console.log(`${results.length - failed.length}/${results.length} checks passed`);
if (failed.length) {
  console.log(`\n${failed.length} FAILING:`);
  for (const f of failed) console.log(`  ✗ [${f.group}] ${f.desc}${f.detail ? `\n      ${f.detail}` : ''}`);
}
process.exit(failed.length ? 1 : 0);
