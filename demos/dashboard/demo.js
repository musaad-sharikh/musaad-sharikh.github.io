import { createI18n, mountLanguageToggle } from '../../js/i18n.js';
import { createTheme, mountThemeToggle } from '../../js/theme.js';
import { lineChart, barChart, donutChart } from './charts.js';
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

function announce(text) {
  // Clearing first forces a re-announcement when the same message repeats.
  status.textContent = '';
  requestAnimationFrame(() => { status.textContent = text; });
}

// Small templating helper for strings resolved at runtime rather than applied
// by the shared i18n engine — chart labels are folded into SVG strings built
// here, which the engine's fixed key-per-element model can't reach (the SVG
// is aria-hidden and re-rendered wholesale, not patched node by node).
function t(key, english, vars = {}) {
  const raw = i18n.current() === 'ar' ? (dictionary[key] ?? english) : english;
  return Object.entries(vars).reduce((s, [name, value]) => s.replaceAll(`{${name}}`, value), raw);
}

// Chart data ----------------------------------------------------------------
// Synthetic sample data only — see the visible note on the page. Kept in sync
// with the static <table> rows in index.html, which are the accessible twin
// of each chart (a <details> element right below it).
const MONTH_KEYS = [
  ['chart.month.jan', 'Jan'],
  ['chart.month.feb', 'Feb'],
  ['chart.month.mar', 'Mar'],
  ['chart.month.apr', 'Apr'],
  ['chart.month.may', 'May'],
  ['chart.month.jun', 'Jun'],
];
const TREND_DATA = {
  organic: [12, 15, 14, 18, 22, 25],
  paid: [6, 7, 9, 8, 11, 13],
};

const CHANNEL_KEYS = [
  ['chart.channel.direct', 'Direct', 9],
  ['chart.channel.organicSearch', 'Organic Search', 14],
  ['chart.channel.social', 'Social', 6],
  ['chart.channel.referral', 'Referral', 4],
  ['chart.channel.email', 'Email', 3],
];

const DEVICE_KEYS = [
  ['devices.legend.desktop', 'Desktop', 58],
  ['devices.legend.mobile', 'Mobile', 35],
  ['devices.legend.tablet', 'Tablet', 7],
];

// Charts colour strictly through var(--chart-N) (see charts.js), so a theme
// change repaints them with zero JavaScript. A language change is the only
// thing that forces a re-render: direction mirrors, and label text embedded
// in the SVG (axis ticks, end-of-line labels) must be re-resolved.
function renderCharts() {
  const dir = document.documentElement.dir === 'rtl' ? 'rtl' : 'ltr';

  const trendSvg = lineChart({
    series: [
      { label: t('trend.legend.organic', 'Organic'), points: TREND_DATA.organic },
      { label: t('trend.legend.paid', 'Paid'), points: TREND_DATA.paid },
    ],
    width: 640,
    height: 280,
    dir,
    xLabels: MONTH_KEYS.map(([key, english]) => t(key, english)),
  });
  document.querySelector('#chart-trend').innerHTML = trendSvg;

  const channelSvg = barChart({
    data: CHANNEL_KEYS.map(([key, english, value]) => ({ label: t(key, english), value })),
    width: 640,
    height: 260,
    dir,
  });
  document.querySelector('#chart-channels').innerHTML = channelSvg;

  const deviceSvg = donutChart({
    data: DEVICE_KEYS.map(([key, english, value]) => ({ label: t(key, english), value })),
    size: 220,
  });
  document.querySelector('#chart-devices').innerHTML = deviceSvg;
}

document.addEventListener('languagechange', renderCharts);
renderCharts();

// Sortable table ("Top pages") ----------------------------------------------
// Native <button> elements inside each <th> give keyboard operability for
// free (Enter/Space activate them without any extra keydown handling).
// aria-sort lives on the <th>, per the WAI-ARIA table sort pattern; each
// cell's sort key lives in a stable data-value attribute rather than being
// parsed from (possibly translated) textContent, so sorting is unaffected by
// language and by display formatting (thousands separators, mm:ss, "%").
function initSortableTable(table) {
  const tbody = table.querySelector('tbody');
  const buttons = [...table.querySelectorAll('.sort-btn')];

  function setIndicator(button, direction) {
    const indicator = button.querySelector('.sort-btn__indicator');
    indicator.textContent = direction === 'ascending' ? '▲' : direction === 'descending' ? '▼' : '';
  }

  for (const button of buttons) {
    button.addEventListener('click', () => {
      const th = button.closest('th');
      const nextSort = th.getAttribute('aria-sort') === 'ascending' ? 'descending' : 'ascending';

      for (const otherButton of buttons) {
        otherButton.closest('th').setAttribute('aria-sort', 'none');
        setIndicator(otherButton, 'none');
      }
      th.setAttribute('aria-sort', nextSort);
      setIndicator(button, nextSort);

      const columnIndex = th.cellIndex;
      const isNumeric = button.dataset.sortType === 'number';
      const rows = [...tbody.querySelectorAll('tr')];
      rows.sort((a, b) => {
        const aValue = a.children[columnIndex].dataset.value;
        const bValue = b.children[columnIndex].dataset.value;
        const cmp = isNumeric
          ? Number(aValue) - Number(bValue)
          : aValue.localeCompare(bValue);
        return nextSort === 'ascending' ? cmp : -cmp;
      });
      for (const row of rows) tbody.append(row);

      const columnLabel = button.querySelector('span').textContent;
      const directionLabel = nextSort === 'ascending'
        ? t('sort.ascending', 'ascending')
        : t('sort.descending', 'descending');
      announce(t('sort.announcement', 'Sorted by {column}, {direction}', {
        column: columnLabel,
        direction: directionLabel,
      }));
    });
  }
}

const pagesTable = document.querySelector('#pages-table');
if (pagesTable) initSortableTable(pagesTable);
