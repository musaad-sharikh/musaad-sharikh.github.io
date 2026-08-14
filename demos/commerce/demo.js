import { createI18n, mountLanguageToggle } from '../../js/i18n.js';
import { createTheme, mountThemeToggle } from '../../js/theme.js';
import { createCart } from './cart.js';
import dictionary from './ar.js';

// i18n is created before the theme toggle mounts, because the theme button's
// aria-label is written in the active language. Same boot sequence as the
// main page (js/main.js).
const i18n = createI18n({
  root: document,
  dictionary,
  statusEl: document.querySelector('#i18n-status'),
});
i18n.boot();
mountLanguageToggle({ button: document.querySelector('#lang-toggle'), i18n });

const theme = createTheme();
theme.boot();
mountThemeToggle({
  button: document.querySelector('#theme-toggle'),
  theme,
  i18n,
  dictionary,
});

// Small templating helper for strings that are built at runtime (never a
// data-i18n markup target) rather than applied by the shared i18n engine —
// the per-line cart controls need the product name folded into their label,
// which the engine's fixed key-per-element model can't express. Keys used
// this way are listed in tools/i18n.test.mjs's DYNAMIC_KEYS allow-list.
function t(key, english, vars = {}) {
  const raw = i18n.current() === 'ar' ? (dictionary[key] ?? english) : english;
  return Object.entries(vars).reduce((s, [name, value]) => s.replaceAll(`{${name}}`, value), raw);
}

// Modal / drawer wiring: native <dialog> gives focus trapping, Escape
// handling, and focus restoration to the trigger for free.
for (const opener of document.querySelectorAll('[data-modal-open]')) {
  opener.addEventListener('click', () => {
    document.getElementById(opener.dataset.modalOpen).showModal();
  });
}
for (const closer of document.querySelectorAll('[data-modal-close]')) {
  closer.addEventListener('click', () => {
    closer.closest('dialog').close();
  });
}

// Product catalogue --------------------------------------------------------
// Synthetic sample data only — prices are illustrative SAR amounts, not real
// merchandise. cart.js never sees prices; it only tracks id/qty, so all
// money math lives here.
const PRODUCTS = [
  { id: 'p-mug', price: 39 },
  { id: 'p-notebook', price: 22 },
  { id: 'p-lamp', price: 149 },
  { id: 'p-backpack', price: 219 },
  { id: 'p-bottle', price: 59 },
  { id: 'p-headphones', price: 299 },
  { id: 'p-plant', price: 35 },
  { id: 'p-candle', price: 28 },
];
const PRICE_OF = new Map(PRODUCTS.map((p) => [p.id, p.price]));

function productName(id) {
  const card = document.querySelector(`[data-add-to-cart="${id}"]`)?.closest('.product-card');
  return card?.querySelector('.product-card__name')?.textContent ?? id;
}

// The -u-nu-latn extension is required, not cosmetic: plain 'ar-SA' formats
// with Arabic-Indic digits (١٢٣), which would contradict this project's rule
// that numerals stay Western in both languages.
const money = (lang) =>
  new Intl.NumberFormat(lang === 'ar' ? 'ar-SA-u-nu-latn' : 'en-SA', {
    style: 'currency',
    currency: 'SAR',
  });

function renderProductPrices() {
  const fmt = money(i18n.current());
  for (const el of document.querySelectorAll('[data-price-for]')) {
    el.textContent = fmt.format(PRICE_OF.get(el.dataset.priceFor) ?? 0);
  }
}

// Cart ----------------------------------------------------------------
const cart = createCart(window.localStorage);

const cartLinesEl = document.querySelector('#cart-lines');
const cartEmptyEl = document.querySelector('#cart-empty');
const cartSubtotalEl = document.querySelector('#cart-subtotal-value');
const cartBadgeEl = document.querySelector('#cart-badge');
const cartCountLiveEl = document.querySelector('#cart-count-live');

/** Where focus was standing inside the cart list, as something that survives the
 *  rebuild below: a control key plus the row it was on. */
function captureCartFocus() {
  const active = document.activeElement;
  if (!cartLinesEl.contains(active)) return null;
  const line = active.closest('.cart-line');
  return {
    key: active.dataset.focusKey ?? null,
    index: line ? [...cartLinesEl.children].indexOf(line) : 0,
  };
}

/** renderCart() rebuilds every row from scratch, so the node holding focus is
 *  destroyed on every quantity change and every removal. Left alone, focus fell
 *  to <body> while the drawer was still open — the reader lost their place
 *  inside a dialog that had made the rest of the page inert.
 *
 *  Focus goes back to the same control where it still exists; when the row is
 *  gone, to the same control on the row that took its place; and failing that to
 *  the drawer's close button, which is the one control that is always there. It
 *  is never dropped. */
function restoreCartFocus(previous) {
  if (!previous) return;

  const byKey = previous.key
    && cartLinesEl.querySelector(`[data-focus-key="${CSS.escape(previous.key)}"]`);
  if (byKey) { byKey.focus(); return; }

  const rows = [...cartLinesEl.children];
  const role = previous.key ? previous.key.split(':')[0] : 'remove';
  const fallbackRow = rows[Math.min(previous.index, rows.length - 1)];
  const sameRole = fallbackRow?.querySelector(`[data-focus-key^="${role}:"]`);
  if (sameRole) { sameRole.focus(); return; }

  document.querySelector('#cart-drawer .drawer__close')?.focus();
}

function renderCart() {
  const lines = cart.items();
  const fmt = money(i18n.current());
  const previousFocus = captureCartFocus();

  cartLinesEl.textContent = '';
  for (const line of lines) {
    const name = productName(line.id);
    const li = document.createElement('li');
    li.className = 'cart-line';

    const nameEl = document.createElement('span');
    nameEl.className = 'cart-line__name';
    nameEl.textContent = name;

    const qtyWrap = document.createElement('div');
    qtyWrap.className = 'cart-line__qty';
    qtyWrap.setAttribute('role', 'group');
    qtyWrap.setAttribute('aria-label', name);

    const decrease = document.createElement('button');
    decrease.type = 'button';
    decrease.className = 'stepper__btn';
    decrease.textContent = '−';
    decrease.dataset.focusKey = `dec:${line.id}`;
    decrease.setAttribute('aria-label', t('cart.line.decreaseLabel', 'Decrease quantity of {product}', { product: name }));
    decrease.addEventListener('click', () => cart.setQty(line.id, line.qty - 1));

    const qtyValue = document.createElement('span');
    qtyValue.className = 'cart-line__qty-value';
    qtyValue.textContent = String(line.qty);

    const increase = document.createElement('button');
    increase.type = 'button';
    increase.className = 'stepper__btn';
    increase.textContent = '+';
    increase.dataset.focusKey = `inc:${line.id}`;
    increase.setAttribute('aria-label', t('cart.line.increaseLabel', 'Increase quantity of {product}', { product: name }));
    increase.addEventListener('click', () => cart.setQty(line.id, line.qty + 1));

    qtyWrap.append(decrease, qtyValue, increase);

    const priceEl = document.createElement('span');
    priceEl.className = 'cart-line__price';
    priceEl.textContent = fmt.format((PRICE_OF.get(line.id) ?? 0) * line.qty);

    const removeBtn = document.createElement('button');
    removeBtn.type = 'button';
    removeBtn.className = 'cart-line__remove';
    removeBtn.textContent = '×';
    removeBtn.dataset.focusKey = `remove:${line.id}`;
    removeBtn.setAttribute('aria-label', t('cart.line.removeLabel', 'Remove {product} from cart', { product: name }));
    removeBtn.addEventListener('click', () => cart.remove(line.id));

    li.append(nameEl, qtyWrap, priceEl, removeBtn);
    cartLinesEl.append(li);
  }

  cartEmptyEl.hidden = lines.length > 0;

  const subtotal = lines.reduce((sum, line) => sum + (PRICE_OF.get(line.id) ?? 0) * line.qty, 0);
  cartSubtotalEl.textContent = fmt.format(subtotal);

  const count = cart.total();
  cartBadgeEl.textContent = String(count);
  cartCountLiveEl.textContent = String(count);

  restoreCartFocus(previousFocus);
}

for (const button of document.querySelectorAll('[data-add-to-cart]')) {
  button.addEventListener('click', () => cart.add(button.dataset.addToCart, 1));
}

cart.subscribe(renderCart);

document.addEventListener('languagechange', () => {
  renderProductPrices();
  renderCart();
});

renderProductPrices();
renderCart();

// "Proceed to checkout" closes the drawer and hands focus to the first field
// of the checkout form further down the page — there is no separate
// checkout page in this single-page demo.
document.querySelector('#cart-checkout-btn').addEventListener('click', () => {
  document.querySelector('#cart-drawer').close();
  const firstField = document.querySelector('#checkout-name');
  firstField.scrollIntoView({ block: 'center' });
  firstField.focus();
});

// Checkout form validation ---------------------------------------------
// Native required/type attributes stay on the fields so the form degrades
// correctly without JavaScript; novalidate on the <form> suppresses only the
// browser's own validation bubbles, not the underlying Constraint Validation
// API, so el.validity below still reflects the real check.
const form = document.querySelector('#checkout-form');
const summaryEl = document.querySelector('#checkout-summary');
const successEl = document.querySelector('#checkout-success');

const nameInput = document.querySelector('#checkout-name');
const emailInput = document.querySelector('#checkout-email');
const addressInput = document.querySelector('#checkout-address');
const cityInput = document.querySelector('#checkout-city');
const postalInput = document.querySelector('#checkout-postal');

const FIELDS = [
  { input: nameInput, check: () => (nameInput.validity.valueMissing ? '#checkout-name-error' : null) },
  {
    input: emailInput,
    check: () => {
      if (emailInput.validity.valueMissing) return '#checkout-email-error-required';
      if (emailInput.validity.typeMismatch) return '#checkout-email-error-invalid';
      return null;
    },
  },
  { input: addressInput, check: () => (addressInput.validity.valueMissing ? '#checkout-address-error' : null) },
  { input: cityInput, check: () => (cityInput.validity.valueMissing ? '#checkout-city-error' : null) },
  { input: postalInput, check: () => (postalInput.validity.valueMissing ? '#checkout-postal-error' : null) },
];

function setFieldError(input, errorSelector) {
  for (const p of input.closest('.field').querySelectorAll('.field__error')) p.hidden = true;
  if (errorSelector) {
    const errorEl = document.querySelector(errorSelector);
    errorEl.hidden = false;
    input.setAttribute('aria-invalid', 'true');
    input.setAttribute('aria-describedby', errorEl.id);
  } else {
    input.removeAttribute('aria-invalid');
    input.removeAttribute('aria-describedby');
  }
}

form.addEventListener('submit', (event) => {
  event.preventDefault();
  successEl.hidden = true;

  let firstInvalid = null;
  for (const { input, check } of FIELDS) {
    const errorSelector = check();
    setFieldError(input, errorSelector);
    if (errorSelector && !firstInvalid) firstInvalid = input;
  }

  if (firstInvalid) {
    // #checkout-summary is itself aria-live; announcing through #i18n-status as
    // well made every failure arrive twice in a row.
    summaryEl.textContent = t('checkout.errorSummary', 'There are errors in the form. Please review the highlighted fields.');
    firstInvalid.focus();
    return;
  }

  summaryEl.textContent = '';
  form.reset();
  for (const { input } of FIELDS) setFieldError(input, null);
  // Likewise: #checkout-success carries role="status" aria-live="polite".
  successEl.hidden = false;
});
