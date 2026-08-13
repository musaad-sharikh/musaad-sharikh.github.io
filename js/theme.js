const STORAGE_KEY = 'portfolio:theme';

function stored() {
  try { return localStorage.getItem(STORAGE_KEY); } catch { return null; }
}

function systemPreference() {
  return matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light';
}

export function createTheme() {
  const el = document.documentElement;
  const apply = (theme) => {
    el.dataset.theme = theme;
    try { localStorage.setItem(STORAGE_KEY, theme); } catch {}
    document.dispatchEvent(new CustomEvent('themechange', { detail: { theme } }));
  };
  return {
    current: () => el.dataset.theme || systemPreference(),
    toggle() { apply(this.current() === 'dark' ? 'light' : 'dark'); },
    boot() { const s = stored(); if (s) apply(s); },
  };
}

// The label depends on two independent things — the theme and the language — so this
// button owns its own aria-label outright and carries no data-i18n-attr. Letting the
// i18n engine manage an attribute that another module also rewrites would corrupt the
// engine's cache of English originals.
export function mountThemeToggle({ button, theme, i18n, dictionary }) {
  const label = (key, english) =>
    i18n.current() === 'ar' ? (dictionary[key] ?? english) : english;

  const sync = () => {
    const dark = theme.current() === 'dark';
    button.setAttribute('aria-pressed', String(dark));
    button.setAttribute(
      'aria-label',
      dark
        ? label('theme.toLight', 'Switch to light theme')
        : label('theme.toDark', 'Switch to dark theme'),
    );
  };

  button.addEventListener('click', () => { theme.toggle(); sync(); });
  document.addEventListener('themechange', sync);
  document.addEventListener('languagechange', sync);
  sync();
}
