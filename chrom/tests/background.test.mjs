import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createContext, SourceTextModule } from 'node:vm';

const source = await readFile(new URL('../background.js', import.meta.url), 'utf8');
const scopes = [
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
];

const settle = () => new Promise((resolve) => setTimeout(resolve, 5));

// A fake Chrome runtime that records badge, alarm and notification calls.
async function startWorker({
  now = new Date(2026, 9, 7, 8, 0), // Wednesday, Meskerem 27 2019 E.C.
  connected = false,
  lang = 'en',
  events = () => [],
  calendarsFail = false,
  local = {},
} = {}) {
  let clock = now;
  const badge = {};
  const alarms = new Map();
  const notifications = [];
  const listeners = {};
  const localStore = { googleConnected: connected, ...local };
  const sessionStore = {};
  const errors = [];
  const storageArea = (store) => ({
    get: async (keys) => {
      const list = Array.isArray(keys) ? keys : [keys];
      return Object.fromEntries(list.filter((k) => k in store).map((k) => [k, store[k]]));
    },
    set: async (values) => { Object.assign(store, values); },
  });
  const chrome = {
    action: {
      setBadgeText: async ({ text }) => { badge.text = text; },
      setBadgeBackgroundColor: async ({ color }) => { badge.color = color; },
      setBadgeTextColor: async () => {},
      setTitle: async ({ title }) => { badge.title = title; },
    },
    alarms: {
      create: (name, info) => { alarms.set(name, { name, ...info }); },
      getAll: async () => [...alarms.values()],
      clear: async (name) => alarms.delete(name),
      onAlarm: { addListener: (fn) => { listeners.alarm = fn; } },
    },
    notifications: { create: async (id, options) => { notifications.push({ id, ...options }); } },
    runtime: {
      onInstalled: { addListener: (fn) => { listeners.installed = fn; } },
      onStartup: { addListener: (fn) => { listeners.startup = fn; } },
      getManifest: () => ({ oauth2: { scopes } }),
    },
    identity: {
      getAuthToken: async () => ({ token: 'test-token', grantedScopes: scopes }),
      removeCachedAuthToken: async () => {},
      clearAllCachedAuthTokens: async () => {},
    },
    storage: {
      sync: storageArea({ lang }),
      local: storageArea(localStore),
      session: storageArea(sessionStore),
      onChanged: { addListener: (fn) => { listeners.storage = fn; } },
    },
  };
  class Clock extends Date {
    constructor(...args) { super(...(args.length ? args : [clock.getTime()])); }
    static now() { return clock.getTime(); }
  }
  const context = createContext({
    chrome, Date: Clock, Intl, URL, URLSearchParams, Math, Number, Map, Set, Promise, Object, console: { error: (...a) => errors.push(a) },
    fetch: async (url) => {
      if (calendarsFail) return { ok: false, status: 403, json: async () => ({}) };
      return {
        ok: true, status: 200,
        json: async () => url.pathname.endsWith('/calendarList')
          ? { items: [{ id: 'work', summary: 'Work', selected: true }, { id: 'x#holiday@group.v.calendar.google.com', summary: 'Holidays', selected: true }] }
          : { items: url.pathname.includes('holiday') ? [{ id: 'h', summary: 'Public holiday', start: { date: '2026-10-07' }, end: { date: '2026-10-08' } }] : events() },
      };
    },
  });
  const modules = new Map();
  const module = new SourceTextModule(source, { context });
  await module.link(async (specifier) => {
    if (!modules.has(specifier)) {
      modules.set(specifier, readFile(new URL(`../${specifier}`, import.meta.url), 'utf8')
        .then((text) => new SourceTextModule(text, { context })));
    }
    return modules.get(specifier);
  });
  await module.evaluate();
  await settle();
  return {
    badge, alarms, notifications, errors, localStore, sessionStore,
    setNow: (date) => { clock = date; },
    async startup() { await listeners.startup(); await settle(); },
    async fire(name) { await listeners.alarm(alarms.get(name) ?? { name }); await settle(); },
    async change(area, changes) { await listeners.storage(changes, area); await settle(); },
    reminderAlarms: () => [...alarms.keys()].filter((n) => n.startsWith('reminder:')),
  };
}

const timed = (id, title, startHour, endHour, day = 7) => ({
  id, summary: title,
  start: { dateTime: new Date(2026, 9, day, startHour, 0).toISOString() },
  end: { dateTime: new Date(2026, 9, day, endHour, 0).toISOString() },
});

test('badge shows the Ethiopian day when Google is not connected', async () => {
  const worker = await startWorker();
  assert.equal(worker.badge.text, '27');
  assert.equal(worker.badge.color, '#078930');
  assert.match(worker.badge.title, /Meskerem 27, 2019 E\.C\./);
  assert.deepEqual(worker.reminderAlarms(), []);
});

test('badge shows the appointment count and schedules 10-minute reminders for future timed events', async () => {
  const worker = await startWorker({
    connected: true,
    events: () => [
      timed('past', 'Earlier today', 6, 7),
      timed('soon', 'Stand-up', 9, 10),
      timed('later', 'Review', 14, 15),
      { id: 'allday', summary: 'Conference', start: { date: '2026-10-07' }, end: { date: '2026-10-08' } },
    ],
  });
  assert.equal(worker.badge.text, '4'); // Google holiday-calendar event is not an appointment
  assert.equal(worker.badge.color, '#da121a');
  assert.match(worker.badge.title, /4 appointments today/);
  const reminders = worker.reminderAlarms();
  assert.equal(reminders.length, 2);
  const standUp = worker.alarms.get(reminders.find((n) => n.includes('soon')));
  assert.equal(standUp.when, new Date(2026, 9, 7, 8, 50).getTime());
  assert.ok(!reminders.some((n) => n.includes('past') || n.includes('allday') || n.includes('|h|')));
});

test('a reminder alarm shows one notification with local and Ethiopian times, never twice', async () => {
  const worker = await startWorker({ connected: true, events: () => [timed('soon', 'Stand-up', 9, 10)] });
  const [name] = worker.reminderAlarms();
  await worker.fire(name);
  assert.equal(worker.notifications.length, 1);
  assert.equal(worker.notifications[0].title, 'Appointment in 10 minutes');
  assert.match(worker.notifications[0].message, /^Stand-up\n09:00 – 10:00\nEthiopian time: 3:00 day\nWork$/);
  assert.equal(worker.notifications[0].iconUrl, 'icons/icon128.png');
  await worker.fire(name);
  assert.equal(worker.notifications.length, 1);
  // A later refresh must not re-schedule an appointment that was already announced.
  await worker.fire('refresh-badge');
  assert.deepEqual(worker.reminderAlarms(), []);
});

test('an appointment discovered within ten minutes of its start is announced immediately', async () => {
  const worker = await startWorker({
    now: new Date(2026, 9, 7, 8, 55),
    connected: true,
    events: () => [timed('soon', 'Stand-up', 9, 10)],
  });
  const [name] = worker.reminderAlarms();
  assert.equal(worker.alarms.get(name).when, new Date(2026, 9, 7, 8, 55).getTime());
});

test('Google failures fall back to the day badge without throwing', async () => {
  const worker = await startWorker({ connected: true, calendarsFail: true });
  assert.equal(worker.badge.text, '27');
  assert.equal(worker.badge.color, '#078930');
  assert.match(worker.badge.title, /Appointments unavailable/);
  assert.equal(worker.errors.length, 1);
});

test('disconnecting restores the day badge and clears pending reminders', async () => {
  const worker = await startWorker({ connected: true, events: () => [timed('soon', 'Stand-up', 9, 10)] });
  assert.equal(worker.reminderAlarms().length, 1);
  worker.localStore.googleConnected = false;
  await worker.change('local', { googleConnected: { newValue: false } });
  assert.equal(worker.badge.text, '27');
  assert.deepEqual(worker.reminderAlarms(), []);
  assert.equal(Object.keys(worker.sessionStore.reminders).length, 0);
});

test('start-of-day notice lists holidays, feasts and the fast once per day, in the chosen language', async () => {
  const worker = await startWorker({ now: new Date(2026, 8, 27, 0, 1) }); // Meskel, Sunday
  await worker.startup();
  assert.equal(worker.notifications.length, 1);
  assert.equal(worker.notifications[0].title, 'Sunday, Meskerem 17, 2019 E.C.');
  assert.match(worker.notifications[0].message, /^Holiday: Meskel$/);
  await worker.fire('refresh-badge');
  assert.equal(worker.notifications.length, 1, 'same day must not notify again');
  assert.ok(worker.alarms.has('day-start'));
  assert.equal(worker.alarms.get('day-start').when, new Date(2026, 8, 28, 0, 0, 1).getTime());

  worker.setNow(new Date(2026, 8, 30, 0, 0, 2)); // Wednesday, Meskerem 20
  await worker.fire('day-start');
  assert.equal(worker.notifications.length, 2);
  assert.match(worker.notifications[1].message, /^Fast: Wednesday fast \(Tsome Dihnet\)$/);
  assert.equal(worker.alarms.get('day-start').when, new Date(2026, 9, 1, 0, 0, 1).getTime());

  const amharic = await startWorker({ now: new Date(2027, 0, 19, 0, 1), lang: 'am' }); // Timket, Tir 11 2019 (Tuesday)
  await amharic.startup();
  assert.equal(amharic.notifications[0].title, 'ማክሰኞ፣ ጥር 11 ቀን 2019 ዓ.ም.');
  assert.match(amharic.notifications[0].message, /^በዓል: ጥምቀት$/);
});

test('ordinary days without holidays, feasts or fasts produce no notice', async () => {
  const worker = await startWorker({ now: new Date(2026, 9, 6, 0, 1) }); // Tuesday, Meskerem 26
  await worker.startup();
  assert.equal(worker.notifications.length, 0);
  assert.ok(worker.localStore.lastDayNoticeJdn > 0);
});
