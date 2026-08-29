# Maelstrom Google reservations setup

This connects `reservations.html` to one Google Sheet, sends a confirmation email to the guest, and sends a booking alert to you.

## 1. Create the Google Sheet

Create a Google Sheet named `Maelstrom Reservations`.

The Apps Script will create the sheet tabs and headers automatically.

## 2. Paste this Apps Script

In the Google Sheet, open `Extensions > Apps Script`, delete the default code, and paste this.

Important: put the email address that should receive new booking requests between the quotes in `OWNER_EMAIL`.

```js
const RESERVATIONS_SHEET_NAME = "Reservations";
const ARCHIVE_SHEET_NAME = "Archive";
const ARCHIVE_AFTER_DAYS = 1;
const CREATE_CALENDAR_EVENTS = false;
const CALENDAR_ID = "";
const OWNER_EMAIL = "contact@maelstrombergen.com";
const BAR_NAME = "Maelstrom";
const REPLY_TO_EMAIL = OWNER_EMAIL;

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
    const reservation = {
      submittedAt: data.submittedAt || new Date().toISOString(),
      status: "New",
      name: clean_(data.name),
      email: clean_(data.email),
      phone: clean_(data.phone),
      date: clean_(data.date),
      time: clean_(data.time),
      guests: clean_(data.guests),
      notes: clean_(data.notes),
      source: clean_(data.source) || "Maelstrom website",
    };

    if (!reservation.name || !reservation.email || !reservation.date || !reservation.time || !reservation.guests) {
      return json_({ ok: false, error: "Missing required reservation fields." });
    }

    sheet.appendRow([
      reservation.submittedAt,
      reservation.status,
      reservation.name,
      reservation.email,
      reservation.phone,
      reservation.date,
      reservation.time,
      reservation.guests,
      reservation.notes,
      reservation.source,
    ]);

    sendGuestConfirmation_(reservation);
    sendOwnerNotification_(reservation);

    if (CREATE_CALENDAR_EVENTS) {
      createCalendarEvent_(reservation);
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
  return getSheet_(RESERVATIONS_SHEET_NAME);
}

function getArchiveSheet_() {
  return getSheet_(ARCHIVE_SHEET_NAME);
}

function getSheet_(sheetName) {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(sheetName);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(sheetName);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(RESERVATION_HEADERS);
    sheet.setFrozenRows(1);
  }

  return sheet;
}

function archivePastReservations() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);

  try {
    const reservationsSheet = getReservationsSheet_();
    const archiveSheet = getArchiveSheet_();
    const lastRow = reservationsSheet.getLastRow();

    if (lastRow <= 1) {
      return;
    }

    const today = new Date();
    today.setHours(0, 0, 0, 0);

    const archiveBefore = new Date(today);
    archiveBefore.setDate(archiveBefore.getDate() - ARCHIVE_AFTER_DAYS);

    const rows = reservationsSheet.getRange(2, 1, lastRow - 1, RESERVATION_HEADERS.length).getValues();
    const rowsToArchive = [];
    const rowNumbersToDelete = [];

    rows.forEach((row, index) => {
      const reservationDate = normalizeDate_(row[5]);

      if (reservationDate && reservationDate < archiveBefore) {
        const archivedRow = row.slice();
        archivedRow[1] = "Archived";
        rowsToArchive.push(archivedRow);
        rowNumbersToDelete.push(index + 2);
      }
    });

    if (!rowsToArchive.length) {
      return;
    }

    archiveSheet
      .getRange(archiveSheet.getLastRow() + 1, 1, rowsToArchive.length, RESERVATION_HEADERS.length)
      .setValues(rowsToArchive);

    rowNumbersToDelete.reverse().forEach((rowNumber) => {
      reservationsSheet.deleteRow(rowNumber);
    });
  } finally {
    lock.releaseLock();
  }
}

function installDailyArchiveTrigger() {
  ScriptApp.getProjectTriggers()
    .filter((trigger) => trigger.getHandlerFunction() === "archivePastReservations")
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger("archivePastReservations")
    .timeBased()
    .everyDays(1)
    .atHour(4)
    .create();
}

function normalizeDate_(value) {
  if (!value) {
    return null;
  }

  const date = value instanceof Date ? new Date(value) : new Date(String(value));

  if (Number.isNaN(date.getTime())) {
    return null;
  }

  date.setHours(0, 0, 0, 0);
  return date;
}

function sendGuestConfirmation_(reservation) {
  const subject = `${BAR_NAME} - Reservation request received`;
  const htmlBody = `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #15110b; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Thank you, ${escapeHtml_(reservation.name)}</h2>
      <p>Your reservation request at <strong>${BAR_NAME}</strong> has been received.</p>
      <p>We will review it and send you a final confirmation as soon as possible.</p>
      ${reservationTable_(reservation)}
      <p style="margin-top: 18px;">Up is down,<br>${BAR_NAME}</p>
    </div>
  `;

  const emailOptions = {
    to: reservation.email,
    subject,
    htmlBody,
    name: BAR_NAME,
  };

  if (REPLY_TO_EMAIL) {
    emailOptions.replyTo = REPLY_TO_EMAIL;
  }

  MailApp.sendEmail(emailOptions);
}

function sendOwnerNotification_(reservation) {
  if (!OWNER_EMAIL) {
    return;
  }

  const subject = `New ${BAR_NAME} reservation request - ${reservation.date} ${reservation.time}`;
  const htmlBody = `
    <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
      <h2>New reservation request</h2>
      ${reservationTable_(reservation)}
      <p><strong>Reply to guest:</strong> ${escapeHtml_(reservation.email)}</p>
    </div>
  `;

  MailApp.sendEmail({
    to: OWNER_EMAIL,
    subject,
    htmlBody,
    name: BAR_NAME,
    replyTo: reservation.email,
  });
}

function reservationTable_(reservation) {
  return `
    <table cellpadding="8" cellspacing="0" style="border-collapse: collapse; margin-top: 14px;">
      ${tableRow_("Name", reservation.name)}
      ${tableRow_("Email", reservation.email)}
      ${tableRow_("Phone", reservation.phone)}
      ${tableRow_("Date", reservation.date)}
      ${tableRow_("Time", reservation.time)}
      ${tableRow_("Guests", reservation.guests)}
      ${tableRow_("Notes", reservation.notes)}
    </table>
  `;
}

function tableRow_(label, value) {
  if (!value) {
    return "";
  }

  return `
    <tr>
      <th align="left" style="border: 1px solid #d8c398; background: #f4ead2;">${escapeHtml_(label)}</th>
      <td style="border: 1px solid #d8c398;">${escapeHtml_(value)}</td>
    </tr>
  `;
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
    `${BAR_NAME} reservation - ${reservation.name} (${reservation.guests})`,
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

function escapeHtml_(value) {
  return String(value || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");
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

For updates after the first deployment, use `Deploy > Manage deployments`, click the pencil, choose `New version`, then click `Deploy`. This keeps the same `/exec` URL.

## 4. Install automatic archiving

In Apps Script, select the function `installDailyArchiveTrigger`, then click `Run` once.

Google may ask for authorization. After that, the script will automatically move old bookings from `Reservations` to `Archive` every day around 04:00.

The setting `ARCHIVE_AFTER_DAYS = 1` means a reservation is archived one full day after its date. For example, a reservation on September 15 can be archived from September 17.

## 5. Connect the site

Paste the `/exec` URL into `reservations-config.js`:

```js
window.MAELSTROM_RESERVATION_ENDPOINT = "YOUR_EXEC_URL_HERE";
```
