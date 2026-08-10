# Maelstrom Google Sheets tier list setup

This connects the QR tier list to one shared Google Sheet.

## 1. Create the sheet

Create a Google Sheet named `Maelstrom Tier List`.

Add a first row with these columns:

```text
id | visitorId | createdAt | taster | note | rankings
```

## 2. Add Apps Script

In the Google Sheet, open `Extensions > Apps Script`.

Paste this code:

```javascript
const SHEET_NAME = "Submissions";
const HEADERS = ["id", "visitorId", "createdAt", "taster", "note", "rankings"];

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
  }

  if (sheet.getLastRow() === 0) {
    sheet.appendRow(HEADERS);
  }

  const currentHeaders = sheet.getRange(1, 1, 1, sheet.getLastColumn()).getValues()[0];
  if (currentHeaders.indexOf("visitorId") === -1) {
    sheet.insertColumnAfter(1);
    sheet.getRange(1, 1, 1, HEADERS.length).setValues([HEADERS]);
  }

  return sheet;
}

function hasVisitorAlreadyVoted(sheet, visitorId) {
  if (!visitorId || sheet.getLastRow() < 2) {
    return false;
  }

  const visitorIds = sheet.getRange(2, 2, sheet.getLastRow() - 1, 1).getValues().flat();
  return visitorIds.includes(visitorId);
}

function doPost(event) {
  const sheet = getSheet();
  const payload = JSON.parse(event.postData.contents || "{}");
  const visitorId = String(payload.visitorId || "");

  if (hasVisitorAlreadyVoted(sheet, visitorId)) {
    return ContentService
      .createTextOutput(JSON.stringify({ ok: false, duplicate: true }))
      .setMimeType(ContentService.MimeType.JSON);
  }

  sheet.appendRow([
    payload.id || Utilities.getUuid(),
    visitorId,
    payload.createdAt || new Date().toISOString(),
    payload.taster || "",
    payload.note || "",
    JSON.stringify(payload.rankings || {}),
  ]);

  return ContentService
    .createTextOutput(JSON.stringify({ ok: true }))
    .setMimeType(ContentService.MimeType.JSON);
}

function doGet(event) {
  const sheet = getSheet();
  const rows = sheet.getDataRange().getValues().slice(1);
  const submissions = rows
    .filter((row) => row[0])
    .map((row) => ({
      id: String(row[0]),
      visitorId: String(row[1] || ""),
      createdAt: row[2] instanceof Date ? row[2].toISOString() : String(row[2] || ""),
      taster: String(row[3] || ""),
      note: String(row[4] || ""),
      rankings: JSON.parse(row[5] || "{}"),
    }));

  const output = { submissions };
  const callback = event.parameter.callback;

  if (callback) {
    return ContentService
      .createTextOutput(`${callback}(${JSON.stringify(output)});`)
      .setMimeType(ContentService.MimeType.JAVASCRIPT);
  }

  return ContentService
    .createTextOutput(JSON.stringify(output))
    .setMimeType(ContentService.MimeType.JSON);
}
```

## 3. Deploy it

Click `Deploy > New deployment`.

Choose:

- Type: `Web app`
- Execute as: `Me`
- Who has access: `Anyone`

Copy the Web app URL.

## 4. Connect the site

Open `qr/config.js` and replace the empty value with your Apps Script URL:

```javascript
window.MAELSTROM_RESULTS_ENDPOINT = "PASTE_YOUR_WEB_APP_URL_HERE";
```

Then publish the site again.
