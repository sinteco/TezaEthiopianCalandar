// Ethiopian public holidays, including movable Orthodox dates and estimated
// Islamic dates. Liturgical observances are defined separately in orthodox.js.

import { ethiopicToJdn, gregorianToJdn, jdnToEthiopic, jdnToGregorian } from './ethiopic.js';

const DAY = 1;

// --- Fixed holidays tied to the Ethiopian calendar (never shift) ---------------
const ETHIOPIC_FIXED = [
  { id: 'enkutatash', month: 1, day: 1, am: 'እንቁጣጣሽ', en: 'Enkutatash (New Year)', type: 'public' },
  { id: 'meskel', month: 1, day: 17, am: 'መስቀል', en: 'Meskel', type: 'public' },
  { month: 6, day: 23, am: 'የዓድዋ ድል በዓል', en: 'Adwa Victory Day', type: 'public' },
  { month: 8, day: 23, am: 'የላብ አደሮች ቀን', en: 'Labour Day', type: 'public' },
  { month: 8, day: 27, am: 'የአርበኞች ድል ቀን', en: "Patriots' Victory Day", type: 'public' },
  { month: 9, day: 20, am: 'ግንቦት ፳ (የደርግ ውድቀት)', en: 'Downfall of the Derg', type: 'public' },
];

// Genna's January 7 convention is not the date rule for Timket.
const GREGORIAN_FIXED = [
  { id: 'genna', month: 1, day: 7, am: 'ገና', en: 'Genna (Christmas)', type: 'public' },
];

// Tir 11: https://stmaryeotctoronto.com/liturgical-calendar-feasts
// January 20 in 2024: https://english.news.cn/20240121/1b2e4f517d364180a6edea489bec8c4e/c.html
export function timketJdn(ethiopicYear) {
  return ethiopicToJdn(ethiopicYear, 5, 11);
}

const TIMKET = { id: 'timket', am: 'ጥምቀት', en: 'Timket (Epiphany)', type: 'public' };

// --- Movable Orthodox public holidays relative to Fasika (Easter Sunday) -------
// The full set of movable feasts and Lenten Sundays lives in orthodox.js.
const EASTER_RELATIVE = [
  { id: 'siklet', offset: -2, am: 'ስቅለት', en: 'Siklet (Good Friday)', type: 'public' },
  { id: 'fasika', offset: 0, am: 'ፋሲካ (ትንሣኤ)', en: 'Fasika (Easter)', type: 'public' },
];

// --- Islamic holidays -----------------------------------------------------------
const ISLAMIC = [
  { key: 'eidFitr', month: 10, day: 1, am: 'ኢድ አል ፈጥር', en: 'Eid al-Fitr', type: 'public' },
  { key: 'eidAdha', month: 12, day: 10, am: 'ዒድ አል አድሐ (አረፋ)', en: 'Eid al-Adha (Arefa)', type: 'public' },
  { key: 'mawlid', month: 3, day: 12, am: 'መውሊድ', en: 'Mawlid (Birth of the Prophet)', type: 'public' },
];

// Legacy date overrides without verified announcement provenance.
// Retain their dates, but label them estimated until sources have been verified.
const ISLAMIC_OVERRIDES = {
  eidFitr: { 2023: [4, 21], 2024: [4, 10], 2025: [3, 30], 2026: [3, 20] },
  eidAdha: { 2023: [6, 28], 2024: [6, 16], 2025: [6, 7], 2026: [5, 27] },
  mawlid: { 2023: [9, 27], 2025: [9, 5], 2026: [8, 25] },
};

const easterCache = new Map();

function julianToJdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return day + Math.floor((153 * m + 2) / 5) + 365 * y + Math.floor(y / 4) - 32083;
}

// Meeus' Julian-calendar Easter, returned as a JDN. Ethiopian Fasika coincides
// with Eastern Orthodox Easter.
export function fasikaJdn(gregorianYear) {
  if (easterCache.has(gregorianYear)) return easterCache.get(gregorianYear);
  const a = gregorianYear % 4;
  const b = gregorianYear % 7;
  const c = gregorianYear % 19;
  const d = (19 * c + 15) % 30;
  const e = (2 * a + 4 * b - d + 34) % 7;
  const month = Math.floor((d + e + 114) / 31);
  const day = ((d + e + 114) % 31) + 1;
  const jdn = julianToJdn(gregorianYear, month, day);
  easterCache.set(gregorianYear, jdn);
  return jdn;
}

// Tabular (arithmetic) Islamic calendar, civil epoch.
const ISLAMIC_EPOCH = 1948440; // JDN of 1 Muharram 1 AH (16 July 622 Julian)

export function islamicToJdn(year, month, day) {
  return day + Math.ceil(29.5 * (month - 1)) + (year - 1) * 354 + Math.floor((3 + 11 * year) / 30) + ISLAMIC_EPOCH - 1;
}

export function jdnToIslamic(jdn) {
  const year = Math.floor((30 * (jdn - ISLAMIC_EPOCH) + 10646) / 10631);
  const priorDays = jdn - islamicToJdn(year, 1, 1);
  const month = Math.floor((11 * priorDays + 330) / 325);
  const day = jdn - islamicToJdn(year, month, 1) + 1;
  return { year, month, day };
}

function islamicHolidaysInGregorianYear(gregorianYear) {
  const startJdn = gregorianToJdn(gregorianYear, 1, 1);
  const endJdn = gregorianToJdn(gregorianYear, 12, 31);
  const results = [];
  for (const holiday of ISLAMIC) {
    const override = ISLAMIC_OVERRIDES[holiday.key]?.[gregorianYear];
    if (override) {
      results.push({ ...holiday, jdn: gregorianToJdn(gregorianYear, override[0], override[1]), estimated: true });
      continue;
    }
    // An Islamic date can occur twice in one Gregorian year (lunar year is ~11 days shorter).
    const firstYear = jdnToIslamic(startJdn).year;
    for (let hy = firstYear; hy <= firstYear + 1; hy++) {
      const jdn = islamicToJdn(hy, holiday.month, holiday.day);
      if (jdn >= startJdn && jdn <= endJdn) results.push({ ...holiday, jdn, estimated: true });
    }
  }
  return results;
}

/**
 * All holidays falling on a given Julian Day Number.
 * Returns [{ name, type: 'public' | 'observance', estimated, tradition }]
 */
export function holidaysForJdn(jdn, lang = 'en') {
  const eth = jdnToEthiopic(jdn);
  const greg = jdnToGregorian(jdn);
  const out = [];

  for (const h of ETHIOPIC_FIXED) {
    if (h.month === eth.month && h.day === eth.day) out.push(entry(h, lang, 'national'));
  }
  for (const h of GREGORIAN_FIXED) {
    if (h.month === greg.month && h.day === greg.day) out.push(entry(h, lang, 'orthodox'));
  }
  if (jdn === timketJdn(eth.year)) out.push(entry(TIMKET, lang, 'orthodox'));
  const easter = fasikaJdn(greg.year);
  for (const h of EASTER_RELATIVE) {
    if (easter + h.offset * DAY === jdn) out.push(entry(h, lang, 'orthodox'));
  }
  for (const h of islamicHolidaysInGregorianYear(greg.year)) {
    if (h.jdn === jdn) out.push(entry(h, lang, 'islamic', h.estimated));
  }

  // Public holidays first, then observances.
  return out.sort((a, b) => Number(a.type === 'observance') - Number(b.type === 'observance'));
}

function entry(h, lang, tradition, estimated = false) {
  return { id: h.id ?? h.key, name: h[lang] ?? h.en, type: h.type, tradition, estimated };
}

export function publicHolidaysForJdn(jdn, lang = 'en') {
  return holidaysForJdn(jdn, lang).filter((h) => h.type === 'public');
}
