import { createI18n, mountLanguageToggle } from '../../js/i18n.js';
import { createTheme, mountThemeToggle } from '../../js/theme.js';
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

const status = document.querySelector('#i18n-status');

function announce(key, english) {
  const text = i18n.current() === 'ar' ? (dictionary[key] ?? english) : english;
  // Clearing first forces a re-announcement when the same message repeats.
  status.textContent = '';
  requestAnimationFrame(() => { status.textContent = text; });
}

// Direction override: applies only to the gallery container, so a reviewer can
// inspect a component in the other direction without switching the page
// language. The default is "auto", which carries NO dir attribute at all, so
// the gallery inherits from <html> and follows the page. Pinning the gallery to
// a direction by default would strand an Arabic reader in an LTR gallery.
const gallery = document.querySelector('#gallery');
for (const radio of document.querySelectorAll('input[name="dir-override"]')) {
  radio.addEventListener('change', () => {
    if (!radio.checked) return;
    if (radio.value === 'auto') gallery.removeAttribute('dir');
    else gallery.dir = radio.value;
  });
}

// Copy-to-clipboard --------------------------------------------------------
for (const button of document.querySelectorAll('[data-copy]')) {
  button.addEventListener('click', async () => {
    const code = document.getElementById(button.dataset.copy).textContent;
    try {
      await navigator.clipboard.writeText(code);
      announce('copy.done', 'Snippet copied');
    } catch {
      announce('copy.failed', 'Could not copy — select the snippet and copy manually');
    }
  });
}

// Tabs (WAI-ARIA tabs pattern, roving tabindex, direction-aware) -----------
//
// The arrow-key direction must follow the tablist's actual rendering
// direction, not the page's language. Reading getComputedStyle(...).direction
// picks up whichever `dir` attribute is currently in effect — the document's
// or the gallery override's — so this works correctly under both. In RTL,
// ArrowLeft moves to the *next* tab (higher index) and ArrowRight moves to
// the *previous* one (lower index): the key still moves selection toward the
// reading direction's "next", it is only the physical arrow that flips.
function initTabs(tablist) {
  const tabs = [...tablist.querySelectorAll('[role="tab"]')];
  const panels = tabs.map((tab) => document.getElementById(tab.getAttribute('aria-controls')));

  function select(index, { focus = true } = {}) {
    tabs.forEach((tab, i) => {
      const active = i === index;
      tab.setAttribute('aria-selected', String(active));
      tab.tabIndex = active ? 0 : -1;
      panels[i].hidden = !active;
    });
    if (focus) tabs[index].focus();
  }

  tablist.addEventListener('keydown', (event) => {
    const currentIndex = tabs.indexOf(document.activeElement);
    if (currentIndex === -1) return;

    const rtl = getComputedStyle(tablist).direction === 'rtl';
    let next;
    switch (event.key) {
      case 'ArrowRight':
        next = rtl ? currentIndex - 1 : currentIndex + 1;
        break;
      case 'ArrowLeft':
        next = rtl ? currentIndex + 1 : currentIndex - 1;
        break;
      case 'Home':
        next = 0;
        break;
      case 'End':
        next = tabs.length - 1;
        break;
      default:
        return;
    }
    event.preventDefault();
    select((next + tabs.length) % tabs.length);
  });

  tabs.forEach((tab, i) => {
    tab.addEventListener('click', () => select(i, { focus: false }));
  });
}

for (const tablist of document.querySelectorAll('[role="tablist"]')) initTabs(tablist);

// Toast ----------------------------------------------------------------
const toastTrigger = document.querySelector('#toast-trigger');
const toastBox = document.querySelector('#toast-box');
let toastTimer = null;

toastTrigger?.addEventListener('click', () => {
  toastBox.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => { toastBox.hidden = true; }, 4000);
});

// Modal dialog: native <dialog> gives focus trapping, Escape handling, and
// focus restoration to the trigger on close for free.
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
