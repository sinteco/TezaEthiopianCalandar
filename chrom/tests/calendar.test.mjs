import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createContext, SourceTextModule } from 'node:vm';

const calendarSource = await readFile(new URL('../ethiopic.js', import.meta.url), 'utf8');
const popupSource = await readFile(new URL('../popup.js', import.meta.url), 'utf8');
const html = await readFile(new URL('../popup.html', import.meta.url), 'utf8');
const calendarModule = new SourceTextModule(calendarSource);
await calendarModule.link(() => { throw new Error('Unexpected calendar import'); });
await calendarModule.evaluate();
const calendar = calendarModule.namespace;

test('every date from 1900 through 2100 matches Intl and round-trips', () => {
  const formatter = new Intl.DateTimeFormat('en-u-ca-ethiopic', {
    timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric',
  });
  assert.equal(formatter.resolvedOptions().calendar, 'ethiopic');
  for (let ms = Date.UTC(1900, 0, 1); ms <= Date.UTC(2100, 11, 31); ms += 86400000) {
    const date = new Date(ms);
    const expected = Object.fromEntries(formatter.formatToParts(date)
      .filter(({ type }) => ['year', 'month', 'day'].includes(type))
      .map(({ type, value }) => [type, Number(value)]));
    const gregorian = {
      year: date.getUTCFullYear(), month: date.getUTCMonth() + 1, day: date.getUTCDate(),
    };
    const actual = calendar.gregorianToEthiopic(gregorian.year, gregorian.month, gregorian.day);
    assert.deepEqual({ ...actual }, expected);
    assert.deepEqual({
      ...calendar.ethiopicToGregorian(actual.year, actual.month, actual.day),
    }, gregorian);
  }
});

test('Pagume length and leap-year boundary', () => {
  assert.equal(calendar.daysInEthiopicMonth(2018, 13), 5);
  assert.equal(calendar.daysInEthiopicMonth(2019, 13), 6);
  assert.deepEqual({ ...calendar.gregorianToEthiopic(2027, 9, 11) },
    { year: 2019, month: 13, day: 6 });
  assert.deepEqual({ ...calendar.gregorianToEthiopic(2027, 9, 12) },
    { year: 2020, month: 1, day: 1 });
});

test('Ethiopian clock follows Addis Ababa time regardless of the local zone', () => {
  // 06:00, 18:00 and 00:00 in Addis Ababa (UTC+3) expressed as UTC instants.
  for (const [utcHour, expectedHour, period] of [[3, 12, 'day'], [15, 12, 'night'], [21, 6, 'night']]) {
    assert.deepEqual({ ...calendar.toEthiopianTime(new Date(Date.UTC(2026, 9, 6, utcHour, 15))) },
      { hour: expectedHour, minute: 15, period });
  }
  assert.equal(calendar.formatEthiopianTime(new Date(Date.UTC(2026, 9, 6, 7, 5)), 'am'), '4:05 ቀን');
  assert.equal(calendar.formatEthiopianTime(new Date(Date.UTC(2026, 9, 6, 7, 5)), 'en'), '4:05 day');
});

async function openPopup({
  date = new Date(2026, 9, 6, 23, 59),
  storage = { get: async () => ({}), set: async () => {} },
  localStorage = {
    getItem: () => { throw new Error('Extension must not read localStorage'); },
    setItem: () => { throw new Error('Extension must not write localStorage'); },
  },
  chromeExtras = {},
  fetch = async () => { throw new Error('Unexpected network request'); },
} = {}) {
  let now = date;
  let tick;
  const errors = [];
  function makeElement() {
    const attributes = new Map();
    const classes = new Set();
    return {
      textContent: '', innerHTML: '', hidden: false, disabled: false,
      dataset: {}, listeners: {}, children: [],
      append(...children) { this.children.push(...children); },
      replaceChildren(...children) { this.children = children; },
      setAttribute: (key, value) => attributes.set(key, value),
      getAttribute: (key) => attributes.get(key),
      classList: {
        toggle: (key, active) => active ? classes.add(key) : classes.delete(key),
        contains: (key) => classes.has(key),
      },
      addEventListener(event, listener) { this.listeners[event] = listener; },
    };
  }
  const elements = new Map([...html.matchAll(/\bid="([^"]+)"/g)].map(([, id]) => [id, makeElement()]));
  const buttons = ['am', 'en'].map((lang) => {
    const button = elements.get(lang === 'am' ? 'langAm' : 'langEn');
    button.dataset.lang = lang;
    return button;
  });
  const document = {
    documentElement: { lang: 'en' },
    createElement: makeElement,
    getElementById(id) {
      assert.ok(elements.has(id), `Unknown element: ${id}`);
      return elements.get(id);
    },
    querySelectorAll(selector) {
      if (selector === '.lang-toggle button') return buttons;
      assert.equal(selector, '#days button');
      return [];
    },
  };
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [now.getTime()])); }
  }
  const context = createContext({
    document, Date: Clock, localStorage, AbortController, URL, URLSearchParams, fetch, Intl,
    chrome: storage ? { storage: { sync: storage }, ...chromeExtras } : undefined,
    console: { error: (...args) => errors.push(args) },
    setInterval(callback, delay) {
      assert.equal(delay, 30_000);
      tick = callback;
    },
  });
  const modules = new Map();
  const module = new SourceTextModule(popupSource, { context });
  await module.link(async (specifier) => {
    if (!modules.has(specifier)) {
      modules.set(specifier, readFile(new URL(`../${specifier}`, import.meta.url), 'utf8')
        .then(source => new SourceTextModule(source, { context })));
    }
    return modules.get(specifier);
  });
  await module.evaluate();
  return {
    document, errors,
    element: (id) => elements.get(id),
    setDate: (value) => { now = value; },
    tick: () => tick(),
    async selectDay(jdn) {
      const button = makeElement();
      button.dataset.jdn = String(jdn);
      elements.get('days').listeners.click({ target: { closest: () => button } });
      await new Promise(resolve => setImmediate(resolve));
    },
    async click(id) {
      const element = elements.get(id);
      assert.equal(element.disabled, false);
      await element.listeners.click();
    },
  };
}

test('header always shows Ethiopian and local clocks in both languages and matching-offset zones', async () => {
  const previousZone = process.env.TZ;
  try {
    for (const zone of ['Africa/Addis_Ababa', 'Africa/Nairobi', 'America/New_York']) {
      process.env.TZ = zone;
      const date = new Date('2026-10-06T10:00:00Z');
      const popup = await openPopup({ date });
      const local = new Intl.DateTimeFormat('en-US', {
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).format(date);
      assert.equal(popup.element('todayTime').textContent, `Ethiopian time: 7:00 day · Local time: ${local}`, zone);
      await popup.click('langAm');
      const localAm = new Intl.DateTimeFormat('am-ET', {
        hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
      }).format(date);
      assert.equal(popup.element('todayTime').textContent, `የኢትዮጵያ ሰዓት: 7:00 ቀን · የአካባቢ ሰዓት: ${localAm}`, zone);
    }
  } finally {
    if (previousZone === undefined) delete process.env.TZ;
    else process.env.TZ = previousZone;
  }
});

const monthListText = popup => popup.element('holidayNote').textContent;

test('month view preserves distinct coincident feasts and deduplicates shared identities', async () => {
  const cases = [
    { date: new Date(2026, 4, 1), keep: ['St George – martyrdom', 'ቅዱስ ጊዮርጊስ'], duplicate: null },
    { date: new Date(2026, 0, 7), keep: ['Birth of Lalibela', 'ልደተ ላሊበላ'], duplicate: ['Lidet (Genna)', 'ልደት (ገና)'] },
    { date: new Date(2026, 8, 11), keep: ['Raguel', 'ራጉኤል'], duplicate: ['Kidus Yohannes (New Year)', 'ቅዱስ ዮሐንስ (ርእሰ ዓውደ ዓመት)'] },
  ];
  for (const { date, keep, duplicate } of cases) {
    const popup = await openPopup({ date });
    for (const [index, lang] of ['en', 'am'].entries()) {
      if (lang === 'am') await popup.click('langAm');
      assert.ok(monthListText(popup).includes(keep[index]));
      assert.ok(popup.element('days').innerHTML.includes(keep[index]));
      if (duplicate) {
        assert.ok(!monthListText(popup).includes(duplicate[index]));
        assert.ok(!popup.element('days').innerHTML.includes(duplicate[index]));
      }
    }
  }
  const popup = await openPopup({ date: new Date(2026, 8, 27) });
  assert.ok(monthListText(popup).includes('Meskel'));
  assert.ok(!monthListText(popup).includes('Meskel – Finding'));
  await popup.click('langAm');
  assert.ok(!monthListText(popup).includes('መስቀል (ዓመታዊ)'));
});

test('month footer groups public holidays and Orthodox feasts in date order', async () => {
  const popup = await openPopup();
  const [holidays, also] = popup.element('holidayNote').textContent.split('\n');
  assert.match(holidays, /^Holidays: 1 – Enkutatash \(New Year\) · 17 – Meskel$/);
  assert.match(also, /^Also: 1 – Raguel · 16 – Demera/);
  await popup.click('langAm');
  assert.match(popup.element('holidayNote').textContent, /^በዓላት: 1 – እንቁጣጣሽ/);
});

test('selected day shows the Orthodox panel and appointments heading in both languages', async () => {
  const popup = await openPopup();
  await popup.selectDay(calendar.gregorianToJdn(2026, 10, 7));
  assert.equal(popup.element('appointmentsHeading').textContent, 'Appointments');
  assert.equal(popup.element('orthodoxHeading').textContent, 'Orthodox Tewahedo calendar');
  assert.match(popup.element('orthodoxSeason').textContent, /Season: Zemene Tsige/);
  assert.match(popup.element('orthodoxMonthly').textContent, /Medhane Alem/);
  await popup.click('langAm');
  assert.equal(popup.element('appointmentsHeading').textContent, 'ቀጠሮዎች');
  assert.equal(popup.element('orthodoxHeading').textContent, 'የኦርቶዶክስ ተዋሕዶ ቀን መቁጠሪያ');
});

test('midnight refreshes date and highlighted day', async () => {
  const popup = await openPopup();
  popup.setDate(new Date(2026, 9, 7, 0, 1));
  popup.tick();
  assert.match(popup.element('todayDate').textContent, /Wednesday, Meskerem 27/);
  assert.match(popup.element('days').innerHTML, /class="cell today" title="Wednesday, Meskerem 27/);
  assert.doesNotMatch(popup.element('days').innerHTML, /class="cell today" title="Tuesday, Meskerem 26/);
});

test('midnight follows the current month across Ethiopian new year', async () => {
  const popup = await openPopup({ date: new Date(2027, 8, 11, 23, 59) });
  assert.equal(popup.element('monthName').textContent, 'Pagume');
  popup.setDate(new Date(2027, 8, 12, 0, 1));
  popup.tick();
  assert.equal(popup.element('monthName').textContent, 'Meskerem');
  assert.equal(popup.element('yearNum').textContent, '2020 E.C.');
  assert.match(popup.element('todayDate').textContent, /Meskerem 1, 2020/);
});

test('rollover preserves a browsed month and Today refreshes before the timer', async () => {
  const popup = await openPopup({ date: new Date(2027, 8, 11, 23, 59) });
  await popup.click('prevMonth');
  popup.setDate(new Date(2027, 8, 12, 0, 1));
  popup.tick();
  assert.equal(popup.element('monthName').textContent, 'Nehase');
  assert.equal(popup.element('yearNum').textContent, '2019 E.C.');
  popup.setDate(new Date(2027, 8, 13, 0, 1));
  await popup.click('todayBtn');
  assert.equal(popup.element('monthName').textContent, 'Meskerem');
  assert.equal(popup.element('yearNum').textContent, '2020 E.C.');
  assert.match(popup.element('todayDate').textContent, /Meskerem 2, 2020/);
});

test('month and year buttons retain their navigation behavior', async () => {
  const popup = await openPopup();
  await popup.click('prevMonth');
  assert.equal(popup.element('monthName').textContent, 'Pagume');
  assert.equal((popup.element('days').innerHTML.match(/class="eth"/g) || []).length, 5);
  await popup.click('nextYear');
  assert.equal((popup.element('days').innerHTML.match(/class="eth"/g) || []).length, 6);
  await popup.click('prevYear');
  await popup.click('nextMonth');
  assert.equal(popup.element('monthName').textContent, 'Meskerem');
  assert.equal(popup.element('yearNum').textContent, '2019 E.C.');
});

test('language persists and updates document, toggle, and navigation accessibility', async () => {
  let saved = 'en';
  const storage = {
    get: async () => ({ lang: saved }),
    set: async ({ lang }) => { saved = lang; },
  };
  const popup = await openPopup({ storage });
  await popup.click('langAm');
  assert.equal(saved, 'am');
  assert.equal(popup.document.documentElement.lang, 'am');
  assert.equal(popup.element('langAm').getAttribute('aria-pressed'), 'true');
  assert.equal(popup.element('langEn').getAttribute('aria-pressed'), 'false');
  assert.equal(popup.element('prevMonth').getAttribute('aria-label'), 'ያለፈው ወር');
  assert.equal(popup.element('prevMonth').title, 'ያለፈው ወር');
  assert.equal((await openPopup({ storage })).document.documentElement.lang, 'am');
  await popup.click('langEn');
  assert.equal(popup.document.documentElement.lang, 'en');
  assert.equal(popup.element('nextYear').getAttribute('aria-label'), 'Next year');
});

test('failed saves retain the old language, report the error, and allow retry', async () => {
  let fail = true;
  let saved = 'en';
  const storage = {
    get: async () => ({ lang: saved }),
    set: async ({ lang }) => {
      if (fail) throw new Error('Sync unavailable');
      saved = lang;
    },
  };
  const popup = await openPopup({ storage });
  await popup.click('langAm');
  assert.equal(popup.document.documentElement.lang, 'en');
  assert.equal(popup.element('storageError').hidden, false);
  assert.match(popup.element('storageError').textContent, /Could not save/);
  assert.equal(popup.errors.length, 1);
  assert.equal((await openPopup({ storage })).document.documentElement.lang, 'en');
  fail = false;
  await popup.click('langAm');
  assert.equal(popup.document.documentElement.lang, 'am');
  assert.equal(popup.element('storageError').hidden, true);
});

test('language buttons are disabled until saving finishes', async () => {
  let finish;
  const popup = await openPopup({
    storage: { get: async () => ({}), set: () => new Promise(resolve => { finish = resolve; }) },
  });
  const pending = popup.click('langAm');
  assert.equal(popup.element('langAm').disabled, true);
  assert.equal(popup.element('langEn').disabled, true);
  finish();
  await pending;
  assert.equal(popup.element('langEn').disabled, false);
});

test('failed reads and invalid preferences are reported without breaking the calendar', async () => {
  for (const get of [
    async () => { throw new Error('Storage unavailable'); },
    async () => ({ lang: 'invalid' }),
  ]) {
    const popup = await openPopup({ storage: { get, set: async () => {} } });
    assert.equal(popup.document.documentElement.lang, 'en');
    assert.match(popup.element('storageError').textContent, /Could not load/);
    assert.equal(popup.element('storageError').hidden, false);
    assert.equal(popup.errors.length, 1);
    assert.equal(popup.element('monthName').textContent, 'Meskerem');
  }
});

test('browser preview saves through localStorage, without Chrome APIs', async () => {
  let saved = 'am';
  const popup = await openPopup({
    storage: null,
    localStorage: { getItem: () => saved, setItem: (key, value) => { saved = value; } },
  });
  assert.equal(popup.document.documentElement.lang, 'am');
  await popup.click('langEn');
  assert.equal(saved, 'en');
});

test('date selection shows the built-in holiday and an honest preview message', async () => {
  const popup = await openPopup();
  await popup.selectDay(calendar.ethiopicToJdn(2019, 1, 17));
  assert.equal(popup.element('dayDetails').hidden, false);
  assert.match(popup.element('selectedHoliday').textContent, /Meskel/);
  assert.match(popup.element('appointmentStatus').textContent, /installed Chrome extension/);
  assert.equal(popup.element('connectGoogle').hidden, true);
  await popup.click('langAm');
  // This mock's sync storage succeeds, so the detail language changes too.
  assert.equal(popup.document.documentElement.lang, 'am');
  assert.match(popup.element('selectedHoliday').textContent, /መስቀል/);
  await popup.click('nextMonth');
  assert.equal(popup.element('dayDetails').hidden, true);
});

function googleMocks(fetchEvents) {
  return {
    chromeExtras: {
      identity: { getAuthToken: async () => ({ token: 'test-token' }) },
      runtime: { getManifest: () => ({ oauth2: { scopes: [] } }) },
      storage: {
        sync: { get: async () => ({ lang: 'en' }), set: async () => {} },
        local: { get: async () => ({ googleConnected: true }) },
      },
    },
    fetch: async url => ({
      ok: true, status: 200,
      json: async () => url.pathname.endsWith('/calendarList')
        ? { items: [{ id: 'primary-id', summary: 'Work', selected: true }] }
        : { items: await fetchEvents(url) },
    }),
  };
}

test('Google appointments are rendered as text and marked for holiday conflicts', async () => {
  const popup = await openPopup(googleMocks(async () => [{
    summary: '<img src=x onerror=alert(1)>',
    start: { date: '2026-09-27' }, end: { date: '2026-09-28' },
  }]));
  await popup.selectDay(calendar.gregorianToJdn(2026, 9, 27));
  const [item] = popup.element('appointmentList').children;
  assert.ok(item);
  assert.equal(item.children[0].textContent, '<img src=x onerror=alert(1)>');
  assert.equal(item.children[0].innerHTML, '');
  assert.match(item.children[2].textContent, /Holiday conflict: Meskel/);
  assert.equal(popup.element('appointmentError').hidden, true);
});

test('Timket appointment conflicts follow the observed 2024 date rather than January 19', async () => {
  for (const day of [19, 20]) {
    const popup = await openPopup(googleMocks(async () => [{
      summary: 'Meeting',
      start: { date: `2024-01-${day}` }, end: { date: `2024-01-${day + 1}` },
    }]));
    await popup.selectDay(calendar.gregorianToJdn(2024, 1, day));
    const warnings = popup.element('appointmentList').children[0].children
      .filter(child => child.className === 'conflict-warning');
    assert.equal(warnings.length, day === 20 ? 1 : 0);
    if (day === 20) assert.match(warnings[0].textContent, /Timket/);
  }
});

test('estimated Islamic dates remain qualified in appointment conflicts in both languages', async () => {
  for (const [year, month, day] of [[2027, 3, 10], [2025, 3, 30]]) {
    const popup = await openPopup(googleMocks(async () => [{
      summary: 'Meeting',
      start: { date: `${year}-03-${day}` }, end: { date: `${year}-03-${day + 1}` },
    }]));
    await popup.selectDay(calendar.gregorianToJdn(year, month, day));
    assert.match(popup.element('appointmentList').children[0].children[2].textContent, /Eid al-Fitr \(estimated\)/);
    assert.equal(popup.element('holidayCoverage').hidden, false);
    assert.match(popup.element('holidayCoverage').textContent, /not been verified/);
    await popup.click('langAm');
    assert.match(popup.element('appointmentList').children[0].children[2].textContent, /\(ግምት\)/);
  }
});

test('a late response cannot overwrite a newly selected date', async () => {
  let finishFirst;
  let requests = 0;
  const popup = await openPopup(googleMocks(() => {
    if (++requests === 1) return new Promise(resolve => { finishFirst = resolve; });
    return [{
      summary: 'Second date appointment',
      start: { date: '2026-10-07' }, end: { date: '2026-10-08' },
    }];
  }));
  await popup.selectDay(calendar.gregorianToJdn(2026, 10, 6));
  await popup.selectDay(calendar.gregorianToJdn(2026, 10, 7));
  finishFirst([{
    summary: 'Stale first date',
    start: { date: '2026-10-06' }, end: { date: '2026-10-07' },
  }]);
  await new Promise(resolve => setImmediate(resolve));
  assert.equal(popup.element('appointmentList').children[0].children[0].textContent, 'Second date appointment');
  assert.equal(popup.element('selectedGregorian').textContent, '2026-10-07');
});

test('Google errors are not presented as an empty appointment list', async () => {
  const mocks = googleMocks(async () => []);
  mocks.fetch = async () => ({ ok: false, status: 403 });
  const popup = await openPopup(mocks);
  await popup.selectDay(calendar.gregorianToJdn(2026, 10, 6));
  assert.equal(popup.element('appointmentError').hidden, false);
  assert.match(popup.element('appointmentError').textContent, /denied access/);
  assert.equal(popup.element('appointmentStatus').textContent, '');
  assert.equal(popup.element('connectGoogle').hidden, false);
  assert.equal(popup.errors.length, 1);
});
