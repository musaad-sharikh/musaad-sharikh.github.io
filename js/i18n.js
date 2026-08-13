export const LANGS = Object.freeze(['en', 'ar']);
export const DEFAULT_LANG = 'en';
export const STORAGE_KEY = 'portfolio:lang';

const DIR = { en: 'ltr', ar: 'rtl' };

export function oppositeOf(lang) {
  return lang === 'ar' ? 'en' : 'ar';
}

export function resolveLanguage({ search = '', stored = null } = {}) {
  const queried = new URLSearchParams(search).get('lang');
  if (LANGS.includes(queried)) return queried;
  if (LANGS.includes(stored)) return stored;
  return DEFAULT_LANG;
}

function readStored() {
  try {
    return localStorage.getItem(STORAGE_KEY);
  } catch {
    return null; // private browsing, storage disabled
  }
}

function writeStored(lang) {
  try {
    localStorage.setItem(STORAGE_KEY, lang);
  } catch {
    /* non-fatal */
  }
}

export function createI18n({ root, dictionary, statusEl = null }) {
  // English originals, captured once from the served HTML.
  const originals = new Map();
  let current = DEFAULT_LANG;

  function cache(node, prop, value) {
    const bucket = originals.get(node) ?? {};
    if (!(prop in bucket)) {
      bucket[prop] = value;
      originals.set(node, bucket);
    }
  }

  function applyText(lang) {
    for (const node of root.querySelectorAll('[data-i18n]')) {
      const key = node.dataset.i18n;
      cache(node, 'text', node.textContent);
      node.textContent = lang === 'ar' ? (dictionary[key] ?? originals.get(node).text)
                                       : originals.get(node).text;
    }
  }

  function applyAttrs(lang) {
    // data-i18n-attr="aria-label:nav.menu, title:nav.menuTitle"
    for (const node of root.querySelectorAll('[data-i18n-attr]')) {
      for (const pair of node.dataset.i18nAttr.split(',')) {
        const [attr, key] = pair.split(':').map((s) => s.trim());
        if (!attr || !key) continue;
        cache(node, attr, node.getAttribute(attr) ?? '');
        node.setAttribute(attr, lang === 'ar' ? (dictionary[key] ?? originals.get(node)[attr])
                                              : originals.get(node)[attr]);
      }
    }
  }

  function apply(lang) {
    current = LANGS.includes(lang) ? lang : DEFAULT_LANG;
    const el = root.documentElement;
    el.lang = current;
    el.dir = DIR[current];
    applyText(current);
    applyAttrs(current);
    writeStored(current);

    const url = new URL(root.location.href);
    url.searchParams.set('lang', current);
    history.replaceState(null, '', url);

    if (statusEl) {
      statusEl.textContent = current === 'ar' ? 'تم تغيير اللغة إلى العربية'
                                              : 'Language changed to English';
    }
    root.dispatchEvent(new CustomEvent('languagechange', { detail: { lang: current } }));
  }

  return {
    apply,
    current: () => current,
    toggle() {
      apply(oppositeOf(current));
      return current;
    },
    boot() {
      apply(resolveLanguage({ search: root.location.search, stored: readStored() }));
    },
  };
}

export function mountLanguageToggle({ button, i18n }) {
  const sync = () => {
    const lang = i18n.current();
    button.setAttribute('aria-pressed', String(lang === 'ar'));
    // The button always advertises the language it switches TO.
    button.textContent = lang === 'ar' ? 'EN' : 'ع';
    button.setAttribute('aria-label', lang === 'ar' ? 'Switch to English' : 'التبديل إلى العربية');
  };
  button.addEventListener('click', () => { i18n.toggle(); sync(); });
  document.addEventListener('languagechange', sync);
  sync();
}
