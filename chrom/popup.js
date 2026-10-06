import {
  MONTHS,
  WEEKDAYS_SHORT,
  GREGORIAN_MONTHS_SHORT,
  daysInEthiopicMonth,
  dateToEthiopic,
  ethiopicToJdn,
  jdnToGregorian,
  weekdayFromJdn,
  formatEthiopianTime,
  formatEthiopicDate,
} from './ethiopic.js';
import { holidaysForJdn } from './holidays.js';
import { majorOrthodoxFeasts } from './orthodox.js';
import { createAppointments } from './appointments.js';

const UI = {
  am: {
    today: 'ዛሬ',
    time: 'የኢትዮጵያ ሰዓት',
    localTime: 'የአካባቢ ሰዓት',
    yearSuffix: 'ዓ.ም.',
    holidays: 'በዓላት',
    observances: 'ሌሎች',
    estimated: 'ግምት',
    language: 'ቋንቋ',
    prevYear: 'ያለፈው ዓመት',
    prevMonth: 'ያለፈው ወር',
    nextMonth: 'የሚቀጥለው ወር',
    nextYear: 'የሚቀጥለው ዓመት',
    loadError: 'የቋንቋ ምርጫዎን መጫን አልተቻለም። እንደገና ይምረጡ።',
    saveError: 'የቋንቋ ምርጫዎን ማስቀመጥ አልተቻለም። እንደገና ይሞክሩ።',
    dateHint: 'ቀጠሮዎችን እና በዓላትን ለማየት ቀን ይምረጡ።',
  },
  en: {
    today: 'Today',
    time: 'Ethiopian time',
    localTime: 'Local time',
    yearSuffix: 'E.C.',
    holidays: 'Holidays',
    observances: 'Also',
    estimated: 'est.',
    language: 'Language',
    prevYear: 'Previous year',
    prevMonth: 'Previous month',
    nextMonth: 'Next month',
    nextYear: 'Next year',
    loadError: 'Could not load your language preference. Please select it again.',
    saveError: 'Could not save your language preference. Please try again.',
    dateHint: 'Click a date to see appointments and holidays.',
  },
};

const $ = (id) => document.getElementById(id);

const state = {
  lang: 'en',
  year: 0,
  month: 0,
  error: null,
  selectedJdn: null,
};

const appointments = createAppointments(() => state.lang);

let today = dateToEthiopic(new Date());
let todayJdn = ethiopicToJdn(today.year, today.month, today.day);

// Browser previews use localStorage; the extension uses sync storage exclusively.
const syncStorage = globalThis.chrome?.storage?.sync;

async function loadLang() {
  const lang = syncStorage
    ? (await syncStorage.get('lang')).lang
    : localStorage.getItem('lang');
  if (lang == null) return 'en';
  if (lang !== 'am' && lang !== 'en') {
    throw new Error('Invalid saved language preference');
  }
  return lang;
}

async function saveLang(lang) {
  if (syncStorage) {
    await syncStorage.set({ lang });
  } else {
    localStorage.setItem('lang', lang);
  }
}

function reportStorageError(key, error) {
  console.error(UI.en[key], error);
  state.error = key;
}

function refreshDate(now) {
  const nextToday = dateToEthiopic(now);
  const nextJdn = ethiopicToJdn(nextToday.year, nextToday.month, nextToday.day);
  if (nextJdn === todayJdn) return false;

  if (state.year === today.year && state.month === today.month) {
    if (state.year !== nextToday.year || state.month !== nextToday.month) clearSelection();
    state.year = nextToday.year;
    state.month = nextToday.month;
  }
  today = nextToday;
  todayJdn = nextJdn;
  return true;
}

function formatGregorian({ year, month, day }) {
  return `${GREGORIAN_MONTHS_SHORT[month - 1]} ${day}, ${year}`;
}

function renderToday() {
  const now = new Date();
  if (refreshDate(now)) renderMonth();
  const t = UI[state.lang];
  const weekday = weekdayFromJdn(todayJdn);
  $('todayDay').textContent = today.day;
  $('todayDate').textContent = formatEthiopicDate(today, weekday, state.lang);
  $('todayGreg').textContent = formatGregorian(jdnToGregorian(todayJdn));

  const et = formatEthiopianTime(now, state.lang);
  const local = new Intl.DateTimeFormat(state.lang === 'am' ? 'am-ET' : 'en-US', {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(now);
  $('todayTime').textContent = `${t.time}: ${et} · ${t.localTime}: ${local}`;

  $('todayBtn').textContent = t.today;
}

function renderLanguage() {
  const t = UI[state.lang];
  document.documentElement.lang = state.lang;
  $('languageToggle').setAttribute('aria-label', t.language);
  document.querySelectorAll('.lang-toggle button').forEach((b) => {
    const active = b.dataset.lang === state.lang;
    b.classList.toggle('active', active);
    b.setAttribute('aria-pressed', String(active));
  });
  for (const id of ['prevYear', 'prevMonth', 'nextMonth', 'nextYear']) {
    $(id).title = t[id];
    $(id).setAttribute('aria-label', t[id]);
  }
  $('storageError').textContent = state.error ? t[state.error] : '';
  $('storageError').hidden = !state.error;
  $('dateHint').textContent = t.dateHint;
}

function renderWeekdays() {
  $('weekdays').innerHTML = WEEKDAYS_SHORT[state.lang].map((d) => `<div>${d}</div>`).join('');
}

function renderMonth() {
  const { year, month, lang } = state;
  const t = UI[lang];
  $('monthName').textContent = MONTHS[lang][month - 1];
  $('yearNum').textContent = `${year} ${t.yearSuffix}`;

  const days = daysInEthiopicMonth(year, month);
  const firstJdn = ethiopicToJdn(year, month, 1);
  const lastJdn = firstJdn + days - 1;
  const firstWeekday = weekdayFromJdn(firstJdn);

  const gStart = jdnToGregorian(firstJdn);
  const gEnd = jdnToGregorian(lastJdn);
  $('gregRange').textContent = `${formatGregorian(gStart)} – ${formatGregorian(gEnd)}`;

  const cells = [];
  for (let i = 0; i < firstWeekday; i++) cells.push('<div class="cell empty"></div>');

  const monthEvents = [];
  for (let d = 1; d <= days; d++) {
    const jdn = firstJdn + d - 1;
    const g = jdnToGregorian(jdn);
    const wd = weekdayFromJdn(jdn);
    const dayHolidays = holidaysForJdn(jdn, lang);
    const label = (h) => h.estimated ? `${h.name} (${t.estimated})` : h.name;
    for (const h of dayHolidays) monthEvents.push({ day: d, name: label(h), type: 'public' });
    const feasts = majorOrthodoxFeasts(jdn, lang, dayHolidays.map(h => h.id));
    for (const name of feasts) monthEvents.push({ day: d, name, type: 'observance' });

    const classes = ['cell'];
    if (jdn === todayJdn) classes.push('today');
    if (wd === 0) classes.push('sunday');
    if (dayHolidays.length) classes.push('holiday');
    else if (feasts.length) classes.push('observance');

    // Show the Gregorian month abbreviation only on the 1st of a Gregorian month (and the first cell).
    const gregLabel = g.day === 1 || d === 1 ? `${GREGORIAN_MONTHS_SHORT[g.month - 1]} ${g.day}` : g.day;
    const holidayText = [...dayHolidays.map(label), ...feasts].join(', ');
    const title = `${formatEthiopicDate({ year, month, day: d }, wd, lang)}\n${formatGregorian(g)}${holidayText ? `\n${holidayText}` : ''}`;

    cells.push(
      `<button class="${classes.join(' ')}" title="${title}" type="button" data-jdn="${jdn}" aria-label="${title.replaceAll('\n', ', ')}" aria-pressed="${jdn === state.selectedJdn}"${jdn === todayJdn ? ' aria-current="date"' : ''}><span class="eth">${d}</span><span class="greg" lang="en">${gregLabel}</span></button>`
    );
  }
  $('days').innerHTML = cells.join('');
  const publicList = monthEvents.filter((e) => e.type === 'public').map((e) => `${e.day} – ${e.name}`);
  const observanceList = monthEvents.filter((e) => e.type === 'observance').map((e) => `${e.day} – ${e.name}`);
  const lines = [];
  if (publicList.length) lines.push(`${t.holidays}: ${publicList.join(' · ')}`);
  if (observanceList.length) lines.push(`${t.observances}: ${observanceList.join(' · ')}`);
  $('holidayNote').textContent = lines.join('\n');
}

function render() {
  renderLanguage();
  renderToday();
  renderWeekdays();
  renderMonth();
  appointments.render();
}

function clearSelection() {
  state.selectedJdn = null;
  appointments.clear();
}

function shiftMonth(delta) {
  clearSelection();
  let m = state.month + delta;
  let y = state.year;
  while (m > 13) {
    m -= 13;
    y += 1;
  }
  while (m < 1) {
    m += 13;
    y -= 1;
  }
  state.month = m;
  state.year = y;
  renderMonth();
}

function shiftYear(delta) {
  clearSelection();
  state.year += delta;
  renderMonth();
}

function goToday() {
  clearSelection();
  renderToday();
  state.year = today.year;
  state.month = today.month;
  renderMonth();
}

async function init() {
  try {
    state.lang = await loadLang();
  } catch (error) {
    reportStorageError('loadError', error);
  }
  goToday();
  render();

  $('prevMonth').addEventListener('click', () => shiftMonth(-1));
  $('nextMonth').addEventListener('click', () => shiftMonth(1));
  $('prevYear').addEventListener('click', () => shiftYear(-1));
  $('nextYear').addEventListener('click', () => shiftYear(1));
  $('todayBtn').addEventListener('click', goToday);
  $('days').addEventListener('click', (event) => {
    const button = event.target.closest('button[data-jdn]');
    if (!button) return;
    state.selectedJdn = Number(button.dataset.jdn);
    document.querySelectorAll('#days button').forEach((day) => {
      day.setAttribute('aria-pressed', String(day === button));
    });
    void appointments.select(state.selectedJdn);
  });

  const languageButtons = document.querySelectorAll('.lang-toggle button');
  languageButtons.forEach((b) => {
    b.addEventListener('click', async () => {
      languageButtons.forEach((button) => { button.disabled = true; });
      try {
        await saveLang(b.dataset.lang);
        state.lang = b.dataset.lang;
        state.error = null;
      } catch (error) {
        reportStorageError('saveError', error);
      } finally {
        languageButtons.forEach((button) => { button.disabled = false; });
      }
      render();
    });
  });

  // Keep the Ethiopian clock ticking while the popup is open.
  setInterval(renderToday, 30_000);
}

await init();
