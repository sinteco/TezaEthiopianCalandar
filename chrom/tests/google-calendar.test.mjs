import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import test from 'node:test';
import { createContext, SourceTextModule } from 'node:vm';

const source = await readFile(new URL('../google-calendar.js', import.meta.url), 'utf8');
const calendarSource = await readFile(new URL('../ethiopic.js', import.meta.url), 'utf8');
const scopes = [
  'https://www.googleapis.com/auth/calendar.calendarlist.readonly',
  'https://www.googleapis.com/auth/calendar.events.readonly',
];

async function load({ fetch, identity = {}, local = {} } = {}) {
  const context = createContext({
    URL, URLSearchParams, Date,
    fetch: fetch || (async () => { throw new Error('Unexpected network request'); }),
    chrome: {
      identity: {
        getAuthToken: async () => ({ token: 'test-token', grantedScopes: scopes }),
        removeCachedAuthToken: async () => {},
        clearAllCachedAuthTokens: async () => {},
        ...identity,
      },
      runtime: { getManifest: () => ({ oauth2: { scopes } }) },
      storage: { local: { get: async () => ({}), set: async () => {}, ...local } },
    },
  });
  const module = new SourceTextModule(source, { context });
  const calendar = new SourceTextModule(calendarSource, { context });
  await module.link(() => calendar);
  await module.evaluate();
  return { api: module.namespace, calendar: calendar.namespace };
}

const response = (body, status = 200) => ({
  ok: status >= 200 && status < 300, status, json: async () => body,
});
const allDay = (title, date = '2026-10-06', end = '2026-10-07') => ({
  summary: title, start: { date }, end: { date: end },
});

test('selected-calendar and event pagination are complete; recurring instances are requested', async () => {
  const requests = [];
  const { api, calendar } = await load({
    fetch: async (url, options) => {
      requests.push(url);
      assert.equal(options.headers.Authorization, 'Bearer test-token');
      assert.equal(options.credentials, 'omit');
      assert.equal(options.cache, 'no-store');
      if (url.pathname.endsWith('/calendarList')) {
        return response(url.searchParams.has('pageToken')
          ? { items: [{ id: 'shared', selected: true, summary: 'Shared' }] }
          : {
            items: [{ id: 'work', selected: true }, { id: 'unselected', selected: false }],
            nextPageToken: 'calendar-page-2',
          });
      }
      assert.equal(url.searchParams.get('singleEvents'), 'true');
      assert.equal(url.searchParams.get('orderBy'), 'startTime');
      assert.equal(url.searchParams.get('showDeleted'), 'false');
      if (url.pathname.includes('/work/')) {
        return response(url.searchParams.has('pageToken')
          ? { items: [allDay('Second event page')] }
          : { items: [allDay('First event page')], nextPageToken: 'events-page-2' });
      }
      assert.ok(url.pathname.includes('/shared/'));
      return response({ items: [allDay('Shared event')] });
    },
  });
  const result = await api.loadDayEvents(calendar.gregorianToJdn(2026, 10, 6));
  assert.equal(result.calendarCount, 2);
  assert.equal(result.events.length, 3);
  assert.equal(requests.length, 5);
  assert.ok(requests.every(url => !url.pathname.includes('unselected')));
});

test('event filtering handles exclusive ends, all-day spans, timed overlaps and cancellation', async () => {
  const { api, calendar } = await load();
  const window = api.dayWindow(calendar.gregorianToJdn(2026, 10, 6));
  const cal = { id: 'work', summary: 'Work' };
  assert.equal(api.normalizeEvent(allDay('Yesterday', '2026-10-05', '2026-10-06'), cal, window), null);
  assert.equal(api.normalizeEvent(allDay('Tomorrow', '2026-10-07', '2026-10-08'), cal, window), null);
  assert.ok(api.normalizeEvent(allDay('Multi-day', '2026-10-05', '2026-10-08'), cal, window));
  assert.equal(api.normalizeEvent({ status: 'cancelled' }, cal, window), null);
  const timed = (start, end) => ({
    start: { dateTime: new Date(start).toISOString() },
    end: { dateTime: new Date(end).toISOString() },
  });
  assert.equal(api.normalizeEvent(timed(window.start - 3600000, window.start), cal, window), null);
  assert.equal(api.normalizeEvent(timed(window.end, window.end + 3600000), cal, window), null);
  assert.ok(api.normalizeEvent(timed(window.start - 3600000, window.start + 1), cal, window));
  assert.throws(() => api.normalizeEvent(allDay('Invalid', '2026-02-30'), cal, window),
    error => error.code === 'response');
});

test('day boundaries follow daylight saving instead of assuming 24 hours', async () => {
  const original = process.env.TZ;
  try {
    process.env.TZ = 'America/New_York';
    const { api, calendar } = await load();
    for (const [month, day, hours] of [[3, 8, 23], [11, 1, 25]]) {
      const window = api.dayWindow(calendar.gregorianToJdn(2026, month, day));
      assert.equal(window.end - window.start, hours * 3600000);
    }
  } finally {
    if (original === undefined) delete process.env.TZ;
    else process.env.TZ = original;
  }
});

test('built-in and Google holiday conflicts are limited to overlapping appointments', async () => {
  const { api } = await load();
  const window = { start: 0, end: 100 };
  const appointment = { start: 10, end: 20, holiday: false };
  const holiday = { start: 0, end: 100, title: 'Google holiday', holiday: true };
  assert.deepEqual([...api.holidayConflicts(appointment, [holiday], 'Meskel', window)],
    ['Meskel', 'Google holiday']);
  assert.deepEqual([...api.holidayConflicts(holiday, [holiday], 'Meskel', window)], []);
  assert.deepEqual([...api.holidayConflicts(appointment, [{ ...holiday, start: 20 }], null, window)], []);
});

test('Google holiday calendar IDs are recognized without classifying arbitrary all-day events as holidays', async () => {
  const { api, calendar } = await load();
  const window = api.dayWindow(calendar.gregorianToJdn(2026, 10, 6));
  assert.equal(api.normalizeEvent(allDay('Holiday'), {
    id: 'en.ethiopian#holiday@group.v.calendar.google.com',
  }, window).holiday, true);
  assert.equal(api.normalizeEvent(allDay('Appointment'), { id: 'work' }, window).holiday, false);
});

test('401 removes the stale token and retries exactly once', async () => {
  let calls = 0;
  let tokens = 0;
  const removed = [];
  const { api, calendar } = await load({
    identity: {
      getAuthToken: async () => ({ token: `token-${++tokens}` }),
      removeCachedAuthToken: async ({ token }) => removed.push(token),
    },
    fetch: async (url, options) => {
      calls++;
      if (calls === 1) return response({}, 401);
      assert.equal(options.headers.Authorization, 'Bearer token-2');
      return response({ items: [] });
    },
  });
  const result = await api.loadDayEvents(calendar.gregorianToJdn(2026, 10, 6));
  assert.equal(result.calendarCount, 0);
  assert.equal(calls, 2);
  assert.deepEqual(removed, ['token-1']);
});

test('repeated 401, permissions, quota, network and malformed responses fail explicitly', async () => {
  for (const [status, code] of [[401, 'auth'], [403, 'permission'], [429, 'quota'], [500, 'request']]) {
    const { api, calendar } = await load({ fetch: async () => response({}, status) });
    await assert.rejects(api.loadDayEvents(calendar.gregorianToJdn(2026, 10, 6)), error => error.code === code);
  }
  for (const [fetch, code] of [
    [async () => { throw new Error('Offline'); }, 'network'],
    [async () => response({ items: 'invalid' }), 'response'],
  ]) {
    const { api, calendar } = await load({ fetch });
    await assert.rejects(api.loadDayEvents(calendar.gregorianToJdn(2026, 10, 6)), error => error.code === code);
  }
});

test('a failed calendar does not return success with partial events', async () => {
  const { api, calendar } = await load({
    fetch: async url => url.pathname.endsWith('/calendarList')
      ? response({ items: [{ id: 'one', selected: true }, { id: 'two', selected: true }] })
      : url.pathname.includes('/one/') ? response({ items: [allDay('Event')] }) : response({}, 403),
  });
  await assert.rejects(api.loadDayEvents(calendar.gregorianToJdn(2026, 10, 6)),
    error => error.code === 'permission');
});

test('cancelled requests stop before any API request', async () => {
  const controller = new AbortController();
  controller.abort();
  const { api, calendar } = await load();
  await assert.rejects(api.loadDayEvents(calendar.gregorianToJdn(2026, 10, 6), controller.signal),
    error => error.name === 'AbortError');
});

test('connect requires both scopes and saves only a connection flag, not tokens', async () => {
  const stored = [];
  const { api } = await load({ local: { set: async value => stored.push({ ...value }) } });
  await api.connectGoogle();
  assert.deepEqual(stored, [{ googleConnected: true }]);
  await api.disconnectGoogle();
  assert.deepEqual(stored[1], { googleConnected: false });
  const denied = await load({
    identity: { getAuthToken: async () => ({ token: 'test-token', grantedScopes: [scopes[0]] }) },
    local: { set: async () => assert.fail('Must not save connection after denied permission') },
  });
  await assert.rejects(denied.api.connectGoogle(), error => error.code === 'permission');
});
