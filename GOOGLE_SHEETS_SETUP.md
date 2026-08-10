# Maelstrom Google Sheets tier list setup

This connects the QR tier list to one shared Google Sheet.

## 1. Create the sheet

Create a Google Sheet named `Maelstrom Tier List`.

Add a first row with these columns:

```text
id | createdAt | taster | note | rankings
```

## 2. Add Apps Script

In the Google Sheet, open `Extensions > Apps Script`.

Paste this code:

```javascript
const SHEET_NAME = "Submissions";

function getSheet() {
  const spreadsheet = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = spreadsheet.getSheetByName(SHEET_NAME);

  if (!sheet) {
    sheet = spreadsheet.insertSheet(SHEET_NAME);
    sheet.appendRow(["id", "createdAt", "taster", "note", "rankings"]);
  }

  return sheet;
}

function doPost(event) {
  const sheet = getSheet();
  const payload = JSON.parse(event.postData.contents || "{}");

  sheet.appendRow([
    payload.id || Utilities.getUuid(),
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
      createdAt: row[1] instanceof Date ? row[1].toISOString() : String(row[1] || ""),
      taster: String(row[2] || ""),
      note: String(row[3] || ""),
      rankings: JSON.parse(row[4] || "{}"),
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
