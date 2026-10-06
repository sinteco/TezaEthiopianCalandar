import {
  dateToEthiopic, MONTHS, formatEthiopicDate, formatEthiopianTime, weekdayFromJdn, ethiopicToJdn,
} from './ethiopic.js';
import { holidaysForJdn } from './holidays.js';
import { orthodoxDay, majorOrthodoxFeasts } from './orthodox.js';
import { isGoogleConnected, loadDayEvents } from './google-calendar.js';

const REFRESH_ALARM = 'refresh-badge';
const DAY_START_ALARM = 'day-start';
const REMINDER_PREFIX = 'reminder:';
const REMINDER_LEAD_MS = 10 * 60 * 1000;
const DAY_COLOR = '#078930';
const COUNT_COLOR = '#da121a';

const TEXT = {
  en: {
    appointments: (n) => `${n} appointment${n === 1 ? '' : 's'} today`,
    unavailable: 'Appointments unavailable – open the calendar to reconnect',
    reminderTitle: 'Appointment in 10 minutes',
    holiday: 'Holiday', feast: 'Feast', fast: 'Fast', noFast: 'No fast', day: 'day',
    ethiopianTime: 'Ethiopian time',
  },
  am: {
    appointments: (n) => `ዛሬ ${n} ቀጠሮ${n === 1 ? '' : 'ዎች'}`,
    unavailable: 'ቀጠሮዎች አልተገኙም – እንደገና ለማገናኘት ቀን መቁጠሪያውን ይክፈቱ',
    reminderTitle: 'ቀጠሮ በ10 ደቂቃ ውስጥ',
    holiday: 'በዓል', feast: 'ክብረ በዓል', fast: 'ጾም', noFast: 'ጾም የለም', day: 'ቀን',
    ethiopianTime: 'የኢትዮጵያ ሰዓት',
  },
};

async function getLang() {
  try {
    const { lang } = await chrome.storage.sync.get('lang');
    return lang === 'am' ? 'am' : 'en';
  } catch {
    return 'en';
  }
}

function todayInfo(now) {
  const eth = dateToEthiopic(now);
  const jdn = ethiopicToJdn(eth.year, eth.month, eth.day);
  return { eth, jdn, weekday: weekdayFromJdn(jdn) };
}

function dateTitle(eth, weekday) {
  return `${formatEthiopicDate(eth, weekday, 'en')}\n${MONTHS.am[eth.month - 1]} ${eth.day} ቀን ${eth.year} ዓ.ም.`;
}

function localTime(ms, lang) {
  return new Intl.DateTimeFormat(lang === 'am' ? 'am-ET' : 'en-US', {
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  }).format(new Date(ms));
}

async function notify(id, title, message) {
  try {
    await chrome.notifications.create(id, {
      type: 'basic', iconUrl: 'icons/icon128.png', title, message, priority: 1,
    });
  } catch (error) {
    console.error('Notification failed:', error);
  }
}

async function setBadge(text, color, title) {
  await chrome.action.setBadgeText({ text });
  await chrome.action.setBadgeBackgroundColor({ color });
  await chrome.action.setBadgeTextColor({ color: '#ffffff' });
  await chrome.action.setTitle({ title });
}

// --- Reminders ------------------------------------------------------------------

async function clearReminders() {
  const alarms = await chrome.alarms.getAll();
  await Promise.all(alarms.filter((a) => a.name.startsWith(REMINDER_PREFIX)).map((a) => chrome.alarms.clear(a.name)));
  await chrome.storage.session.set({ reminders: {} });
}

async function scheduleReminders(events, now, lang) {
  await clearReminders();
  const { notified: previous = {} } = await chrome.storage.session.get('notified');
  // Forget reminders for appointments that started more than a day ago.
  const notified = Object.fromEntries(Object.entries(previous)
    .filter(([key]) => Number(key.slice(key.lastIndexOf('|') + 1)) > now - 86400000));
  const reminders = {};
  for (const event of events) {
    if (event.allDay || event.holiday || event.start <= now) continue;
    const key = `${event.id || event.title}|${event.start}`;
    if (notified[key]) continue;
    const name = `${REMINDER_PREFIX}${key}`;
    reminders[name] = { key, title: event.title, start: event.start, end: event.end, calendar: event.calendar, lang };
    // Chrome fires alarms whose time has already passed immediately, which covers
    // appointments discovered less than ten minutes before they start.
    chrome.alarms.create(name, { when: Math.max(event.start - REMINDER_LEAD_MS, now) });
  }
  await chrome.storage.session.set({ reminders, notified });
}

async function fireReminder(name) {
  const { reminders = {}, notified = {} } = await chrome.storage.session.get(['reminders', 'notified']);
  const reminder = reminders[name];
  if (!reminder || notified[reminder.key]) return;
  const t = TEXT[reminder.lang] ?? TEXT.en;
  const message = [
    reminder.title || '—',
    `${localTime(reminder.start, reminder.lang)} – ${localTime(reminder.end, reminder.lang)}`,
    `${t.ethiopianTime}: ${formatEthiopianTime(new Date(reminder.start), reminder.lang)}`,
    reminder.calendar,
  ].join('\n');
  delete reminders[name];
  notified[reminder.key] = true;
  await chrome.storage.session.set({ reminders, notified });
  await notify(name, t.reminderTitle, message);
}

// --- Badge ----------------------------------------------------------------------

let badgeUpdate = null;

function updateBadge() {
  // Coalesce overlapping refreshes (startup, alarm, storage change).
  if (!badgeUpdate) {
    badgeUpdate = refreshBadge().catch((error) => console.error('Badge refresh failed:', error))
      .finally(() => { badgeUpdate = null; });
  }
  return badgeUpdate;
}

async function refreshBadge() {
  const now = new Date();
  const { eth, jdn, weekday } = todayInfo(now);
  const lang = await getLang();
  const t = TEXT[lang];
  const title = dateTitle(eth, weekday);

  if (!(await isGoogleConnected())) {
    await clearReminders();
    await setBadge(String(eth.day), DAY_COLOR, title);
    return;
  }
  try {
    const { events } = await loadDayEvents(jdn);
    const appointments = events.filter((e) => !e.holiday);
    await scheduleReminders(appointments, now.getTime(), lang);
    await setBadge(String(appointments.length), COUNT_COLOR, `${title}\n${t.appointments(appointments.length)}`);
  } catch (error) {
    console.error('Appointment badge failed:', error.code || error);
    await setBadge(String(eth.day), DAY_COLOR, `${title}\n${t.unavailable}`);
  }
}

// --- Start-of-day notice ----------------------------------------------------------

async function dayStartNotice(force = false) {
  const now = new Date();
  const { eth, jdn, weekday } = todayInfo(now);
  const { lastDayNoticeJdn } = await chrome.storage.local.get('lastDayNoticeJdn');
  if (!force && lastDayNoticeJdn === jdn) return;
  await chrome.storage.local.set({ lastDayNoticeJdn: jdn });

  const lang = await getLang();
  const t = TEXT[lang];
  const holidays = holidaysForJdn(jdn, lang);
  const feasts = majorOrthodoxFeasts(jdn, lang, holidays.map((h) => h.id));
  const o = orthodoxDay(jdn, lang);
  const lines = [
    ...holidays.map((h) => `${t.holiday}: ${h.name}${h.estimated ? ' *' : ''}`),
    ...feasts.map((f) => `${t.feast}: ${f}`),
  ];
  if (o.fasting) {
    lines.push(`${t.fast}: ${o.fastName}${o.fastDay ? ` (${t.day} ${o.fastDay}/${o.fastTotal})` : ''}`);
  }
  if (!lines.length) return;
  await notify(`day:${jdn}`, formatEthiopicDate(eth, weekday, lang), lines.join('\n'));
}

function scheduleDayStart() {
  const next = new Date();
  next.setHours(24, 0, 1, 0);
  chrome.alarms.create(DAY_START_ALARM, { when: next.getTime() });
}

function scheduleRefresh() {
  // Service workers are suspended when idle; a periodic alarm keeps the badge current.
  chrome.alarms.create(REFRESH_ALARM, { periodInMinutes: 30 });
}

async function start() {
  scheduleRefresh();
  scheduleDayStart();
  await dayStartNotice();
  await updateBadge();
}

chrome.runtime.onInstalled.addListener(() => { void start(); });
chrome.runtime.onStartup.addListener(() => { void start(); });

chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === REFRESH_ALARM) {
    void dayStartNotice().then(updateBadge);
  } else if (alarm.name === DAY_START_ALARM) {
    scheduleDayStart();
    void dayStartNotice().then(updateBadge);
  } else if (alarm.name.startsWith(REMINDER_PREFIX)) {
    void fireReminder(alarm.name);
  }
});

chrome.storage.onChanged.addListener((changes, area) => {
  if (area === 'local' && changes.googleConnected) void updateBadge();
  if (area === 'sync' && changes.lang) void updateBadge();
});

void updateBadge();
