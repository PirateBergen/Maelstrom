const RESERVATION_ENDPOINT = window.MAELSTROM_RESERVATION_ENDPOINT || "";

const reservationForm = document.querySelector("[data-reservation-form]");
const reservationStatus = document.querySelector("[data-reservation-status]");
const reservationThanks = document.querySelector("#reservationThanks");
const guestsSelect = document.querySelector("[data-guests-select]");
const groupBookingNotice = document.querySelector("[data-group-booking-notice]");
const reservationDate = document.querySelector("[data-reservation-date]");
const bookingTime = document.querySelector("[data-booking-time]");
const divinationOffer = document.querySelector("[data-divination-offer]");
const divinationAddonToggle = document.querySelector("[data-divination-addon-toggle]");
const divinationAddonFields = document.querySelector("[data-divination-addon-fields]");
const divinationParticipants = document.querySelector("[data-divination-participants]");
const divinationTimeSlots = document.querySelector("[data-divination-time-slots]");
const reservationNewsletterOptIn = document.querySelector("[data-reservation-newsletter-opt-in]");
const reservationNewsletterCheckbox = reservationNewsletterOptIn?.querySelector('input[name="newsletterOptIn"]');
let unavailableOracleTimes = new Set();
let oracleAvailabilityRequest = 0;
let reservationSubmitting = false;
const MINIMUM_BOOKING_NOTICE_MINUTES = 15;
const MAXIMUM_BOOKING_MONTHS = 6;
const RESERVATION_NEWSLETTER_SUBSCRIBED_KEY = "maelstrom-newsletter-subscribed-v1";

function hasNewsletterSubscriptionOnDevice() {
  try {
    return localStorage.getItem(RESERVATION_NEWSLETTER_SUBSCRIBED_KEY) === "yes";
  } catch {
    return false;
  }
}

function rememberNewsletterSubscription() {
  try {
    localStorage.setItem(RESERVATION_NEWSLETTER_SUBSCRIBED_KEY, "yes");
  } catch {
    // The reservation still works if storage is unavailable.
  }
  if (reservationNewsletterOptIn) reservationNewsletterOptIn.hidden = true;
}

function reservationText(key) {
  return window.MaelstromI18n?.t(key) || key;
}

function getBookableTimes(intervalMinutes = 15) {
  const times = [];
  for (let minutes = 18 * 60; minutes < 24 * 60; minutes += intervalMinutes) {
    const hour = String(Math.floor(minutes / 60)).padStart(2, "0");
    const minute = String(minutes % 60).padStart(2, "0");
    times.push(`${hour}:${minute}`);
  }
  times.push("00:00");
  return times;
}

function getBergenNowParts() {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    hourCycle: "h23",
  }).formatToParts(new Date());
  const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
  return {
    date: `${values.year}-${values.month}-${values.day}`,
    minutes: Number(values.hour) * 60 + Number(values.minute),
  };
}

function getMaximumDateValue() {
  const { date } = getBergenNowParts();
  const [year, month, day] = date.split("-").map(Number);
  const targetMonth = month - 1 + MAXIMUM_BOOKING_MONTHS;
  const targetYear = year + Math.floor(targetMonth / 12);
  const normalizedMonth = targetMonth % 12;
  const lastDay = new Date(Date.UTC(targetYear, normalizedMonth + 1, 0)).getUTCDate();
  return `${targetYear}-${String(normalizedMonth + 1).padStart(2, "0")}-${String(Math.min(day, lastDay)).padStart(2, "0")}`;
}

function getLeadTimeUnavailableTimes(dateValue, intervalMinutes = 15) {
  const blocked = new Set();
  const now = getBergenNowParts();
  if (!dateValue || dateValue !== now.date) return blocked;
  const earliest = now.minutes + MINIMUM_BOOKING_NOTICE_MINUTES;
  getBookableTimes(intervalMinutes).forEach((time) => {
    const [hour, minute] = time.split(":").map(Number);
    const slotMinutes = time === "00:00" ? 24 * 60 : hour * 60 + minute;
    if (slotMinutes < earliest) blocked.add(time);
  });
  return blocked;
}

function populateTimeSelect(select, selectedValue = "", unavailableTimes = new Set(), intervalMinutes = 15, hideUnavailable = false) {
  const fragment = document.createDocumentFragment();
  const placeholder = document.createElement("option");
  placeholder.value = "";
  placeholder.textContent = reservationText("reservationChooseTime");
  placeholder.disabled = true;
  fragment.append(placeholder);

  const availableTimes = getBookableTimes(intervalMinutes);
  availableTimes.forEach((time) => {
    if (hideUnavailable && unavailableTimes.has(time) && time !== selectedValue) {
      return;
    }
    const option = document.createElement("option");
    option.value = time;
    option.disabled = unavailableTimes.has(time) && time !== selectedValue;
    option.textContent = option.disabled ? `${time} — ${reservationText("oracleTimeUnavailable")}` : time;
    fragment.append(option);
  });

  select.replaceChildren(fragment);
  select.value = selectedValue && availableTimes.includes(selectedValue) && !unavailableTimes.has(selectedValue) ? selectedValue : "";
}

function fetchOracleAvailability(dateValue) {
  if (!RESERVATION_ENDPOINT || !isWednesday(dateValue)) {
    unavailableOracleTimes = new Set();
    return Promise.resolve(true);
  }

  const requestId = ++oracleAvailabilityRequest;
  const callbackName = `maelstromOracleAvailability${Date.now()}${requestId}`;

  return new Promise((resolve) => {
    const script = document.createElement("script");
    const timeout = window.setTimeout(() => finish(false), 10000);

    function finish(success, payload = {}) {
      window.clearTimeout(timeout);
      script.remove();
      delete window[callbackName];

      if (requestId !== oracleAvailabilityRequest) {
        resolve(false);
        return;
      }

      if (success) {
        unavailableOracleTimes = new Set(Array.isArray(payload.bookedTimes) ? payload.bookedTimes : []);
      }
      renderDivinationTimeSlots();
      updateDivinationAddon();
      resolve(success);
    }

    window[callbackName] = (payload) => finish(Boolean(payload?.ok), payload);
    script.onerror = () => finish(false);
    script.src = `${RESERVATION_ENDPOINT}?action=oracleAvailability&date=${encodeURIComponent(dateValue)}&callback=${encodeURIComponent(callbackName)}&_=${Date.now()}`;
    document.head.append(script);
  });
}

function isWednesday(dateValue) {
  if (!dateValue) {
    return false;
  }

  const date = new Date(`${dateValue}T12:00:00`);
  return !Number.isNaN(date.getTime()) && date.getDay() === 3;
}

function getTodayDateValue() {
  return getBergenNowParts().date;
}

function validateReservationDate(report = false) {
  if (!reservationDate) return true;

  reservationDate.min = getTodayDateValue();
  reservationDate.max = getMaximumDateValue();
  reservationDate.setCustomValidity("");
  const value = reservationDate.value;
  if (!value) return true;

  let errorKey = "";
  if (value < reservationDate.min) {
    errorKey = "reservationPastDate";
  } else if (value > reservationDate.max) {
    errorKey = "reservationTooFarDate";
  } else {
    const selectedDate = new Date(`${value}T12:00:00`);
    const weekday = selectedDate.getDay();
    if (weekday === 0 || weekday === 1 || weekday === 2) errorKey = "reservationClosedDays";
  }

  if (!errorKey) {
    setReservationStatus("");
    return true;
  }
  reservationDate.setCustomValidity(reservationText(errorKey));
  setReservationStatus(errorKey);
  if (report) reservationDate.reportValidity();
  return false;
}

function refreshBookingTimeOptions() {
  if (!bookingTime) return;
  const selectedValue = bookingTime.value;
  populateTimeSelect(
    bookingTime,
    selectedValue,
    getLeadTimeUnavailableTimes(reservationDate?.value, 15),
    15,
    true
  );
}

function getDivinationTimeInputs() {
  return [...(divinationTimeSlots?.querySelectorAll("[data-oracle-time]") || [])];
}

function refreshDivinationTimeOptions() {
  const inputs = getDivinationTimeInputs();
  const selectedTimes = [];
  const usedTimes = new Set();

  inputs.forEach((input) => {
    input.setCustomValidity("");
    const time = input.value;
    if (time && !usedTimes.has(time) && !unavailableOracleTimes.has(time)) {
      selectedTimes.push(time);
      usedTimes.add(time);
    } else {
      selectedTimes.push("");
    }
  });

  inputs.forEach((input, index) => {
    const blockedTimes = new Set([
      ...unavailableOracleTimes,
      ...getLeadTimeUnavailableTimes(reservationDate?.value, 30),
    ]);
    selectedTimes.forEach((time, otherIndex) => {
      if (time && otherIndex !== index) blockedTimes.add(time);
    });
    populateTimeSelect(input, selectedTimes[index], blockedTimes, 30, true);
  });
}

function getDivinationPeople() {
  return [...(divinationTimeSlots?.querySelectorAll("[data-oracle-person]") || [])].map((card) => ({
    firstName: card.querySelector("[data-oracle-first-name]")?.value.trim() || "",
    lastName: card.querySelector("[data-oracle-last-name]")?.value.trim() || "",
    time: card.querySelector("[data-oracle-time]")?.value || "",
    note: card.querySelector("[data-oracle-note]")?.value.trim() || "",
  }));
}

function updateDivinationParticipantOptions() {
  if (!divinationParticipants) {
    return;
  }

  const previousCount = Number(divinationParticipants.value) || 1;
  const tableGuestCount = guestsSelect?.value === "group" ? 1 : Math.max(1, Number(guestsSelect?.value) || 1);
  const fragment = document.createDocumentFragment();

  for (let count = 1; count <= tableGuestCount; count += 1) {
    const option = document.createElement("option");
    option.value = String(count);
    option.textContent = String(count);
    fragment.append(option);
  }

  divinationParticipants.replaceChildren(fragment);
  divinationParticipants.value = String(Math.min(previousCount, tableGuestCount));
}

function renderDivinationTimeSlots() {
  if (!divinationTimeSlots) {
    return;
  }

  const previousPeople = getDivinationPeople();
  const count = Math.max(1, Number(divinationParticipants?.value) || 1);
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < count; index += 1) {
    const person = previousPeople[index] || { firstName: "", lastName: "", time: "", note: "" };
    const card = document.createElement("div");
    const heading = document.createElement("h3");
    const firstNameLabel = document.createElement("label");
    const firstNameText = document.createElement("span");
    const firstNameInput = document.createElement("input");
    const lastNameLabel = document.createElement("label");
    const lastNameText = document.createElement("span");
    const lastNameInput = document.createElement("input");
    const timeLabel = document.createElement("label");
    const timeText = document.createElement("span");
    const timeInput = document.createElement("select");
    const noteLabel = document.createElement("label");
    const noteText = document.createElement("span");
    const guidance = document.createElement("small");
    const noteInput = document.createElement("textarea");

    card.className = "divination-person-card";
    card.dataset.oraclePerson = "";
    heading.textContent = `${reservationText("oraclePerson")} ${index + 1}`;
    firstNameText.textContent = reservationText("oracleFirstName");
    firstNameInput.type = "text";
    firstNameInput.name = `oracleFirstName${index + 1}`;
    firstNameInput.autocomplete = "given-name";
    firstNameInput.value = person.firstName;
    firstNameInput.dataset.oracleFirstName = "";
    lastNameText.textContent = reservationText("oracleLastName");
    lastNameInput.type = "text";
    lastNameInput.name = `oracleLastName${index + 1}`;
    lastNameInput.autocomplete = "family-name";
    lastNameInput.value = person.lastName;
    lastNameInput.dataset.oracleLastName = "";
    timeText.textContent = reservationText("oraclePersonSlot");
    timeInput.name = `oracleTime${index + 1}`;
    timeInput.dataset.oracleTime = "";
    populateTimeSelect(timeInput, person.time, unavailableOracleTimes, 30, true);
    noteLabel.className = "divination-notes";
    noteText.textContent = reservationText("divinationNotes");
    guidance.textContent = reservationText("divinationNotesGuidance");
    noteInput.name = `oracleNote${index + 1}`;
    noteInput.rows = 2;
    noteInput.placeholder = reservationText("divinationNotesPlaceholder");
    noteInput.value = person.note;
    noteInput.dataset.oracleNote = "";

    firstNameLabel.append(firstNameText, firstNameInput);
    lastNameLabel.append(lastNameText, lastNameInput);
    timeLabel.append(timeText, timeInput);
    noteLabel.append(noteText, guidance, noteInput);
    card.append(heading, firstNameLabel, lastNameLabel, timeLabel, noteLabel);
    fragment.append(card);
  }

  divinationTimeSlots.replaceChildren(fragment);
  refreshDivinationTimeOptions();
}

function validateDistinctDivinationTimes(report = false) {
  const inputs = getDivinationTimeInputs();
  const usedTimes = new Set();
  let duplicateInput = null;

  inputs.forEach((input) => input.setCustomValidity(""));
  for (const input of inputs) {
    if (input.value && usedTimes.has(input.value)) {
      duplicateInput = input;
      break;
    }
    if (input.value) {
      usedTimes.add(input.value);
    }
  }

  if (duplicateInput) {
    duplicateInput.setCustomValidity(reservationText("oracleUniqueTimes"));
    if (report) {
      duplicateInput.reportValidity();
    }
    return false;
  }

  return true;
}

function updateDivinationAddon() {
  const isAvailable = isWednesday(reservationDate?.value);

  if (divinationOffer) {
    divinationOffer.hidden = !isAvailable;
  }

  if (!isAvailable && divinationAddonToggle) {
    divinationAddonToggle.checked = false;
  }

  const isRequested = isAvailable && Boolean(divinationAddonToggle?.checked);
  if (divinationAddonFields) {
    divinationAddonFields.hidden = !isRequested;
  }
  divinationTimeSlots?.querySelectorAll("[data-oracle-first-name], [data-oracle-last-name], [data-oracle-time]").forEach((input) => {
    input.required = isRequested;
  });
}

reservationDate?.addEventListener("change", () => {
  unavailableOracleTimes = new Set();
  validateReservationDate(true);
  refreshBookingTimeOptions();
  updateDivinationAddon();
  fetchOracleAvailability(reservationDate.value);
});
divinationAddonToggle?.addEventListener("change", updateDivinationAddon);
divinationParticipants?.addEventListener("change", () => {
  renderDivinationTimeSlots();
  updateDivinationAddon();
});
divinationTimeSlots?.addEventListener("change", (event) => {
  if (event.target.matches("[data-oracle-time]")) {
    refreshDivinationTimeOptions();
    validateDistinctDivinationTimes(false);
  }
});

function showReservationThanks() {
  if (!reservationThanks) {
    setReservationStatus("reservationSaved");
    return;
  }

  document.body.classList.add("reservation-confirmed");
  reservationThanks.hidden = false;
  reservationThanks.focus?.();
}

function setReservationStatus(key) {
  if (!reservationStatus) {
    return;
  }

  reservationStatus.textContent = reservationText(key);
}

function updateGroupBookingNotice() {
  const isGroupBooking = guestsSelect?.value === "group";
  const submitButton = reservationForm?.querySelector("button[type='submit']");

  if (groupBookingNotice) {
    groupBookingNotice.hidden = !isGroupBooking;
  }

  if (submitButton) {
    submitButton.disabled = Boolean(isGroupBooking);
  }

  if (isGroupBooking) {
    setReservationStatus("groupBookingStatus");
  } else {
    setReservationStatus("");
  }
}

guestsSelect?.addEventListener("change", () => {
  updateGroupBookingNotice();
  updateDivinationParticipantOptions();
  renderDivinationTimeSlots();
  updateDivinationAddon();
});
window.addEventListener("maelstrom:languagechange", () => {
  if (guestsSelect?.value === "group") {
    setReservationStatus("groupBookingStatus");
  }
  refreshBookingTimeOptions();
  renderDivinationTimeSlots();
  updateDivinationAddon();
  validateReservationDate(false);
});
updateGroupBookingNotice();
if (reservationDate) {
  reservationDate.min = getTodayDateValue();
  reservationDate.max = getMaximumDateValue();
}
refreshBookingTimeOptions();
updateDivinationParticipantOptions();
renderDivinationTimeSlots();
updateDivinationAddon();
if (reservationNewsletterOptIn && hasNewsletterSubscriptionOnDevice()) {
  reservationNewsletterOptIn.hidden = true;
}

reservationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (reservationSubmitting) return;

  if (!validateReservationDate(true)) return;

  const noticeBlockedTimes = getLeadTimeUnavailableTimes(reservationDate?.value, 15);
  if (bookingTime?.value && noticeBlockedTimes.has(bookingTime.value)) {
    bookingTime.setCustomValidity(reservationText("reservationTooSoon"));
    bookingTime.reportValidity();
    setReservationStatus("reservationTooSoon");
    refreshBookingTimeOptions();
    return;
  }
  bookingTime?.setCustomValidity("");

  if (guestsSelect?.value === "group") {
    updateGroupBookingNotice();
    groupBookingNotice?.querySelector("a")?.focus();
    return;
  }

  if (divinationAddonToggle?.checked && !validateDistinctDivinationTimes(true)) {
    return;
  }

  if (divinationAddonToggle?.checked) {
    const requestedTimes = getDivinationPeople().map((person) => person.time);
    const availabilityLoaded = await fetchOracleAvailability(reservationDate?.value);
    const unavailableTime = requestedTimes.find((time) => unavailableOracleTimes.has(time));
    if (!availabilityLoaded) {
      setReservationStatus("oracleAvailabilityError");
    }
    if (unavailableTime) {
      const firstTimeInput = getDivinationTimeInputs()[0];
      firstTimeInput?.setCustomValidity(reservationText("oracleSlotTaken"));
      firstTimeInput?.reportValidity();
      setReservationStatus("oracleSlotTaken");
      return;
    }
  }

  if (!RESERVATION_ENDPOINT) {
    setReservationStatus("reservationPending");
    return;
  }

  const submitButton = reservationForm.querySelector("button[type='submit']");
  if (reservationSubmitting) return;
  reservationSubmitting = true;
  submitButton?.setAttribute("disabled", "true");

  try {
    const formData = new FormData(reservationForm);
    const oracleRequested = Boolean(divinationAddonToggle?.checked) && isWednesday(reservationDate?.value);
    const tableNotes = String(formData.get("notes") || "").trim();
    const oraclePeople = getDivinationPeople();
    const oracleTimes = oraclePeople.map((person) => person.time);
    formData.set("type", "reservation");
    formData.set("oracleRequested", oracleRequested ? "yes" : "no");
    if (oracleRequested) {
      formData.set("oracleDuration", "20–30 minutes");
      formData.set("oraclePrice", "250 NOK");
      formData.set("oracleParticipants", String(oracleTimes.length));
      formData.set("oracleTimes", oracleTimes.join(", "));
      formData.set("oracleNames", oraclePeople.map((person) => `${person.firstName} ${person.lastName}`).join(", "));
      const oracleDetails = oraclePeople
        .map((person, index) => `Person ${index + 1}: ${person.firstName} ${person.lastName} — ${person.time}${person.note ? ` — short note: ${person.note}` : ""}`)
        .join("\n");
      formData.set(
        "notes",
        `${tableNotes}${tableNotes ? "\n\n" : ""}[Oracle session requested — ${oracleTimes.length} person(s) — 20–30 min each — 250 NOK per slot]\n${oracleDetails}`
      );
    }
    const newsletterRequested = Boolean(reservationNewsletterCheckbox?.checked);
    formData.set("newsletterOptIn", newsletterRequested ? "yes" : "no");
    formData.set("submittedAt", new Date().toISOString());
    formData.set("source", "Maelstrom website");
    formData.set("submissionId", await window.MaelstromReservationSubmission.reference(formData));

    await fetch(RESERVATION_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      body: formData,
    });

    if (newsletterRequested) rememberNewsletterSubscription();
    window.MaelstromReservationSubmission.clear();

    reservationForm.reset();
    updateGroupBookingNotice();
    updateDivinationParticipantOptions();
    renderDivinationTimeSlots();
    updateDivinationAddon();
    showReservationThanks();
  } catch {
    setReservationStatus("reservationError");
  } finally {
    reservationSubmitting = false;
    submitButton?.removeAttribute("disabled");
  }
});
