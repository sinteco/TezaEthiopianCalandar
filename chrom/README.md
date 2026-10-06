# Ethiopian Calendar – Chrome Extension

A Manifest V3 Chrome extension that shows the Ethiopian (ዓ.ም. / E.C.) calendar.

## Features

- **Today's Ethiopian date** with weekday, plus the matching Gregorian date
- **Ethiopian time** (12‑hour clock starting at 6:00 AM Addis Ababa time, ቀን / ማታ),
  always shown next to the computer's local 24-hour time, including in Ethiopia
- **Month view** of all 13 months (including ጳጉሜን / Pagume with 5 or 6 days), with Gregorian dates in each cell
- Previous/next month and year navigation, plus a **Today** button
- **Amharic / English toggle** (remembered between sessions)
- **Built-in Ethiopian public holidays**, including computed movable Orthodox
  dates and explicitly estimated Islamic dates — see [Holidays](#holidays) below
- Toolbar **badge**: today's Ethiopian day number, or — once Google Calendar is
  connected — the number of today's appointments (refreshes every 30 minutes)
- **Notifications**: a reminder 10 minutes before each timed appointment, and a
  start-of-day notice listing the day's holidays, major feasts and fast
- Light and dark mode
- Click any date to see its holidays and Google Calendar appointments
- Read-only access to all selected, readable Google calendars, including shared
  calendars and Google's holiday calendars
- Warnings when appointments overlap a public holiday

## Holidays

Fixed-date rules and Easter calculations provide dates without an annual download.
Islamic dates use arithmetic estimates and a small legacy override table; they
are not guaranteed observed dates. Calendar conversion is tested for 1900–2100,
but this does not independently validate every holiday rule over that range.

| Group | Holidays | How the date is determined |
| --- | --- | --- |
| National (Ethiopian calendar) | Enkutatash (መስከረም 1), Meskel (መስከረም 17), Adwa (የካቲት 23), Labour Day (ሚያዝያ 23), Patriots' Day (ሚያዝያ 27), ግንቦት 20 | Fixed Ethiopian date |
| Orthodox fixed | Genna (7 Jan), Timket (ጥር 11) | Genna uses the current January 7 convention. Timket follows Tir 11: January 19 normally, January 20 in 2024 and 2028. Ketera and Cana are one day before and after Timket in the liturgical panel |
| Orthodox movable | Fast of Nineveh, Abiy Tsom begins, Hosanna, **Siklet**, **Fasika**, Erget, Paraclete | Julian‑calendar Easter computus (the same result as Bahire Hasab); Fasika equals Eastern Orthodox Easter. Verified against published dates 2020–2030 |
| Islamic | **Eid al‑Fitr**, **Eid al‑Adha (Arefa)**, **Mawlid** | Tabular Islamic calendar, with legacy overrides for some dates in 2023–2026. All are marked **estimated**: no override currently has verified official-announcement provenance. Arithmetic agreement with `islamic-civil` does not establish Ethiopian observed dates |

Public holidays get a yellow/red dot in the grid;
major Orthodox feasts get a small grey dot and an "Also:" line in the footer. The
day panel lists all of them, and estimated Islamic dates carry a `*` with an
explanatory note. Conflict warnings also label estimated dates. Coincident
Orthodox feasts remain in the month footer and tooltip; only matching feast
identities are deduplicated.

The `ISLAMIC_OVERRIDES` table in [holidays.js](./holidays.js) is manually maintained
and has no automatic announcement feed. It contains Fitr and Adha entries for
2023–2026, and Mawlid entries for 2023, 2025 and 2026 (not 2024). Existing override
dates are retained for continuity, but are provisional, not confirmed. Before
promoting any date to confirmed, record and verify the Ethiopian announcement
URL, issuing authority, announcement date and observed date, and add a
source-backed regression test. Updating the extension is currently required to
distribute date changes.

## Orthodox Tewahedo liturgical calendar

Clicking a date shows a **selected Orthodox Tewahedo calendar**, not a complete
daily Synaxarium. The implemented records are in [orthodox.js](./orthodox.js),
using the [EOTC Mahibere Kidusan calendar order](https://www.eotc-ma.com/beliefs-and-origins-order-of-calend)
and [St. Mary EOTC Toronto guide](https://stmaryeotctoronto.com/liturgical-calendar-feasts)
as references. Those guides are not identical; the complete dataset and fasting
exceptions have not received an authoritative church review.

- **Fasting status** for the day — ዐቢይ ጾም (55 days, with day counter), ጾመ ነነዌ,
  ጾመ ሐዋርያት (Monday after Pentecost to ሐምሌ 4), ጾመ ፍልሰታ (ነሐሴ 1–15),
  ጾመ ነቢያት (ኅዳር 15 to Christmas Eve), ገሃድ (eves of Genna and Timket), and the
  Wednesday/Friday ጾመ ድኅነት — with no fasting during the 50 days of Easter or when
  Genna/Timket fall on a Wednesday or Friday.
- **Season** (ዘመነ ጽጌ, ስብከት, ብርሃን, ኖላዊ, Christmas–Epiphany, Great Lent,
  ዘመነ ትንሣኤ, ፍልሰታ) and the **Evangelist year** (ዘመነ ማቴዎስ/ማርቆስ/ሉቃስ/ዮሐንስ).
- **Feasts of the day**: selected annual feasts by Ethiopian date (e.g. ኅዳር ጽዮን,
  ኅዳር 12 ሚካኤል, ታኅሣሥ 19 ገብርኤል, የካቲት 16 ኪዳነ ምሕረት, ግንቦት 1 ልደታ, ሰኔ ጎልጎታ,
  ደብረ ታቦር, ፍልሰታ, ጳጉሜን 3 ሩፋኤል…), Christmas entries and the Tir 11-based
  Timket sequence (ከተራ, ጥምቀት, ቃና ዘገሊላ), and selected movable days from
  the Fast of Nineveh through the eight
  Sundays of Lent (ዘወረደ, ቅድስት, ምኵራብ, መጻጉዕ, ደብረ ዘይት, ገብር ኄር, ኒቆዲሞስ, ሆሣዕና),
  Holy Week (ጸሎተ ሐሙስ, ስቅለት, ቀዳም ሥዑር), ትንሣኤ, ዳግም ትንሣኤ, ዕርገት, ጰራቅሊጦስ.
- **Monthly commemoration** for days 1–30 (e.g. 12 ሚካኤል, 16 ኪዳነ ምሕረት,
  19 ገብርኤል, 21 ማርያም, 23 ጊዮርጊስ, 27 መድኃኔዓለም, 29 በዓለ ወልድ).

Movable entries are offsets from the same Easter computus as Fasika. Tests cover
published Easter dates for 2020–2030 and selected liturgical examples, not every
observance in every year. Timket's shifted-year correction is also supported by
[January 20, 2024 reporting](https://english.news.cn/20240121/1b2e4f517d364180a6edea489bec8c4e/c.html).

Monthly groups cover days 1–30 outside Pagume, including Abba Banuda on day 8
as listed by the Toronto guide. Annual records are selective; absence of an
entry does not mean no saint is commemorated that day. Complete Senkesar coverage,
reconciliation of source differences, and Gahad weekend-transfer rules remain
unverified. The fasting panel describes the implemented general rules, not
individual fasting obligations; consult your parish for guidance.

## Connect Google Calendar

1. Reload this extension at `chrome://extensions` to accept the identity,
   notifications and Google API permissions.
2. Click a date, then **Connect Google Calendar**. A separate extension tab opens
   so the sign-in flow is not interrupted when the popup closes.
3. Click **Sign in with Google** and grant both read permissions.
4. Close the connection tab, reopen the popup, and select a date.

The configured OAuth client ID is in `manifest.json`. It is a public application
identifier, not a client secret. No client secret should be added to the extension.

### Google Cloud setup

In the Google Cloud project that owns that client ID:

1. Enable **Google Calendar API**.
2. Configure the OAuth consent screen with the following scopes:
   - `https://www.googleapis.com/auth/calendar.calendarlist.readonly`
   - `https://www.googleapis.com/auth/calendar.events.readonly`
3. If the app is in **Testing** mode, add the Google accounts that will use it as
   test users. Google may require OAuth verification before wider distribution.
4. Confirm that the OAuth client's application type is **Chrome Extension** and
   its **Item ID** exactly matches this extension's ID at `chrome://extensions`.
   A Web application client is not interchangeable with an extension client.
5. For distribution or development across machines, follow Chrome's
   [consistent extension ID instructions](https://developer.chrome.com/docs/extensions/how-to/integrate/oauth#keep_a_consistent_extension_id).
   Changing the extension ID requires updating the OAuth registration.

If Google denies access, check these settings, allow both requested scopes, and
reconnect. The browser preview cannot perform Chrome-extension sign-in.

### Appointments and holiday warnings

- The view reads calendars marked **selected** in Google Calendar, with at least
  reader access. Calendars shared only as free/busy are not included because their
  event details cannot be read. Private event details may be withheld by Google.
- Recurring occurrences and multi-day appointments are included. Cancelled events
  are excluded. Every result page is fetched; failures are shown as errors, not
  as an empty or incomplete list.
- Appointment times are shown in the computer's local time zone with a **24-hour
  clock**, and timed appointments additionally show the **Ethiopian clock**
  (ቀን / ማታ), computed from Addis Ababa time so it is correct wherever you are.
  All-day events follow their date labels, with the end date exclusive.
- An appointment is flagged when it overlaps a computed public holiday or an event
  from a selected Google holiday calendar. Arbitrary all-day appointments are not
  assumed to be holidays. Custom holiday calendars are not automatically classified.
- Warnings are informational: no events are created, moved, blocked, or deleted.
  This is not an appointment-versus-appointment conflict checker.
- Use **Refresh** after changing appointments or selecting calendars in Google.
  Changing dates cancels the previous load; changing months closes the detail view.

### Badge, reminders and daily notice

- **Badge.** Not connected: today's Ethiopian day on green. Connected: the number
  of today's appointments on red (events from Google holiday calendars are not
  counted). If Google cannot be reached the badge falls back to the day number and
  the icon tooltip says appointments are unavailable.
- **Reminders.** The background worker loads today's events every 30 minutes and
  schedules a Chrome notification 10 minutes before each *timed* appointment
  (all-day events and holiday-calendar events get no reminder). An appointment
  added less than 10 minutes before it starts is announced as soon as it is seen.
  Each appointment is announced once per browser session. Appointments created or
  moved between refreshes can be missed or announced at the old time; cancelled
  ones may still be announced until the next refresh.
- **Daily notice.** Just after local midnight (and on browser start) a single
  notification lists the day's public holidays, major Orthodox feasts and the
  fasting status. Days with none of these produce no notice.
- Notifications use the language chosen in the popup. Chrome may delay alarms while
  the computer is asleep; reminders are not delivered while Chrome is closed.

### Privacy and disconnecting

Requests go directly to Google's Calendar API over HTTPS. No backend, analytics,
or third-party calendar service is used. The popup keeps event details only in
memory. For the badge and reminders, the background worker also reads **today's**
events every 30 minutes and keeps the title, time and calendar name of upcoming
appointments in Chrome's in-memory session storage until the reminder fires or the
browser closes; nothing is written to disk. Chrome Identity manages access tokens;
this code does not persist them. Local storage holds only the connection flag and
the day of the last daily notice, while Chrome sync storage holds the language
preference.

**Disconnect** clears Chrome's cached authentication state for this extension
and the local connection flag. To revoke the app's Google authorization entirely,
remove it from your [Google Account connections](https://myaccount.google.com/connections).

## Behavior and limitations

- The calendar date follows your computer's local time zone. The Ethiopian clock
  always follows Addis Ababa time (UTC+3, no daylight saving); the local 24-hour
  clock is always shown alongside it.
- While open, the popup checks for a new date every 30 seconds. It follows the
  new month if you were viewing the current month, but preserves other months
  you are browsing. **Today** refreshes the date immediately.
- Language preferences use Chrome sync storage. A failed save displays an error
  and keeps the previous language selected. A failed load displays an error and
  temporarily uses English. Browser previews use localStorage instead.
- All current built-in Islamic dates are marked estimated, including legacy
  overrides whose official announcement sources have not been verified.
- The badge refreshes every 30 minutes and can lag midnight. Chrome may delay
  alarms while the computer is asleep.
- Permissions: `storage` (preferences and flags), `alarms` (badge refresh,
  reminders, daily notice), `identity` (Google sign-in), `notifications`
  (reminders and daily notice), and host access to `www.googleapis.com` only.

## Tests

With Node.js 20 or newer, run from this folder:

```sh
node --experimental-vm-modules --test tests/*.test.mjs
```

Tests cover date conversion against the built-in Ethiopian calendar, leap days,
midnight/year rollover, navigation, language accessibility, storage failures,
calendar/event pagination, exclusive event boundaries, daylight-saving changes,
holiday conflicts, token refresh, API failures, stale-request protection, and the
background worker (badge count, reminder scheduling and firing, daily notice).
Google API and authentication responses are mocked; tests never access your account.
The VM flag lets the popup tests load its browser ES modules without dependencies.
An experimental VM warning from Node is expected.

Also verify the unpacked extension in Chrome: reopen the popup to check language
persistence, hover today's cell in light and dark mode, and check the toolbar
badge after restarting Chrome. Unit tests do not replace extension integration
checks.

For a live integration check, connect an authorized Google test account in the
installed extension, select a date with a known timed appointment, verify an
all-day and recurring event, and select a holiday with an appointment to confirm
the warning. Verify Refresh, Disconnect, and reopening the popup. Browser previews
and mocked tests do not verify the OAuth registration or live account permissions.

## Install (developer mode)

1. Open `chrome://extensions` in Chrome.
2. Turn on **Developer mode** (top right).
3. Click **Load unpacked** and select this `chrom` folder.
4. Pin the extension and click its icon.

## Files

| File | Purpose |
| --- | --- |
| `manifest.json` | Extension manifest (MV3) |
| `ethiopic.js` | Ethiopian ⇄ Gregorian conversion (Julian Day Number based), month/day names, Ethiopian time (Addis Ababa based) |
| `holidays.js` | Public holidays for any date: fixed national, Julian-fixed Genna/Timket, Siklet/Fasika (Easter computus), Islamic (observed table + tabular calendar) |
| `orthodox.js` | Full Orthodox Tewahedo liturgical calendar: monthly commemorations, ~120 annual feasts, movable feasts and Lenten Sundays, fasting periods, seasons, Evangelist year |
| `popup.html` / `popup.css` / `popup.js` | The popup UI |
| `background.js` | Service worker that keeps the toolbar badge up to date |
| `google-calendar.js` | Read-only OAuth, calendar/event queries, date filtering, holiday overlap logic |
| `appointments.js` | Selected-day view, loading/error states, localized appointment rendering |
| `connect.html` / `connect.js` | Persistent sign-in tab and setup help |
| `icons/` | Extension icons |

## How the conversion works

Both calendars are converted through the Julian Day Number (JDN). The Ethiopian
epoch (Amete Mihret) is JDN 1723856. A year is a leap year when `year % 4 === 3`,
giving Pagume 6 days instead of 5. The Ethiopian year starts on 11 September
(12 September in the Gregorian year preceding a Gregorian leap year).
