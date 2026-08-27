# Maelstrom Google reservations setup

This connects `reservations.html` to one Google Sheet.

## 1. Create the Google Sheet

Create a Google Sheet named `Maelstrom Reservations`.

The Apps Script will create the sheet tabs and headers automatically.

## 2. Paste this Apps Script

In the Google Sheet, open `Extensions > Apps Script`, delete the default code, and paste this:

```js
const RESERVATIONS_SHEET_NAME = "Reservations";
const CREATE_CALENDAR_EVENTS = false;
const CALENDAR_ID = "";

const RESERVATION_HEADERS = [
  "Submitted at",
  "Status",
  "Name",
  "Email",
  "Phone",
  "Date",
  "Time",
  "Guests",
  "Notes",
  "Source",
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const sheet = getReservationsSheet_();
    const data = e.parameter || {};
    const submittedAt = data.submittedAt || new Date().toISOString();
    const status = "New";
    const name = clean_(data.name);
    const email = clean_(data.email);
    const phone = clean_(data.phone);
    const date = clean_(data.date);
    const time = clean_(data.time);
    const guests = clean_(data.guests);
    const notes = clean_(data.notes);

    if (!name || !email || !date || !time || !guests) {
      return json_({ ok: false, error: "Missing required reservation fields." });
    }

    sheet.appendRow([
      submittedAt,
      status,
      name,
      email,
      phone,
      date,
      time,
      guests,
      notes,
      "Maelstrom website",
    ]);

    if (CREATE_CALENDAR_EVENTS) {
      createCalendarEvent_({ name, email, phone, date, time, guests, notes });
    }

    return json_({ ok: true });
  } catch (error) {
    return json_({ ok: false, error: String(error) });
  } finally {
    lock.releaseLock();
  }
}

function doGet() {
  return json_({ ok: true, service: "Maelstrom reservations" });
}

function getReservationsSheet_() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(RESERVATIONS_SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(RESERVATIONS_SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(RESERVATION_HEADERS);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function createCalendarEvent_(reservation) {
  const calendar = CALENDAR_ID
    ? CalendarApp.getCalendarById(CALENDAR_ID)
    : CalendarApp.getDefaultCalendar();

  if (!calendar) {
    throw new Error("Calendar not found.");
  }

  const start = new Date(`${reservation.date}T${reservation.time}:00`);
  const end = new Date(start.getTime() + 2 * 60 * 60 * 1000);

  calendar.createEvent(
    `Maelstrom reservation - ${reservation.name} (${reservation.guests})`,
    start,
    end,
    {
      description: [
        `Name: ${reservation.name}`,
        `Email: ${reservation.email}`,
        `Phone: ${reservation.phone}`,
        `Guests: ${reservation.guests}`,
        `Notes: ${reservation.notes}`,
      ].join("\n"),
    }
  );
}

function clean_(value) {
  return String(value || "").trim().slice(0, 1000);
}

function json_(payload) {
  return ContentService
    .createTextOutput(JSON.stringify(payload))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. Deploy

1. Click `Deploy > New deployment`.
2. Choose `Web app`.
3. Set `Execute as` to `Me`.
4. Set `Who has access` to `Anyone`.
5. Click `Deploy`.
6. Authorize the app.
7. Copy the `/exec` URL.

## 4. Connect the site

Paste the `/exec` URL into `reservations-config.js`:

```js
window.MAELSTROM_RESERVATION_ENDPOINT = "YOUR_EXEC_URL_HERE";
```
