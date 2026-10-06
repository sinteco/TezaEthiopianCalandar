// Ethiopian (Amete Mihret) <-> Gregorian conversion via Julian Day Numbers.
// Based on the Beyene–Kudlek algorithm.

const JD_EPOCH_OFFSET_AMETE_MIHRET = 1723856;

const mod = (a, b) => ((a % b) + b) % b;

export const MONTHS = {
  am: ['መስከረም', 'ጥቅምት', 'ኅዳር', 'ታኅሣሥ', 'ጥር', 'የካቲት', 'መጋቢት', 'ሚያዝያ', 'ግንቦት', 'ሰኔ', 'ሐምሌ', 'ነሐሴ', 'ጳጉሜን'],
  en: ['Meskerem', 'Tikimt', 'Hidar', 'Tahsas', 'Tir', 'Yekatit', 'Megabit', 'Miyazya', 'Ginbot', 'Sene', 'Hamle', 'Nehase', 'Pagume'],
};

export const WEEKDAYS = {
  am: ['እሑድ', 'ሰኞ', 'ማክሰኞ', 'ረቡዕ', 'ሐሙስ', 'ዓርብ', 'ቅዳሜ'],
  en: ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'],
};

export const WEEKDAYS_SHORT = {
  am: ['እሑ', 'ሰኞ', 'ማክ', 'ረቡ', 'ሐሙ', 'ዓር', 'ቅዳ'],
  en: ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'],
};

export const GREGORIAN_MONTHS_SHORT = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isEthiopicLeapYear(year) {
  return mod(year, 4) === 3;
}

export function daysInEthiopicMonth(year, month) {
  if (month === 13) return isEthiopicLeapYear(year) ? 6 : 5;
  return 30;
}

export function gregorianToJdn(year, month, day) {
  const a = Math.floor((14 - month) / 12);
  const y = year + 4800 - a;
  const m = month + 12 * a - 3;
  return (
    day +
    Math.floor((153 * m + 2) / 5) +
    365 * y +
    Math.floor(y / 4) -
    Math.floor(y / 100) +
    Math.floor(y / 400) -
    32045
  );
}

export function jdnToGregorian(jdn) {
  const a = jdn + 32044;
  const b = Math.floor((4 * a + 3) / 146097);
  const c = a - Math.floor((146097 * b) / 4);
  const d = Math.floor((4 * c + 3) / 1461);
  const e = c - Math.floor((1461 * d) / 4);
  const m = Math.floor((5 * e + 2) / 153);
  return {
    year: 100 * b + d - 4800 + Math.floor(m / 10),
    month: m + 3 - 12 * Math.floor(m / 10),
    day: e - Math.floor((153 * m + 2) / 5) + 1,
  };
}

export function ethiopicToJdn(year, month, day) {
  return (
    JD_EPOCH_OFFSET_AMETE_MIHRET +
    365 +
    365 * (year - 1) +
    Math.floor(year / 4) +
    30 * month +
    day -
    31
  );
}

export function jdnToEthiopic(jdn) {
  const offset = jdn - JD_EPOCH_OFFSET_AMETE_MIHRET;
  const r = mod(offset, 1461);
  const n = mod(r, 365) + 365 * Math.floor(r / 1460);
  return {
    year: 4 * Math.floor(offset / 1461) + Math.floor(r / 365) - Math.floor(r / 1460),
    month: Math.floor(n / 30) + 1,
    day: mod(n, 30) + 1,
  };
}

export function gregorianToEthiopic(year, month, day) {
  return jdnToEthiopic(gregorianToJdn(year, month, day));
}

export function ethiopicToGregorian(year, month, day) {
  return jdnToGregorian(ethiopicToJdn(year, month, day));
}

// 0 = Sunday ... 6 = Saturday
export function weekdayFromJdn(jdn) {
  return mod(jdn + 1, 7);
}

export function dateToEthiopic(date = new Date()) {
  return gregorianToEthiopic(date.getFullYear(), date.getMonth() + 1, date.getDate());
}

export const ETHIOPIA_TIME_ZONE = 'Africa/Addis_Ababa';

// Wall-clock hour/minute of a moment in Ethiopia (UTC+3, no daylight saving).
export function addisWallClock(date = new Date()) {
  const parts = new Intl.DateTimeFormat('en-US', {
    timeZone: ETHIOPIA_TIME_ZONE,
    hour: 'numeric',
    minute: 'numeric',
    hourCycle: 'h23',
  }).formatToParts(date);
  const get = (type) => Number(parts.find((p) => p.type === type).value);
  return { hour: get('hour'), minute: get('minute') };
}

// Ethiopian 12-hour clock: the day starts at 6:00 AM Ethiopian (Addis Ababa) time,
// so 7:00 AM is 1 o'clock in the day and 7:00 PM is 1 o'clock in the night.
export function toEthiopianTime(date = new Date()) {
  const { hour: h24, minute } = addisWallClock(date);
  const ethHour24 = mod(h24 - 6, 24);
  const hour = ethHour24 % 12 === 0 ? 12 : ethHour24 % 12;
  const period = ethHour24 < 12 ? 'day' : 'night';
  return { hour, minute, period };
}

export function formatEthiopianTime(date, lang = 'en') {
  const { hour, minute, period } = toEthiopianTime(date);
  const mm = String(minute).padStart(2, '0');
  const label = lang === 'am' ? (period === 'day' ? 'ቀን' : 'ማታ') : period;
  return `${hour}:${mm} ${label}`;
}

export function formatEthiopicDate({ year, month, day }, weekday, lang = 'en') {
  const monthName = MONTHS[lang][month - 1];
  const dayName = WEEKDAYS[lang][weekday];
  return lang === 'am'
    ? `${dayName}፣ ${monthName} ${day} ቀን ${year} ዓ.ም.`
    : `${dayName}, ${monthName} ${day}, ${year} E.C.`;
}
