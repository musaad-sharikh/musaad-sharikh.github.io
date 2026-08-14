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
// Crossing a boundary puts two sections inside the observer's band at once, and
// marking both is wrong twice over: aria-current names THE current item, not a
// set, and two highlighted nav links read as two places at once. The set of
// intersecting sections is tracked instead, and whichever comes first in
// document order wins — so exactly one link carries the state at any moment.
const visible = new Set();

function markCurrent() {
  let winner = null;
  for (const id of links.keys()) {
    if (visible.has(id)) { winner = id; break; }
  }
  for (const [id, link] of links) {
    const isCurrent = id === winner;
    link.classList.toggle('is-current', isCurrent);
    if (isCurrent) link.setAttribute('aria-current', 'true');
    else link.removeAttribute('aria-current');
  }
}

const spy = new IntersectionObserver(
  (entries) => {
    for (const entry of entries) {
      if (entry.isIntersecting) visible.add(entry.target.id);
      else visible.delete(entry.target.id);
    }
    markCurrent();
  },
  { rootMargin: '-45% 0px -45% 0px' },
);
for (const id of links.keys()) {
  const section = document.getElementById(id);
  if (section) spy.observe(section);
}
