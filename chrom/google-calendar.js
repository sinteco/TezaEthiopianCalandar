import { jdnToGregorian } from './ethiopic.js';

export class CalendarError extends Error {
  constructor(code) {
    super(code);
    this.name = 'CalendarError';
    this.code = code;
  }
}

export function isExtension() {
  return Boolean(globalThis.chrome?.identity && globalThis.chrome?.storage?.local);
}

export async function getAccessToken(interactive = false) {
  if (!isExtension()) throw new CalendarError('preview');
  let result;
  try {
    result = await chrome.identity.getAuthToken({ interactive, enableGranularPermissions: true });
  } catch {
    // Chrome auth errors can contain account details; expose only a safe error code.
    throw new CalendarError('auth');
  }
  if (!result?.token) throw new CalendarError('auth');
  const scopes = chrome.runtime.getManifest().oauth2.scopes;
  if (result.grantedScopes && scopes.some(scope => !result.grantedScopes.includes(scope))) {
    await chrome.identity.removeCachedAuthToken({ token: result.token });
    throw new CalendarError('permission');
  }
  return result.token;
}

export async function connectGoogle() {
  await getAccessToken(true);
  await chrome.storage.local.set({ googleConnected: true });
}

export async function disconnectGoogle() {
  await chrome.identity.clearAllCachedAuthTokens();
  await chrome.storage.local.set({ googleConnected: false });
}

export async function isGoogleConnected() {
  if (!isExtension()) return false;
  return (await chrome.storage.local.get('googleConnected')).googleConnected === true;
}

function localMidnight(year, month, day) {
  const date = new Date(0);
  date.setFullYear(year, month - 1, day);
  date.setHours(0, 0, 0, 0);
  return date;
}

export function dayWindow(jdn) {
  const { year, month, day } = jdnToGregorian(jdn);
  if (year < 1 || year > 9999) throw new CalendarError('dateRange');
  const start = localMidnight(year, month, day);
  const end = localMidnight(year, month, day + 1);
  return {
    start: start.getTime(),
    end: end.getTime(),
    date: `${String(year).padStart(4, '0')}-${String(month).padStart(2, '0')}-${String(day).padStart(2, '0')}`,
  };
}

function parseAllDay(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    throw new CalendarError('response');
  }
  const [year, month, day] = value.split('-').map(Number);
  const date = localMidnight(year, month, day);
  if (date.getFullYear() !== year || date.getMonth() !== month - 1 || date.getDate() !== day) {
    throw new CalendarError('response');
  }
  return date.getTime();
}

export function normalizeEvent(event, calendar, window) {
  if (event.status === 'cancelled') return null;
  const allDay = typeof event.start?.date === 'string';
  const start = allDay ? parseAllDay(event.start.date) : Date.parse(event.start?.dateTime);
  const end = allDay ? parseAllDay(event.end?.date) : Date.parse(event.end?.dateTime);
  if (!Number.isFinite(start) || !Number.isFinite(end) || end <= start) {
    throw new CalendarError('response');
  }
  if (start >= window.end || end <= window.start) return null;
  return {
    id: typeof event.id === 'string' ? event.id : '',
    title: typeof event.summary === 'string' ? event.summary : '',
    calendar: calendar.summaryOverride || calendar.summary || calendar.id,
    holiday: calendar.id.endsWith('#holiday@group.v.calendar.google.com'),
    start, end, allDay,
  };
}

export function holidayConflicts(event, events, builtInHoliday, window) {
  if (event.holiday) return [];
  const names = builtInHoliday ? [builtInHoliday] : [];
  for (const holiday of events.filter(item => item.holiday)) {
    if (Math.max(event.start, holiday.start, window.start) < Math.min(event.end, holiday.end, window.end)) {
      names.push(holiday.title);
    }
  }
  return [...new Set(names)];
}

export async function loadDayEvents(jdn, signal) {
  const window = dayWindow(jdn);
  let token = await getAccessToken();

  async function request(path, params, retry = true) {
    signal?.throwIfAborted();
    const url = new URL(`https://www.googleapis.com/calendar/v3/${path}`);
    url.search = new URLSearchParams(params).toString();
    let response;
    try {
      response = await fetch(url, {
        headers: { Authorization: `Bearer ${token}` },
        signal, cache: 'no-store', credentials: 'omit', redirect: 'error',
      });
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new CalendarError('network');
    }
    if (response.status === 401 && retry) {
      await chrome.identity.removeCachedAuthToken({ token });
      token = await getAccessToken();
      return request(path, params, false);
    }
    if (!response.ok) {
      throw new CalendarError(response.status === 401 ? 'auth'
        : response.status === 403 ? 'permission'
        : response.status === 429 ? 'quota' : 'request');
    }
    try {
      return await response.json();
    } catch (error) {
      if (signal?.aborted) throw error;
      throw new CalendarError('response');
    }
  }

  async function list(path, params) {
    const items = [];
    const seen = new Set();
    let pageToken;
    do {
      const data = await request(path, { ...params, ...(pageToken ? { pageToken } : {}) });
      if (!data || typeof data !== 'object' || (data.items !== undefined && !Array.isArray(data.items))) {
        throw new CalendarError('response');
      }
      items.push(...(data.items || []));
      pageToken = data.nextPageToken;
      if (pageToken !== undefined && (typeof pageToken !== 'string' || !pageToken || seen.has(pageToken))) {
        throw new CalendarError('response');
      }
      seen.add(pageToken);
    } while (pageToken);
    return items;
  }

  const calendars = await list('users/me/calendarList', {
    maxResults: '250', minAccessRole: 'reader', showHidden: 'false',
  });
  if (calendars.some(calendar => !calendar || typeof calendar.id !== 'string')) {
    throw new CalendarError('response');
  }
  const selected = calendars.filter(calendar => calendar.selected === true && !calendar.deleted);
  const events = [];
  for (const calendar of selected) {
    // All-day dates belong to their calendar's civil day. Fetch neighboring days
    // too, then filter locally so calendars in distant time zones are not missed.
    const padding = 2 * 86400000;
    const items = await list(`calendars/${encodeURIComponent(calendar.id)}/events`, {
      timeMin: new Date(window.start - padding).toISOString(),
      timeMax: new Date(window.end + padding).toISOString(),
      singleEvents: 'true', orderBy: 'startTime', showDeleted: 'false', maxResults: '2500',
    });
    for (const event of items) {
      if (!event || typeof event !== 'object') throw new CalendarError('response');
      const normalized = normalizeEvent(event, calendar, window);
      if (normalized) events.push(normalized);
    }
  }
  events.sort((a, b) => Number(b.allDay) - Number(a.allDay) || a.start - b.start);
  return { events, calendarCount: selected.length, window };
}
