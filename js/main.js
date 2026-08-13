import { createI18n, mountLanguageToggle } from './i18n.js';
import { createTheme, mountThemeToggle } from './theme.js';
import dictionary from '../i18n/ar.js';

// i18n is created before the theme toggle mounts, because the theme button's
// aria-label is written in the active language.
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

// Scroll spy: mark the nav link for the section currently in view.
const links = new Map(
  [...document.querySelectorAll('.nav__list a[href^="#"]')].map((a) => [a.hash.slice(1), a]),
);
const spy = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      const link = links.get(entry.target.id);
      if (!link) continue;
      link.classList.toggle('is-current', entry.isIntersecting);
      if (entry.isIntersecting) link.setAttribute('aria-current', 'true');
      else link.removeAttribute('aria-current');
    }
  },
  { rootMargin: '-45% 0px -45% 0px' },
);
for (const id of links.keys()) {
  const section = document.getElementById(id);
  if (section) spy.observe(section);
}
