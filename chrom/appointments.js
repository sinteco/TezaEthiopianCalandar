import { formatEthiopicDate, formatEthiopianTime, jdnToEthiopic, jdnToGregorian, weekdayFromJdn } from './ethiopic.js';
import { holidaysForJdn } from './holidays.js';
import { orthodoxDay } from './orthodox.js';
import { disconnectGoogle, holidayConflicts, isExtension, isGoogleConnected, loadDayEvents } from './google-calendar.js';

const TEXT = {
  en: {
    heading: 'Appointments',
    connect: 'Connect Google Calendar', disconnect: 'Disconnect', refresh: 'Refresh',
    loading: 'Loading selected Google calendars...',
    disconnected: 'Connect Google Calendar to see appointments for this date.',
    preview: 'Google sign-in works in the installed Chrome extension, not this browser preview.',
    empty: 'No appointments or Google holiday events on this date.',
    noCalendars: 'No selected readable calendars. Select calendars in Google Calendar, then refresh.',
    calendars: 'Selected calendars checked',
    holiday: 'Holiday', observance: 'Observance', conflict: 'Holiday conflict', allDay: 'All day', untitled: 'Untitled appointment',
    localTime: 'Local', ethiopianTime: 'Ethiopian time',
    orthodox: 'Orthodox Tewahedo calendar', fast: 'Fast', noFast: 'No fast', fastDay: 'day',
    season: 'Season', feasts: 'Feasts', monthly: 'Monthly commemoration', year: 'Year',
    estimated: 'estimated',
    estimatedNote: 'This Islamic holiday date has not been verified against an official Ethiopian announcement. It is an estimate and may differ from the observed date.',
    auth: 'Sign-in expired or permission was not granted. Reconnect Google Calendar.',
    permission: 'Google denied access. Enable Calendar API, allow both read permissions, and check calendar sharing. Reconnect if needed.',
    network: 'Could not reach Google Calendar. Check your connection and refresh.',
    quota: 'Google is limiting requests. Wait a moment, then refresh.',
    request: 'Google Calendar could not load all selected calendars. Refresh to try again.',
    response: 'Google returned an unexpected calendar response. Refresh to try again.',
    dateRange: 'Google Calendar supports years 1 through 9999.',
    storage: 'Could not read or save connection settings. Please try again.',
    connectError: 'Could not open the Google connection page. Please try again.',
  },
  am: {
    heading: 'ቀጠሮዎች',
    connect: 'Google Calendarን ያገናኙ', disconnect: 'ግንኙነቱን ያቋርጡ', refresh: 'ያድሱ',
    loading: 'የተመረጡት የGoogle ቀን መቁጠሪያዎች በመጫን ላይ...',
    disconnected: 'የዚህን ቀን ቀጠሮዎች ለማየት Google Calendarን ያገናኙ።',
    preview: 'በGoogle መግባት የሚሠራው በተጫነው የChrome ቅጥያ ውስጥ ብቻ ነው።',
    empty: 'በዚህ ቀን ቀጠሮዎች ወይም የGoogle በዓላት የሉም።',
    noCalendars: 'የተመረጡ ሊነበቡ የሚችሉ ቀን መቁጠሪያዎች የሉም። በGoogle Calendar ይምረጡና ያድሱ።',
    calendars: 'የተፈተሹ ቀን መቁጠሪያዎች',
    holiday: 'በዓል', observance: 'ሌላ በዓል', conflict: 'ከበዓል ጋር የተጋጨ ቀጠሮ', allDay: 'ሙሉ ቀን', untitled: 'ርዕስ የሌለው ቀጠሮ',
    localTime: 'የአካባቢ', ethiopianTime: 'የኢትዮጵያ ሰዓት',
    orthodox: 'የኦርቶዶክስ ተዋሕዶ ቀን መቁጠሪያ', fast: 'ጾም', noFast: 'ጾም የለም', fastDay: 'ቀን',
    season: 'ዘመን', feasts: 'በዓላት', monthly: 'ወርኃዊ መታሰቢያ', year: 'ዓመት',
    estimated: 'ግምት',
    estimatedNote: 'ይህ የእስልምና በዓል ቀን በኢትዮጵያ ይፋዊ ማስታወቂያ አልተረጋገጠም። ግምት ስለሆነ ከሚከበረው ቀን ሊለይ ይችላል።',
    auth: 'የመግቢያ ፈቃዱ አልተገኘም። Google Calendarን እንደገና ያገናኙ።',
    permission: 'Google ፈቃድ አልሰጠም። Calendar APIን ያንቁ፣ ሁለቱንም የማንበብ ፈቃዶች ይስጡና እንደገና ያገናኙ።',
    network: 'ከGoogle Calendar ጋር መገናኘት አልተቻለም። ግንኙነትዎን ያረጋግጡና ያድሱ።',
    quota: 'Google ጥያቄዎችን እየገደበ ነው። ትንሽ ቆይተው ያድሱ።',
    request: 'ሁሉንም የተመረጡ ቀን መቁጠሪያዎች መጫን አልተቻለም። እንደገና ያድሱ።',
    response: 'ከGoogle ያልተጠበቀ ምላሽ ተቀብለናል። እንደገና ያድሱ።',
    dateRange: 'Google Calendar ከ1 እስከ 9999 ዓመት ይደግፋል።',
    storage: 'የግንኙነት ቅንብሮችን ማንበብ ወይም ማስቀመጥ አልተቻለም። እንደገና ይሞክሩ።',
    connectError: 'የGoogle መግቢያ ገጽን መክፈት አልተቻለም። እንደገና ይሞክሩ።',
  },
};

export function createAppointments(getLanguage) {
  const $ = id => document.getElementById(id);
  let selected = null;
  let controller;
  let mode = 'idle';
  let connected = false;
  let result = null;
  let errorCode = null;
  let disconnecting = false;

  function fail(error, fallback = 'storage') {
    errorCode = error.code && TEXT.en[error.code] ? error.code : fallback;
    console.error('Google Calendar:', errorCode);
    mode = 'error';
    result = null;
  }

  function render() {
    $('dayDetails').hidden = selected === null;
    if (selected === null) return;
    const lang = getLanguage();
    const t = TEXT[lang];
    const eth = jdnToEthiopic(selected);
    const greg = jdnToGregorian(selected);
    const dayHolidays = holidaysForJdn(selected, lang);
    const publicHolidays = dayHolidays.filter(h => h.type === 'public');
    // Conflicts are flagged against public holidays only; observances are informational.
    const builtInHoliday = publicHolidays.length
      ? publicHolidays.map(h => h.estimated ? `${h.name} (${t.estimated})` : h.name).join(', ')
      : null;
    $('appointmentsHeading').textContent = t.heading;
    $('selectedDate').textContent = formatEthiopicDate(eth, weekdayFromJdn(selected), lang);
    $('selectedGregorian').textContent = `${greg.year}-${String(greg.month).padStart(2, '0')}-${String(greg.day).padStart(2, '0')}`;
    const holidayLines = dayHolidays.map(h =>
      `${t.holiday}: ${h.name}${h.estimated ? ' *' : ''}`);
    $('selectedHoliday').textContent = holidayLines.join('\n');
    $('selectedHoliday').hidden = holidayLines.length === 0;

    // Orthodox Tewahedo liturgical details
    const o = orthodoxDay(selected, lang);
    $('orthodoxHeading').textContent = t.orthodox;
    const fastLine = o.fasting
      ? `${t.fast}: ${o.fastName}${o.fastDay ? ` (${t.fastDay} ${o.fastDay}/${o.fastTotal})` : ''}`
      : `${t.noFast}${o.fastName ? ` – ${o.fastName}` : ''}`;
    $('orthodoxFast').textContent = fastLine;
    $('orthodoxFast').classList.toggle('fasting', o.fasting);
    $('orthodoxSeason').textContent = o.season ? `${t.season}: ${o.season} · ${t.year}: ${o.evangelist}` : `${t.year}: ${o.evangelist}`;
    $('orthodoxFeasts').replaceChildren();
    for (const f of o.feasts) {
      const li = document.createElement('li');
      li.textContent = f.name;
      if (f.major) li.className = 'major-feast';
      $('orthodoxFeasts').append(li);
    }
    $('orthodoxFeastsLabel').textContent = o.feasts.length ? `${t.feasts}:` : '';
    $('orthodoxFeastsLabel').hidden = o.feasts.length === 0;
    $('orthodoxMonthly').textContent = o.monthly ? `${t.monthly}: ${o.monthly}` : '';
    $('orthodoxMonthly').hidden = !o.monthly;
    const anyEstimated = dayHolidays.some(h => h.estimated);
    $('holidayCoverage').textContent = anyEstimated ? `* ${t.estimatedNote}` : '';
    $('holidayCoverage').hidden = !anyEstimated;
    const localZone = Intl.DateTimeFormat().resolvedOptions().timeZone;
    $('appointmentTimeZone').textContent = localZone === 'Africa/Addis_Ababa'
      ? ''
      : `${t.localTime}: ${localZone}`;
    $('appointmentTimeZone').hidden = localZone === 'Africa/Addis_Ababa';
    $('connectGoogle').textContent = t.connect;
    $('disconnectGoogle').textContent = t.disconnect;
    $('refreshAppointments').textContent = t.refresh;
    $('connectGoogle').hidden = !isExtension() || (connected && mode !== 'error');
    $('disconnectGoogle').hidden = !connected;
    $('refreshAppointments').hidden = !connected;
    for (const id of ['connectGoogle', 'disconnectGoogle', 'refreshAppointments']) {
      $(id).disabled = disconnecting || mode === 'loading';
    }
    $('appointmentStatus').textContent = mode === 'loading' ? t.loading
      : mode === 'preview' ? t.preview
      : mode === 'disconnected' ? t.disconnected
      : mode === 'ready' && result.calendarCount === 0 ? t.noCalendars
      : mode === 'ready' && result.events.length === 0 ? t.empty
      : mode === 'ready' ? `${t.calendars}: ${result.calendarCount}` : '';
    $('appointmentError').textContent = mode === 'error' ? t[errorCode] : '';
    $('appointmentError').hidden = mode !== 'error';
    $('appointmentList').replaceChildren();
    $('appointmentList').setAttribute('aria-busy', String(mode === 'loading'));
    if (mode !== 'ready') return;

    const locale = lang === 'am' ? 'am-ET' : 'en-US';
    const formatTime = milliseconds => new Intl.DateTimeFormat(locale, {
      ...(milliseconds < result.window.start || milliseconds >= result.window.end
        ? { month: 'short', day: 'numeric' } : {}),
      hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
    }).format(new Date(milliseconds));
    for (const event of result.events) {
      const item = document.createElement('li');
      const title = document.createElement('strong');
      title.textContent = event.title || (event.holiday ? t.holiday : t.untitled);
      const meta = document.createElement('p');
      meta.className = 'appointment-meta';
      meta.textContent = `${event.allDay ? t.allDay : `${formatTime(event.start)} – ${formatTime(event.end)}`} · ${event.calendar}`;
      item.append(title, meta);
      if (!event.allDay) {
        // Ethiopian clock (day starts 6:00 Addis Ababa time) shown alongside the local time.
        const ethTime = document.createElement('p');
        ethTime.className = 'appointment-meta ethiopian-time';
        ethTime.textContent = `${t.ethiopianTime}: ${formatEthiopianTime(new Date(event.start), lang)} – ${formatEthiopianTime(new Date(event.end), lang)}`;
        item.append(ethTime);
      }
      if (event.holiday) {
        const label = document.createElement('p');
        label.textContent = t.holiday;
        label.className = 'holiday-label';
        item.append(label);
      }
      const conflicts = holidayConflicts(event, result.events, builtInHoliday, result.window);
      if (conflicts.length) {
        const warning = document.createElement('p');
        warning.className = 'conflict-warning';
        warning.textContent = `${t.conflict}: ${conflicts.map(name => name || t.holiday).join(', ')}`;
        item.append(warning);
      }
      $('appointmentList').append(item);
    }
  }

  async function select(jdn) {
    controller?.abort();
    const current = new AbortController();
    controller = current;
    selected = jdn;
    result = null;
    errorCode = null;
    mode = isExtension() ? 'loading' : 'preview';
    render();
    if (!isExtension() || disconnecting) return;
    try {
      const connection = await isGoogleConnected();
      if (current.signal.aborted) return;
      connected = connection;
      if (!connected) {
        mode = 'disconnected';
      } else {
        const loaded = await loadDayEvents(jdn, current.signal);
        if (current.signal.aborted) return;
        result = loaded;
        mode = 'ready';
      }
    } catch (error) {
      if (current.signal.aborted) return;
      fail(error);
    }
    render();
  }

  function clear() {
    controller?.abort();
    selected = null;
    result = null;
    mode = 'idle';
    render();
  }

  $('connectGoogle').addEventListener('click', async () => {
    try {
      await chrome.tabs.create({ url: chrome.runtime.getURL('connect.html') });
    } catch (error) {
      fail(error, 'connectError');
      render();
    }
  });
  $('refreshAppointments').addEventListener('click', () => select(selected));
  $('disconnectGoogle').addEventListener('click', async () => {
    controller?.abort();
    result = null;
    disconnecting = true;
    mode = 'loading';
    render();
    try {
      await disconnectGoogle();
      connected = false;
      mode = 'disconnected';
    } catch (error) {
      fail(error);
    } finally {
      disconnecting = false;
    }
    render();
  });
  globalThis.chrome?.storage?.onChanged?.addListener((changes, area) => {
    if (area === 'local' && changes.googleConnected && selected !== null && !disconnecting) {
      void select(selected);
    }
  });
  return { select, clear, render };
}
