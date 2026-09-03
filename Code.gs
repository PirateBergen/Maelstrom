const RESERVATIONS_SHEET_NAME = "Reservations";
const ARCHIVE_SHEET_NAME = "Archive";
const ARCHIVE_AFTER_DAYS = 1;
const CREATE_CALENDAR_EVENTS = false;
const CALENDAR_ID = "";
const OWNER_EMAIL = "contact@maelstrombergen.com";
const BAR_NAME = "Maelstrom";
const REPLY_TO_EMAIL = OWNER_EMAIL;
const BREVO_API_KEY_PROPERTY = "BREVO_API_KEY";
const BREVO_LIST_ID_PROPERTY = "BREVO_NEWSLETTER_LIST_ID";
const MINIMUM_BOOKING_NOTICE_MINUTES = 15;
const MAXIMUM_BOOKING_MONTHS = 6;
const LATE_GRACE_MINUTES = 15;
const REMINDER_HOURS_BEFORE = 24;

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
  "Cancellation token",
  "Reminder sent at",
  "Submission ID",
  "Submission fingerprint",
  "Notification status",
];

function doPost(e) {
  const lock = LockService.getScriptLock();
  let locked = false;
  let received = false;

  try {
    lock.waitLock(10000);
    locked = true;
    const sheet = getReservationsSheet_();
    const data = e.parameter || {};

    if (clean_(data.type) === "contact") {
      return handleContactMessage_(data);
    }

    if (clean_(data.type) === "newsletter") {
      return handleNewsletterSignup_(data);
    }

    if (clean_(data.type) === "cancel") {
      return handleCancellation_(data);
    }

    const reservation = {
      submittedAt: new Date().toISOString(),
      status: "New",
      name: clean_(data.name),
      email: clean_(data.email),
      phone: clean_(data.phone),
      date: clean_(data.date),
      time: clean_(data.time),
      guests: clean_(data.guests),
      notes: clean_(data.notes),
      source: clean_(data.source) || "Maelstrom website",
      cancellationToken: Utilities.getUuid().replace(/-/g, ""),
    };

    if (!reservation.name || !reservation.email || !reservation.date || !reservation.time || !reservation.guests) {
      return json_({ ok: false, error: "Missing required reservation fields." });
    }

    const submissionId = clean_(data.submissionId);
    if (submissionId && !/^[a-f0-9]{32}$/i.test(submissionId)) return json_({ ok: false, error: "Invalid submission reference." });
    const fingerprint = reservationFingerprint_(reservation, data);
    // Check before date/slot validation: a retry may own a now-unavailable slot.
    const previous = findReservationSubmission_(submissionId, fingerprint, sheet);
    if (previous) {
      if (submissionId && previous[13] !== fingerprint) return json_({ ok:false, error:"This submission reference belongs to a different request." });
      return json_({ ok:true, received:true, duplicate:true, notificationStatus:String(previous[14] || "unknown") });
    }

    if (!isReservationDateAllowed_(reservation.date)) {
      return json_({ ok: false, error: "Reservations are unavailable for this date." });
    }

    if (!isReservationTimeAllowed_(reservation.date, reservation.time)) {
      return json_({ ok: false, error: "Reservations require at least 15 minutes notice." });
    }

    const oracleRequested = clean_(data.oracleRequested) === "yes";
    const oracleTimes = parseOracleTimes_(data.oracleTimes);
    if (oracleRequested) {
      const alreadyBooked = getBookedOracleTimes_(reservation.date, sheet);
      const conflictingTimes = oracleTimes.filter((time) => alreadyBooked.includes(time));

      if (!oracleTimes.length || new Set(oracleTimes).size !== oracleTimes.length) {
        return json_({ ok: false, error: "Invalid divination time slots." });
      }

      if (conflictingTimes.length) {
        return json_({ ok: false, error: "Divination time slot already booked.", bookedTimes: conflictingTimes });
      }
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
      reservation.cancellationToken,
      "",
      submissionId,
      fingerprint,
      "pending",
    ]);
    received = true;
    const rowNumber = sheet.getLastRow();
    const notificationFailures = [];

    if (clean_(data.newsletterOptIn) === "yes") {
      try {
        subscribeToNewsletter_(reservation.email);
        sendNewsletterSubscriptionConfirmation_(reservation.email, reservation.name);
      } catch (newsletterError) {
        notificationFailures.push("newsletter_failed");
        console.error("Newsletter notification failed for reservation row " + rowNumber);
      }
    }

    try { sendGuestConfirmation_(reservation); }
    catch (_) { notificationFailures.push("guest_email_failed"); }
    try { sendOwnerNotification_(reservation); }
    catch (_) { notificationFailures.push("owner_email_failed"); }

    if (CREATE_CALENDAR_EVENTS) {
      try { createCalendarEvent_(reservation); }
      catch (_) { notificationFailures.push("calendar_event_failed"); }
    }
    const notificationStatus = notificationFailures.length ? notificationFailures.join(", ") : "sent";
    sheet.getRange(rowNumber, 15).setValue(notificationStatus);
    return json_({ ok: true, received:true, notificationStatus });
  } catch (error) {
    if (received) return json_({ ok:true, received:true, notificationStatus:"unknown" });
    return json_({ ok: false, error: "Unable to record this request. Please retry with the same submission reference." });
  } finally {
    if (locked) lock.releaseLock();
  }
}

function reservationFingerprint_(reservation, data) {
  const fields = [reservation.name, reservation.email.toLowerCase(), reservation.phone, reservation.date,
    reservation.time, reservation.guests, reservation.notes, clean_(data.oracleRequested), clean_(data.oracleTimes), clean_(data.newsletterOptIn)];
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, JSON.stringify(fields))).replace(/=+$/g, "");
}

function findReservationSubmission_(submissionId, fingerprint, activeSheet) {
  // Persistent identifiers survive cache eviction and cancellation/archiving.
  // Older clients without an identifier get a ten-minute identical-request safeguard.
  for (const sheet of [activeSheet, getArchiveSheet_()]) {
    const count = sheet.getLastRow() - 1;
    if (count < 1) continue;
    const rows = sheet.getRange(2, 1, count, RESERVATION_HEADERS.length).getValues();
    const match = rows.find(row => submissionId ? String(row[12] || "") === submissionId :
      row[13] === fingerprint && Date.now() - new Date(row[0]).getTime() >= 0 && Date.now() - new Date(row[0]).getTime() < 10 * 60 * 1000);
    if (match) return match;
  }
  return null;
}

function handleContactMessage_(data) {
  if (clean_(data.website)) {
    return json_({ ok: true });
  }

  const message = {
    name: clean_(data.name),
    email: clean_(data.email),
    subject: clean_(data.subject),
    body: clean_(data.message).slice(0, 3000),
    submittedAt: clean_(data.submittedAt) || new Date().toISOString(),
  };

  if (!message.name || !message.email || !message.subject || !message.body || !/^\S+@\S+\.\S+$/.test(message.email)) {
    return json_({ ok: false, error: "Missing or invalid contact fields." });
  }

  const cache = CacheService.getScriptCache();
  const digest = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, message.email.toLowerCase()));
  const cacheKey = `contact-${digest.slice(0, 40)}`;
  const attempts = Number(cache.get(cacheKey) || 0);
  if (attempts >= 5) {
    return json_({ ok: false, error: "Too many contact requests. Please try again later." });
  }
  cache.put(cacheKey, String(attempts + 1), 3600);

  if (typeof saveContactMessageForAdmin_ === "function") {
    saveContactMessageForAdmin_(message);
  }

  MailApp.sendEmail({
    to: OWNER_EMAIL,
    subject: `[${BAR_NAME}] ${message.subject}`,
    name: `${BAR_NAME} website`,
    replyTo: message.email,
    htmlBody: `
      <div style="font-family: Arial, sans-serif; color: #111; line-height: 1.5;">
        <h2>New website message</h2>
        <p><strong>From:</strong> ${escapeHtml_(message.name)} (${escapeHtml_(message.email)})</p>
        <p><strong>Subject:</strong> ${escapeHtml_(message.subject)}</p>
        <p style="white-space: pre-wrap;">${escapeHtml_(message.body)}</p>
        <p><small>Received ${escapeHtml_(message.submittedAt)}</small></p>
      </div>
    `,
  });

  return json_({ ok: true, service: "Maelstrom contact form" });
}

function handleNewsletterSignup_(data) {
  const email = clean_(data.email).toLowerCase();
  if (!/^\S+@\S+\.\S+$/.test(email)) {
    return json_({ ok: false, error: "Invalid email address." });
  }

  const cache = CacheService.getScriptCache();
  const digest = Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, email));
  const cacheKey = `newsletter-${digest.slice(0, 40)}`;
  if (cache.get(cacheKey)) {
    return json_({ ok: true, duplicate: true });
  }

  subscribeToNewsletter_(email);
  cache.put(cacheKey, "1", 86400);
  return json_({ ok: true, service: "Maelstrom newsletter" });
}

function subscribeToNewsletter_(email) {
  const properties = PropertiesService.getScriptProperties();
  const apiKey = properties.getProperty(BREVO_API_KEY_PROPERTY);
  const listId = Number(properties.getProperty(BREVO_LIST_ID_PROPERTY));
  if (!apiKey || !Number.isInteger(listId) || listId <= 0) {
    throw new Error("Brevo API key or newsletter list ID is missing.");
  }

  const response = UrlFetchApp.fetch("https://api.brevo.com/v3/contacts", {
    method: "post",
    contentType: "application/json",
    headers: { "api-key": apiKey, accept: "application/json" },
    payload: JSON.stringify({ email, listIds: [listId], updateEnabled: true }),
    muteHttpExceptions: true,
  });
  const status = response.getResponseCode();
  if (status < 200 || status >= 300) {
    throw new Error(`Brevo returned ${status}: ${response.getContentText()}`);
  }
}

function sendNewsletterSubscriptionConfirmation_(email, name) {
  MailApp.sendEmail({
    to: email,
    subject: `You're subscribed to the ${BAR_NAME} newsletter`,
    name: BAR_NAME,
    replyTo: REPLY_TO_EMAIL,
    htmlBody: `
      <div style="font-family:Arial,sans-serif;line-height:1.6;color:#102124;">
        <h2>Welcome aboard!</h2>
        <p>Hello ${escapeHtml_(name || "there")},</p>
        <p>Your subscription to the ${escapeHtml_(BAR_NAME)} newsletter is confirmed.</p>
        <p>You'll receive our news, upcoming events and menu updates.</p>
        <p><a href="https://maelstrombergen.com/" style="color:#126b78;">Visit Maelstrom</a></p>
      </div>`,
  });
}

function handleCancellation_(data) {
  const token = clean_(data.token);
  if (!/^[a-f0-9]{32}$/i.test(token)) {
    return cancellationResultPage_(false, "Invalid cancellation link.");
  }

  const sheet = getReservationsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return cancellationResultPage_(false, "Reservation not found.");
  const rows = sheet.getRange(2, 1, lastRow - 1, RESERVATION_HEADERS.length).getValues();
  const index = rows.findIndex((row) => String(row[10] || "") === token);
  if (index < 0) return cancellationResultPage_(false, "Reservation not found.");

  const rowNumber = index + 2;
  const currentStatus = String(rows[index][1] || "");
  if (!/cancel/i.test(currentStatus)) {
    const cancelledRow = rows[index].slice();
    cancelledRow[1] = "Cancelled by guest";
    const archiveSheet = getArchiveSheet_();
    archiveSheet
      .getRange(archiveSheet.getLastRow() + 1, 1, 1, RESERVATION_HEADERS.length)
      .setValues([cancelledRow]);
    sheet.deleteRow(rowNumber);

    try {
      MailApp.sendEmail({
        to: rows[index][3],
        subject: `Your ${BAR_NAME} reservation has been cancelled`,
        name: BAR_NAME,
        replyTo: REPLY_TO_EMAIL,
        htmlBody: `
          <div style="font-family:Arial,sans-serif;line-height:1.6;color:#102124;">
            <h2>Your reservation has been cancelled</h2>
            <p>Hello ${escapeHtml_(rows[index][2])},</p>
            <p>This email confirms that your reservation request at ${escapeHtml_(BAR_NAME)} has been cancelled.</p>
            <p><strong>Date:</strong> ${escapeHtml_(rows[index][5])}<br>
            <strong>Time:</strong> ${escapeHtml_(rows[index][6])}<br>
            <strong>Guests:</strong> ${escapeHtml_(rows[index][7])}</p>
            <p><a href="https://maelstrombergen.com/reservations.html" style="color:#126b78;">Make a new reservation</a></p>
          </div>`,
      });

      MailApp.sendEmail({
        to: OWNER_EMAIL,
        subject: `Cancelled ${BAR_NAME} reservation - ${rows[index][5]} ${rows[index][6]}`,
        name: `${BAR_NAME} website`,
        htmlBody: `<p><strong>${escapeHtml_(rows[index][2])}</strong> cancelled the reservation for ${escapeHtml_(rows[index][5])} at ${escapeHtml_(rows[index][6])}.</p>`,
      });
    } catch (emailError) {
      console.error("Cancellation email failed", emailError);
    }
  }
  return cancellationResultPage_(true, "Your reservation request has been cancelled.");
}

function cancellationPage_(token) {
  const action = ScriptApp.getService().getUrl();
  return HtmlService.createHtmlOutput(`<!doctype html><html><head><base target="_top"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Cancel reservation</title></head><body style="margin:0;background:#020808;color:#d9fbff;font-family:Arial,sans-serif;display:grid;min-height:100vh;place-items:center;text-align:center"><main style="max-width:520px;padding:32px"><h1>Cancel your Maelstrom reservation?</h1><p>This action cannot be undone.</p><form id="cancel-form" method="post" target="_top" action="${escapeHtml_(action)}"><input type="hidden" name="type" value="cancel"><input type="hidden" name="token" value="${escapeHtml_(token)}"><button id="cancel-button" style="min-width:220px;padding:14px 22px;border-radius:999px;border:1px solid #80f1ff;background:#061719;color:#d9fbff;cursor:pointer" type="submit">Confirm cancellation</button><p id="cancel-progress" aria-live="polite" style="min-height:24px;color:#9eeef7"></p></form><p><a target="_top" style="color:#80f1ff" href="https://maelstrombergen.com/">Return to Maelstrom</a></p></main><script>document.getElementById("cancel-form").addEventListener("submit",function(){var button=document.getElementById("cancel-button");button.disabled=true;button.textContent="Cancelling...";button.style.cursor="wait";document.getElementById("cancel-progress").textContent="Please wait. Your cancellation is being confirmed.";});</script></body></html>`)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function cancellationResultPage_(success, message) {
  return HtmlService.createHtmlOutput(`<!doctype html><html><head><base target="_top"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Maelstrom reservation</title></head><body style="margin:0;background:#020808;color:#d9fbff;font-family:Arial,sans-serif;display:grid;min-height:100vh;place-items:center;text-align:center"><main style="max-width:520px;padding:32px"><h1>${success ? "Reservation cancelled" : "Unable to cancel"}</h1><p>${escapeHtml_(message)}</p><p><a target="_top" style="color:#80f1ff" href="https://maelstrombergen.com/">Return to Maelstrom</a></p></main></body></html>`)
    .setXFrameOptionsMode(HtmlService.XFrameOptionsMode.ALLOWALL);
}

function doGet(e) {
  const data = (e && e.parameter) || {};

  if (data.action === "admin") {
    if (typeof renderAdminPage_ !== "function") {
      return HtmlService.createHtmlOutput("Administration non configurée.");
    }
    return renderAdminPage_();
  }

  if (data.action === "galleryUploadClaim") {
    return jsonp_(claimGalleryUpload_(clean_(data.device)), data.callback);
  }

  if (data.action === "galleryUploadRelease") {
    return jsonp_(releaseGalleryUploadClaim_(clean_(data.device)), data.callback);
  }

  if (data.action === "oracleAvailability") {
    const date = clean_(data.date);
    return jsonp_({
      ok: true,
      date,
      bookedTimes: getBookedOracleTimes_(date),
    }, data.callback);
  }

  if (data.action === "cancel" && clean_(data.token)) {
    return cancellationPage_(clean_(data.token));
  }

  return json_({ ok: true, service: "Maelstrom reservations" });
}

function galleryDateKey_() {
  return Utilities.formatDate(new Date(), "Europe/Oslo", "yyyy-MM-dd");
}

function galleryDevicePropertyKey_(device) {
  const digest = Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, device);
  const encoded = Utilities.base64EncodeWebSafe(digest).replace(/=+$/g, "").slice(0, 32);
  return `gallery-upload-${galleryDateKey_()}-${encoded}`;
}

function cleanupGalleryUploadClaims_(properties) {
  const keepAfter = new Date(Date.now() - 3 * 24 * 60 * 60 * 1000);
  const values = properties.getProperties();
  Object.keys(values).forEach((key) => {
    const match = key.match(/^gallery-upload-(\d{4}-\d{2}-\d{2})-/);
    if (match && new Date(`${match[1]}T12:00:00Z`) < keepAfter) properties.deleteProperty(key);
  });
}

function claimGalleryUpload_(device) {
  if (!/^[a-f0-9]{32}$/i.test(device)) return { ok: false, allowed: false, error: "Invalid device identifier." };
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
    const properties = PropertiesService.getScriptProperties();
    cleanupGalleryUploadClaims_(properties);
    const key = galleryDevicePropertyKey_(device);
    if (properties.getProperty(key)) return { ok: true, allowed: false, date: galleryDateKey_() };
    properties.setProperty(key, new Date().toISOString());
    return { ok: true, allowed: true, date: galleryDateKey_() };
  } finally {
    lock.releaseLock();
  }
}

function releaseGalleryUploadClaim_(device) {
  if (!/^[a-f0-9]{32}$/i.test(device)) return { ok: false };
  PropertiesService.getScriptProperties().deleteProperty(galleryDevicePropertyKey_(device));
  return { ok: true };
}

function parseOracleTimes_(value) {
  return String(value || "")
    .split(",")
    .map((time) => time.trim())
    .filter((time) => /^(?:[01]\d|2[0-3]):(?:00|30)$|^00:00$/.test(time));
}

function isReservationDateAllowed_(dateValue) {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(String(dateValue || ""))) {
    return false;
  }

  const selectedDate = new Date(`${dateValue}T12:00:00`);
  if (Number.isNaN(selectedDate.getTime())) {
    return false;
  }

  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), "yyyy-MM-dd");
  const [year, month, day] = today.split("-").map(Number);
  const targetMonthIndex = month - 1 + MAXIMUM_BOOKING_MONTHS;
  const targetYear = year + Math.floor(targetMonthIndex / 12);
  const targetMonth = targetMonthIndex % 12;
  const lastDay = new Date(targetYear, targetMonth + 1, 0).getDate();
  const maximumDate = new Date(targetYear, targetMonth, Math.min(day, lastDay), 12, 0, 0);
  const maximum = Utilities.formatDate(maximumDate, Session.getScriptTimeZone(), "yyyy-MM-dd");
  const weekday = selectedDate.getDay();
  return dateValue >= today && dateValue <= maximum && weekday !== 0 && weekday !== 1 && weekday !== 2;
}

function reservationDateTime_(dateValue, timeValue) {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(String(dateValue || ""));
  const time = /^(\d{2}):(\d{2})$/.exec(String(timeValue || ""));
  if (!match || !time) return null;
  const date = new Date(Number(match[1]), Number(match[2]) - 1, Number(match[3]), Number(time[1]), Number(time[2]), 0);
  if (timeValue === "00:00") date.setDate(date.getDate() + 1);
  return date;
}

function isReservationTimeAllowed_(dateValue, timeValue) {
  const reservationTime = reservationDateTime_(dateValue, timeValue);
  return Boolean(reservationTime) && reservationTime.getTime() >= Date.now() + MINIMUM_BOOKING_NOTICE_MINUTES * 60 * 1000;
}

function getBookedOracleTimes_(date, sheet) {
  if (!date) {
    return [];
  }

  const reservationsSheet = sheet || getReservationsSheet_();
  const lastRow = reservationsSheet.getLastRow();
  if (lastRow <= 1) {
    return [];
  }

  const rows = reservationsSheet.getRange(2, 1, lastRow - 1, RESERVATION_HEADERS.length).getValues();
  const bookedTimes = new Set();

  rows.forEach((row) => {
    const status = String(row[1] || "").toLowerCase();
    const notes = String(row[8] || "");
    const rowDate = row[5] instanceof Date
      ? Utilities.formatDate(row[5], Session.getScriptTimeZone(), "yyyy-MM-dd")
      : String(row[5] || "");
    if (rowDate !== date || /cancel|reject|declin|archiv/.test(status) || !notes.includes("[Oracle session requested")) {
      return;
    }

    const oracleSection = notes.slice(notes.indexOf("[Oracle session requested"));
    (oracleSection.match(/\b(?:[01]\d|2[0-3]):[0-5]\d\b/g) || []).forEach((time) => bookedTimes.add(time));
  });

  return [...bookedTimes].sort();
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
  } else {
    sheet.getRange(1, 1, 1, RESERVATION_HEADERS.length).setValues([RESERVATION_HEADERS]);
  }

  return sheet;
}

function requireReservationAdmin_() {
  const allowed = String(PropertiesService.getScriptProperties().getProperty("ADMIN_ALLOWED_EMAILS") || "")
    .split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  const email = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
  if (!email || !allowed.includes(email)) throw new Error("Accès réservé au compte administrateur.");
}

// Public editor entry points check the visitor, never the effective script owner.
// Scheduled handlers end in '_' and cannot be invoked with google.script.run.
function archivePastReservations() {
  requireReservationAdmin_();
  return archivePastReservations_();
}

function archivePastReservations_() {
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
  requireReservationAdmin_();
  ScriptApp.getProjectTriggers()
    .filter((trigger) => ["archivePastReservations", "archivePastReservations_"].includes(trigger.getHandlerFunction()))
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));

  ScriptApp.newTrigger("archivePastReservations_")
    .timeBased()
    .everyDays(1)
    .atHour(4)
    .create();
}

function sendReservationReminders() {
  requireReservationAdmin_();
  return sendReservationReminders_();
}

function sendReservationReminders_() {
  const lock = LockService.getScriptLock();
  lock.waitLock(10000);
  try {
  const sheet = getReservationsSheet_();
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) return;
  const rows = sheet.getRange(2, 1, lastRow - 1, RESERVATION_HEADERS.length).getValues();
  const target = Date.now() + REMINDER_HOURS_BEFORE * 60 * 60 * 1000;

  rows.forEach((row, index) => {
    const status = String(row[1] || "");
    const reminderSent = row[11];
    const reservationTime = reservationDateTime_(
      row[5] instanceof Date ? Utilities.formatDate(row[5], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(row[5] || ""),
      row[6] instanceof Date ? Utilities.formatDate(row[6], "Europe/Oslo", "HH:mm") : String(row[6] || "")
    );
    if (!reservationTime || reminderSent || status !== "Confirmed") return;
    const difference = reservationTime.getTime() - target;
    if (Math.abs(difference) > 35 * 60 * 1000) return;

    const reservation = {
      name: row[2],
      email: row[3],
      date: row[5] instanceof Date ? Utilities.formatDate(row[5], Session.getScriptTimeZone(), "yyyy-MM-dd") : String(row[5] || ""),
      time: row[6] instanceof Date ? Utilities.formatDate(row[6], "Europe/Oslo", "HH:mm") : String(row[6] || ""),
      guests: row[7],
      cancellationToken: row[10],
    };
    try {
      sendGuestReminder_(reservation);
      sheet.getRange(index + 2, 12).setValue(new Date());
    } catch (_) { console.error("Reservation reminder failed for row " + (index + 2)); }
  });
  } finally { lock.releaseLock(); }
}

function installReservationReminderTrigger() {
  requireReservationAdmin_();
  ScriptApp.getProjectTriggers()
    .filter((trigger) => ["sendReservationReminders", "sendReservationReminders_"].includes(trigger.getHandlerFunction()))
    .forEach((trigger) => ScriptApp.deleteTrigger(trigger));
  ScriptApp.newTrigger("sendReservationReminders_").timeBased().everyMinutes(30).create();
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
  const cancellationUrl = `${ScriptApp.getService().getUrl()}?action=cancel&token=${encodeURIComponent(reservation.cancellationToken)}`;
  const htmlBody = `
    <div style="font-family: Georgia, 'Times New Roman', serif; color: #15110b; line-height: 1.5;">
      <h2 style="margin: 0 0 12px;">Thank you, ${escapeHtml_(reservation.name)}</h2>
      <p>Your reservation request at <strong>${BAR_NAME}</strong> has been received.</p>
      <p>We will review it and send you a final confirmation as soon as possible.</p>
      ${reservationTable_(reservation)}
      <p><strong>Please note:</strong> after ${LATE_GRACE_MINUTES} minutes of delay, your table is no longer guaranteed.</p>
      <p><a href="${cancellationUrl}" style="color:#126b78;">Cancel this reservation request</a></p>
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

function sendGuestReminder_(reservation) {
  // Time triggers have no public deployment context; never resolve the private admin URL here.
  const publicUrl = PropertiesService.getScriptProperties().getProperty("RESERVATIONS_PUBLIC_URL") || "";
  if (!/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(publicUrl)) throw new Error("Public reservation URL missing.");
  const cancellationUrl = `${publicUrl}?action=cancel&token=${encodeURIComponent(reservation.cancellationToken)}`;
  MailApp.sendEmail({
    to: reservation.email,
    subject: `${BAR_NAME} - Your reservation is tomorrow`,
    name: BAR_NAME,
    replyTo: REPLY_TO_EMAIL,
    htmlBody: `
      <div style="font-family:Georgia,'Times New Roman',serif;color:#15110b;line-height:1.5">
        <h2>See you soon, ${escapeHtml_(reservation.name)}</h2>
        <p>This is a reminder for your reservation at <strong>${BAR_NAME}</strong>.</p>
        ${reservationTable_(reservation)}
        <p><strong>Please note:</strong> after ${LATE_GRACE_MINUTES} minutes of delay, your table is no longer guaranteed.</p>
        <p><a href="${cancellationUrl}" style="color:#126b78;">Cancel this reservation request</a></p>
        <p>Up is down,<br>${BAR_NAME}</p>
      </div>
    `,
  });
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

function jsonp_(payload, callback) {
  const safeCallback = String(callback || "").replace(/[^a-zA-Z0-9_$]/g, "");
  if (!safeCallback) {
    return json_(payload);
  }

  return ContentService
    .createTextOutput(`${safeCallback}(${JSON.stringify(payload)});`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}
