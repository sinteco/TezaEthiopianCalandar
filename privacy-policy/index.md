# Privacy Policy — Ethiopian Calendar (Chrome Extension)

_Last updated: 6 October 2026_

Ethiopian Calendar is a Chrome extension that shows the Ethiopian calendar, holidays, Orthodox fasting days and Ethiopian time, and can optionally display your own Google Calendar appointments. This policy explains what data the extension handles and how.

## Summary

- The extension has **no servers, no analytics and no tracking**. It does not send any information to the developer or to any third party.
- Without Google Calendar connected, the extension handles **no personal data at all**.
- If you choose to connect Google Calendar, the extension reads your calendar events **directly from Google, into your own browser only**, with read-only permission. Your events are never transmitted anywhere else and never written to disk.

## Data the extension stores

| Data | Where | Why | Leaves your browser? |
|---|---|---|---|
| Language preference (Amharic / English) | Chrome sync storage | Remember your choice across sessions | Synced only through your own Chrome account, by Chrome |
| Whether Google Calendar is connected (true/false) | Chrome local storage | Decide whether to show appointments | No |
| The date of the last daily notice shown | Chrome local storage | Avoid showing the same daily notice twice | No |
| Title, time and calendar name of today's upcoming appointments | Chrome session storage (in memory, cleared when Chrome closes) | Fire a reminder 10 minutes before each appointment | No |

Nothing else is stored. Event details shown in the popup are kept only in the popup's memory while it is open.

## Google Calendar access (optional)

If you click **Connect Google Calendar**, Chrome asks you to sign in with Google and grant two **read-only** permissions:

- `https://www.googleapis.com/auth/calendar.calendarlist.readonly` — to list your calendars
- `https://www.googleapis.com/auth/calendar.events.readonly` — to read events

The extension uses these to fetch events for the day you select, and for today's events every 30 minutes to update the toolbar badge and schedule reminders. Requests go directly from your browser to `www.googleapis.com` over HTTPS. The extension **cannot** create, edit, move or delete events.

The OAuth access token is managed by Chrome's Identity API; the extension does not store it. Click **Disconnect** in the popup to clear Chrome's cached token and the connection flag. To revoke access entirely, remove "Ethiopian Calendar" from your [Google Account connections](https://myaccount.google.com/connections).

Use of information received from Google APIs adheres to the [Google API Services User Data Policy](https://developers.google.com/terms/api-services-user-data-policy), including the Limited Use requirements.

## Notifications

With your permission, the extension shows two kinds of Chrome notifications: a reminder before your timed appointments, and a once-a-day notice when the day has an Ethiopian holiday, major feast or fast. Notifications are generated locally; nothing is sent to a notification service.

## Permissions explained

- **storage** — the preferences and flags listed above
- **alarms** — periodic badge refresh, daily notice, appointment reminders
- **identity** — optional Google sign-in
- **notifications** — reminders and daily notice
- **Host access to www.googleapis.com** — Google Calendar API, only after you connect

## Data sharing and sale

The extension does not sell, share, transfer or otherwise disclose any user data to anyone. The developer has no access to your data.

## Children

The extension is not directed at children and collects no personal information from anyone.

## Changes

If this policy changes, the updated version will be published at this URL with a new "last updated" date.

## Contact

Questions about this policy: **centg2g@gmail.com**
