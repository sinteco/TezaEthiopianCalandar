import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createContext, SourceTextModule } from 'node:vm';

const context = createContext({ Intl, Date, Math, Number, Map });
const calendarModule = new SourceTextModule(await readFile(new URL('../ethiopic.js', import.meta.url), 'utf8'), { context });
const holidaysModule = new SourceTextModule(await readFile(new URL('../holidays.js', import.meta.url), 'utf8'), { context });
await holidaysModule.link(() => calendarModule);
await holidaysModule.evaluate();
const { gregorianToJdn, jdnToGregorian } = calendarModule.namespace;
const holidays = holidaysModule.namespace;

const names = (y, m, d, lang = 'en') => Array.from(holidays.holidaysForJdn(gregorianToJdn(y, m, d), lang), (h) => h.name);
const iso = (jdn) => {
  const g = jdnToGregorian(jdn);
  return `${g.year}-${String(g.month).padStart(2, '0')}-${String(g.day).padStart(2, '0')}`;
};

test('Fasika matches Eastern Orthodox Easter for 2020–2030', () => {
  const expected = {
    2020: '2020-04-19', 2021: '2021-05-02', 2022: '2022-04-24', 2023: '2023-04-16',
    2024: '2024-05-05', 2025: '2025-04-20', 2026: '2026-04-12', 2027: '2027-05-02',
    2028: '2028-04-16', 2029: '2029-04-08', 2030: '2030-04-28',
  };
  for (const [year, date] of Object.entries(expected)) {
    assert.equal(iso(holidays.fasikaJdn(Number(year))), date, `Fasika ${year}`);
  }
});

test('movable Orthodox public holidays are placed relative to Fasika', () => {
  // 2026: Fasika Apr 12 (Sunday)
  assert.deepEqual(names(2026, 4, 12), ['Fasika (Easter)']);
  assert.deepEqual(names(2026, 4, 10), ['Siklet (Good Friday)']);
  assert.deepEqual(names(2026, 4, 12, 'am'), ['ፋሲካ (ትንሣኤ)']);
  // Non-public feasts live in orthodox.js, not here.
  assert.deepEqual(names(2026, 4, 5), []);
  assert.deepEqual(names(2026, 5, 21), []);
});

test('Genna remains January 7 while Timket follows Tir 11 in shifted years', () => {
  // Tir 11: https://stmaryeotctoronto.com/liturgical-calendar-feasts
  // 2024 observed: https://english.news.cn/20240121/1b2e4f517d364180a6edea489bec8c4e/c.html
  for (const [year, day] of [[2023, 19], [2024, 20], [2025, 19], [2026, 19], [2028, 20]]) {
    assert.deepEqual(names(year, 1, 7), ['Genna (Christmas)'], `Genna ${year}`);
    assert.deepEqual(names(year, 1, day), ['Timket (Epiphany)'], `Timket ${year}`);
    assert.deepEqual(names(year, 1, day === 19 ? 20 : 19), []);
    assert.equal(holidays.timketJdn(year - 8), gregorianToJdn(year, 1, day));
  }
});

test('legacy Islamic overrides retain their dates but are estimated without verified sources', () => {
  const overrides = [
    [2023, 4, 21, 'Eid al-Fitr'], [2023, 6, 28, 'Eid al-Adha (Arefa)'], [2023, 9, 27, 'Mawlid (Birth of the Prophet)'],
    [2024, 4, 10, 'Eid al-Fitr'], [2024, 6, 16, 'Eid al-Adha (Arefa)'],
    [2025, 3, 30, 'Eid al-Fitr'], [2025, 6, 7, 'Eid al-Adha (Arefa)'], [2025, 9, 5, 'Mawlid (Birth of the Prophet)'],
    [2026, 3, 20, 'Eid al-Fitr'], [2026, 5, 27, 'Eid al-Adha (Arefa)'], [2026, 8, 25, 'Mawlid (Birth of the Prophet)'],
  ];
  for (const [y, m, d, name] of overrides) {
    const list = holidays.holidaysForJdn(gregorianToJdn(y, m, d));
    const match = list.find((h) => h.name === name);
    assert.ok(match, `${name} on ${y}-${m}-${d}`);
    assert.equal(match.estimated, true);
    assert.equal(match.type, 'public');
  }
  // The tabular date for Eid al-Fitr 2025 (Mar 31) must NOT also be shown.
  assert.deepEqual(names(2025, 3, 31), []);
});

test('Islamic holidays outside the override table are computed and flagged as estimated', () => {
  const eid2027 = holidays.holidaysForJdn(gregorianToJdn(2027, 3, 10));
  assert.equal(eid2027.length, 1);
  assert.equal(eid2027[0].name, 'Eid al-Fitr');
  assert.equal(eid2027[0].estimated, true);
  // 2015 had two Mawlids (3 Jan and 24 Dec).
  assert.deepEqual(names(2015, 1, 3), ['Mawlid (Birth of the Prophet)']);
  assert.deepEqual(names(2015, 12, 24), ['Mawlid (Birth of the Prophet)']);
});

test('tabular Islamic calendar matches Intl islamic-civil for every day 1900–2100', () => {
  const formatter = new Intl.DateTimeFormat('en-u-ca-islamic-civil', {
    timeZone: 'UTC', year: 'numeric', month: 'numeric', day: 'numeric',
  });
  assert.equal(formatter.resolvedOptions().calendar, 'islamic-civil');
  for (let ms = Date.UTC(1900, 0, 1); ms <= Date.UTC(2100, 11, 31); ms += 86400000) {
    const date = new Date(ms);
    const expected = Object.fromEntries(formatter.formatToParts(date)
      .filter(({ type }) => ['year', 'month', 'day'].includes(type))
      .map(({ type, value }) => [type, Number(value)]));
    const jdn = gregorianToJdn(date.getUTCFullYear(), date.getUTCMonth() + 1, date.getUTCDate());
    const actual = holidays.jdnToIslamic(jdn);
    assert.deepEqual({ ...actual }, expected);
    assert.equal(holidays.islamicToJdn(actual.year, actual.month, actual.day), jdn);
  }
});

test('fixed national holidays', () => {
  assert.deepEqual(names(2026, 9, 11), ['Enkutatash (New Year)']);
  assert.deepEqual(names(2026, 9, 27), ['Meskel']);
  assert.deepEqual(names(2026, 3, 2), ['Adwa Victory Day']);
  assert.deepEqual(names(2026, 5, 1), ['Labour Day']);
  assert.deepEqual(names(2026, 5, 5), ["Patriots' Victory Day"]);
  assert.deepEqual(names(2026, 5, 28), ['Downfall of the Derg']);
  assert.deepEqual(names(2026, 10, 6), []);
  assert.ok(holidays.holidaysForJdn(gregorianToJdn(2026, 4, 10)).every((h) => h.type === 'public'));
});
