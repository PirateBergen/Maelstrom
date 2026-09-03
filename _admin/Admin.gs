// Add this file to the EXISTING, spreadsheet-bound Apps Script project as Admin.gs.
// All credentials and the Google-account allowlist belong in Script Properties.
const ADMIN_MESSAGES_HEADERS = ["ID", "Received at", "Status", "Name", "Email", "Subject", "Message"];
const ADMIN_GALLERY_TAGS = ["maelstrom-gallery-pending", "maelstrom-gallery", "maelstrom-gallery-rejected"];

function adminRequireUser_() {
  const allowed = (PropertiesService.getScriptProperties().getProperty("ADMIN_ALLOWED_EMAILS") || "")
    .split(",").map(value => value.trim().toLowerCase()).filter(Boolean);
  // NEVER use getEffectiveUser(): on the public deployment that would identify the owner, not the visitor.
  const email = String(Session.getActiveUser().getEmail() || "").trim().toLowerCase();
  if (!email || !allowed.includes(email)) throw new Error("Accès refusé. Connecte-toi avec le compte Google autorisé.");
  return email;
}

function renderAdminPage_() {
  try {
    adminRequireUser_();
    return HtmlService.createHtmlOutputFromFile("Admin").setTitle("Maelstrom · Administration")
      .addMetaTag("viewport", "width=device-width, initial-scale=1");
  } catch (_) {
    return HtmlService.createHtmlOutput('<!doctype html><html lang="fr"><head><meta name="robots" content="noindex"></head><body style="background:#071419;color:#e9fbff;font:18px/1.6 Arial;padding:40px"><h1>Accès réservé</h1><p>Ouvre le déploiement privé avec le compte Google autorisé. Aucune donnée n’a été chargée.</p><a style="color:#83e6ef" target="_top" href="https://maelstrombergen.com/admin.html">Retour à Maelstrom</a></body></html>');
  }
}

function adminHash_(value) {
  return Utilities.base64EncodeWebSafe(Utilities.computeDigest(Utilities.DigestAlgorithm.SHA_256, String(value))).replace(/=+$/g, "");
}

function adminBootstrap() {
  const email = adminRequireUser_();
  const csrf = Utilities.getUuid().replace(/-/g, "");
  CacheService.getScriptCache().put("admin-session-" + csrf, email, 3600);
  const props = PropertiesService.getScriptProperties();
  return { email, csrf, galleryConfigured: Boolean(props.getProperty("CLOUDINARY_API_KEY") && props.getProperty("CLOUDINARY_API_SECRET")) };
}

function adminDispatch(request) {
  try {
    const email = adminRequireUser_();
    if (!request || typeof request !== "object") throw new Error("Requête invalide.");
    if (!/^[a-f0-9]{32}$/.test(String(request.csrf || "")) ||
        CacheService.getScriptCache().get("admin-session-" + request.csrf) !== email) {
      throw new Error("Session expirée. Recharge l’administration.");
    }
    const actions = {
      bookings: () => adminBookings_(request),
      messages: () => adminMessages_(request),
      photos: () => adminPhotos_(request),
      confirmBooking: () => adminChangeBooking_(request, "Confirmed"),
      cancelBooking: () => adminChangeBooking_(request, "Cancelled by Maelstrom"),
      readMessage: () => adminReadMessage_(request),
      approvePhoto: () => adminChangePhoto_(request, true),
      rejectPhoto: () => adminChangePhoto_(request, false),
    };
    if (!Object.prototype.hasOwnProperty.call(actions, request.action)) throw new Error("Action inconnue.");
    const mutation = !["bookings", "messages", "photos"].includes(request.action);
    if (!mutation) return { ok: true, data: actions[request.action]() };
    if (!/^[a-f0-9-]{32,36}$/i.test(String(request.requestId || ""))) throw new Error("Identifiant de requête manquant.");
    const lock = LockService.getScriptLock();
    lock.waitLock(10000);
    try {
      const cache = CacheService.getScriptCache();
      const key = "admin-result-" + adminHash_(email + request.requestId);
      const previous = cache.get(key);
      if (previous) return JSON.parse(previous);
      const data = actions[request.action]();
      const result = { ok: true, data };
      cache.put(key, JSON.stringify(result), 3600);
      try {
        adminAudit_(email, request.action, request.id || request.publicId);
      } catch (_) {
        result.data.warning = (result.data.warning || "") + " L’action est enregistrée, mais le journal administratif est indisponible.";
      }
      return result;
    } finally { lock.releaseLock(); }
  } catch (error) {
    // Provider responses and secrets must never be returned to the browser.
    return { ok: false, error: String(error.message || "Action impossible.").slice(0, 250) };
  }
}

function adminRows_(sheet, columns) {
  return sheet.getLastRow() > 1 ? sheet.getRange(2, 1, sheet.getLastRow() - 1, columns).getValues() : [];
}

function adminDate_(value, pattern) {
  return value instanceof Date ? Utilities.formatDate(value, "Europe/Oslo", pattern) : String(value || "");
}

function adminPage_(items, request) {
  const offset = Math.max(0, Math.floor(Number(request.offset) || 0));
  return { items: items.slice(offset, offset + 50), total: items.length, next: offset + 50 < items.length ? offset + 50 : null };
}

function adminBookingId_(row) {
  // Do not send cancellation credentials or sheet row indexes to the browser.
  return adminHash_(row[10] || JSON.stringify([row[0], ...row.slice(2, 10)]));
}

function adminBookings_(request) {
  const archive = request.archive === true;
  const sheet = archive ? getArchiveSheet_() : getReservationsSheet_();
  const items = adminRows_(sheet, RESERVATION_HEADERS.length).map(row => ({
    id: adminBookingId_(row), status: String(row[1]), name: String(row[2]), email: String(row[3]),
    phone: String(row[4] || ""), date: adminDate_(row[5], "yyyy-MM-dd"), time: adminDate_(row[6], "HH:mm"),
    guests: String(row[7]), notes: String(row[8] || ""), archive,
  })).filter(item => !request.date || item.date === request.date)
    .sort((a, b) => (archive ? -1 : 1) * (a.date + a.time).localeCompare(b.date + b.time));
  return adminPage_(items, request);
}

function adminChangeBooking_(request, status) {
  const sheet = getReservationsSheet_();
  const rows = adminRows_(sheet, RESERVATION_HEADERS.length);
  if (rows.filter(row => adminBookingId_(row) === request.id).length > 1) {
    throw new Error("Plusieurs anciennes réservations ont cette référence. Vérifie-les directement dans Google Sheets.");
  }
  const index = rows.findIndex(row => adminBookingId_(row) === request.id);
  if (index < 0) {
    if (status !== "Confirmed" && adminRows_(getArchiveSheet_(), RESERVATION_HEADERS.length)
      .some(row => adminBookingId_(row) === request.id && /cancel/i.test(row[1]))) return { message: "Réservation déjà annulée et archivée." };
    throw new Error("Réservation introuvable ou déjà archivée. Actualise la liste.");
  }
  const row = rows[index];
  if (String(row[1]) === status) return { message: "Aucun changement : ce statut est déjà enregistré." };
  if (/cancel|reject|declin|archiv/i.test(row[1])) throw new Error("Cette réservation n’est plus active.");
  if (status === "Confirmed") {
    sheet.getRange(index + 2, 2).setValue(status);
  } else {
    const archive = getArchiveSheet_();
    row[1] = status;
    if (!adminRows_(archive, RESERVATION_HEADERS.length).some(saved => adminBookingId_(saved) === request.id)) {
      archive.getRange(archive.getLastRow() + 1, 1, 1, row.length).setValues([row]);
      SpreadsheetApp.flush(); // Archive first; a failed delete cannot lose the record.
    }
    sheet.deleteRow(index + 2);
  }
  let warning = "";
  try { adminBookingEmail_(row, status === "Confirmed"); }
  catch (_) { warning = "Le statut est enregistré, mais l’e-mail n’a pas pu être envoyé. Préviens le client manuellement."; }
  return { message: status === "Confirmed" ? "Réservation confirmée." : "Réservation annulée et archivée.", warning };
}

function adminBookingEmail_(row, confirmed) {
  const email = String(row[3]);
  if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) throw new Error("Adresse invalide.");
  const title = confirmed ? "Your Maelstrom reservation is confirmed" : "Your Maelstrom reservation has been cancelled";
  const booking = { date: adminDate_(row[5], "yyyy-MM-dd"), time: adminDate_(row[6], "HH:mm"), guests: String(row[7]) };
  const publicUrl = PropertiesService.getScriptProperties().getProperty("RESERVATIONS_PUBLIC_URL") || "";
  if (confirmed && !/^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(publicUrl)) {
    throw new Error("URL publique des réservations manquante.");
  }
  // ScriptApp.getService().getUrl() may be the PRIVATE admin deployment here.
  const cancellation = confirmed && /^https:\/\/script\.google\.com\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(publicUrl) && /^[a-f0-9]{32}$/i.test(String(row[10]))
    ? `<p><a href="${escapeHtml_(publicUrl)}?action=cancel&amp;token=${encodeURIComponent(row[10])}">Cancel this reservation</a></p>` : "";
  MailApp.sendEmail({ to: email, subject: title, name: BAR_NAME, replyTo: REPLY_TO_EMAIL,
    htmlBody: `<div style="font:16px/1.6 Arial;color:#102124"><h2>${title}</h2><p>Hello ${escapeHtml_(row[2])},</p><p>${confirmed ? "Your table is confirmed. We look forward to welcoming you." : "Your reservation has been cancelled by our team. Please reply to this email if you have any questions."}</p><p>${escapeHtml_(booking.date)} · ${escapeHtml_(booking.time)} · ${escapeHtml_(booking.guests)} guests</p>${confirmed ? "<p>After 15 minutes of delay, your table is no longer guaranteed.</p>" : ""}${cancellation}</div>` });
}

function adminMessageSheet_() {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName("Messages");
  if (!sheet) sheet = book.insertSheet("Messages");
  if (!sheet.getLastRow()) { sheet.appendRow(ADMIN_MESSAGES_HEADERS); sheet.setFrozenRows(1); }
  return sheet;
}

function adminSafeCell_(value) {
  const text = String(value || "");
  return /^[\s]*[=+@-]/.test(text) ? "'" + text : text;
}

function saveContactMessageForAdmin_(message) {
  // Called only AFTER validation and rate limiting in the existing contact handler.
  adminMessageSheet_().appendRow([Utilities.getUuid(), new Date().toISOString(), "New", ...
    [message.name, message.email, message.subject, message.body].map(adminSafeCell_)]);
}

function adminMessages_(request) {
  const items = adminRows_(adminMessageSheet_(), ADMIN_MESSAGES_HEADERS.length).map(row => ({
    id: String(row[0]), received: adminDate_(row[1], "yyyy-MM-dd HH:mm"), status: String(row[2]),
    name: String(row[3]), email: String(row[4]), subject: String(row[5]), body: String(row[6]),
  })).reverse();
  return adminPage_(items, request);
}

function adminReadMessage_(request) {
  const sheet = adminMessageSheet_();
  const index = adminRows_(sheet, ADMIN_MESSAGES_HEADERS.length).findIndex(row => String(row[0]) === request.id);
  if (index < 0) throw new Error("Message introuvable.");
  sheet.getRange(index + 2, 3).setValue("Read");
  return { message: "Message marqué comme lu." };
}

function adminAudit_(email, action, id) {
  const book = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = book.getSheetByName("Admin log");
  if (!sheet) { sheet = book.insertSheet("Admin log"); sheet.appendRow(["Date", "Account", "Action", "Reference"]); }
  sheet.appendRow([new Date().toISOString(), email, action, adminSafeCell_(id)]);
}

function adminCloudinary_(path, payload) {
  const props = PropertiesService.getScriptProperties();
  const key = props.getProperty("CLOUDINARY_API_KEY"), secret = props.getProperty("CLOUDINARY_API_SECRET");
  if (!key || !secret) throw new Error("Cloudinary n’est pas encore connecté à l’administration.");
  let response;
  try {
    response = UrlFetchApp.fetch("https://api.cloudinary.com/v1_1/yfquewjr/" + path, {
      method: payload ? "post" : "get", headers: { Authorization: "Basic " + Utilities.base64Encode(key + ":" + secret) },
      ...(payload ? { payload } : {}), muteHttpExceptions: true,
    });
  } catch (_) { throw new Error("Connexion à Cloudinary indisponible. Actualise avant de réessayer."); }
  if (response.getResponseCode() === 429) throw new Error("Limite Cloudinary atteinte. Réessaie plus tard.");
  if (response.getResponseCode() < 200 || response.getResponseCode() >= 300) throw new Error("Cloudinary n’a pas accepté cette opération. Vérifie les droits du compte.");
  try { return JSON.parse(response.getContentText()); }
  catch (_) { throw new Error("Réponse Cloudinary illisible. Actualise avant de réessayer."); }
}

function adminIsGalleryAsset_(asset) {
  return asset.resource_type === "image" && asset.type === "upload" &&
    (asset.asset_folder === "maelstrom/gallery-submissions" || (asset.tags || []).some(tag => ADMIN_GALLERY_TAGS.includes(tag)));
}

function adminPhotos_(request) {
  const paths = {
    pending: "resources/image/moderations/manual/pending", published: "resources/image/tags/maelstrom-gallery",
    rejected: "resources/image/tags/maelstrom-gallery-rejected",
  };
  if (!Object.prototype.hasOwnProperty.call(paths, request.filter)) throw new Error("Filtre invalide.");
  const cursor = String(request.cursor || "").slice(0, 1024);
  const result = adminCloudinary_(paths[request.filter] + "?max_results=30&tags=true&context=true" + (cursor ? "&next_cursor=" + encodeURIComponent(cursor) : ""));
  return { items: (result.resources || []).filter(adminIsGalleryAsset_).map(asset => ({
    publicId: asset.public_id, reference: String(asset.context?.custom?.submission_id || asset.display_name || asset.public_id),
    created: asset.created_at || "", image: "https://res.cloudinary.com/yfquewjr/image/upload/c_limit,w_700/" + asset.public_id.split("/").map(encodeURIComponent).join("/"),
  })), next: result.next_cursor || null };
}

function adminChangePhoto_(request, approve) {
  const publicId = String(request.publicId || "");
  if (!publicId || publicId.length > 255 || /[\u0000-\u001f]/.test(publicId)) throw new Error("Photo invalide.");
  const path = "resources/image/upload/" + encodeURIComponent(publicId);
  const asset = adminCloudinary_(path + "?tags=true");
  if (!adminIsGalleryAsset_(asset)) throw new Error("Cette photo ne fait pas partie de la galerie Maelstrom.");
  const tags = (asset.tags || []).filter(tag => !ADMIN_GALLERY_TAGS.includes(tag));
  tags.push(approve ? "maelstrom-gallery" : "maelstrom-gallery-rejected");
  adminCloudinary_(path, { tags: tags.join(","), moderation_status: approve ? "approved" : "rejected" });
  return { message: approve ? "Photo approuvée. L’affichage public peut prendre quelques minutes." : "Photo retirée de la galerie. Elle est conservée dans les refusées, sans suppression définitive. Les caches peuvent prendre quelques minutes." };
}
