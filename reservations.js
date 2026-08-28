const RESERVATION_ENDPOINT = window.MAELSTROM_RESERVATION_ENDPOINT || "";

const reservationForm = document.querySelector("[data-reservation-form]");
const reservationStatus = document.querySelector("[data-reservation-status]");
const reservationThanks = document.querySelector("#reservationThanks");
const guestsSelect = document.querySelector("[data-guests-select]");
const groupBookingNotice = document.querySelector("[data-group-booking-notice]");
const reservationDate = document.querySelector("[data-reservation-date]");
const divinationOffer = document.querySelector("[data-divination-offer]");
const divinationAddonToggle = document.querySelector("[data-divination-addon-toggle]");
const divinationAddonFields = document.querySelector("[data-divination-addon-fields]");
const divinationParticipants = document.querySelector("[data-divination-participants]");
const divinationTimeSlots = document.querySelector("[data-divination-time-slots]");

function reservationText(key) {
  return window.MaelstromI18n?.t(key) || key;
}

function isWednesday(dateValue) {
  if (!dateValue) {
    return false;
  }

  const date = new Date(`${dateValue}T12:00:00`);
  return !Number.isNaN(date.getTime()) && date.getDay() === 3;
}

function getDivinationTimeInputs() {
  return [...(divinationTimeSlots?.querySelectorAll("[data-oracle-time]") || [])];
}

function getDivinationPeople() {
  return [...(divinationTimeSlots?.querySelectorAll("[data-oracle-person]") || [])].map((card) => ({
    name: card.querySelector("[data-oracle-name]")?.value.trim() || "",
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
    const person = previousPeople[index] || { name: "", time: "", note: "" };
    const card = document.createElement("div");
    const heading = document.createElement("h3");
    const nameLabel = document.createElement("label");
    const nameText = document.createElement("span");
    const nameInput = document.createElement("input");
    const timeLabel = document.createElement("label");
    const timeText = document.createElement("span");
    const timeInput = document.createElement("input");
    const noteLabel = document.createElement("label");
    const noteText = document.createElement("span");
    const guidance = document.createElement("small");
    const noteInput = document.createElement("textarea");

    card.className = "divination-person-card";
    card.dataset.oraclePerson = "";
    heading.textContent = `${reservationText("oraclePerson")} ${index + 1}`;
    nameText.textContent = reservationText("oracleFullName");
    nameInput.type = "text";
    nameInput.name = `oracleName${index + 1}`;
    nameInput.autocomplete = "name";
    nameInput.value = person.name;
    nameInput.dataset.oracleName = "";
    timeText.textContent = reservationText("oraclePersonSlot");
    timeInput.type = "time";
    timeInput.name = `oracleTime${index + 1}`;
    timeInput.value = person.time;
    timeInput.dataset.oracleTime = "";
    noteLabel.className = "divination-notes";
    noteText.textContent = reservationText("divinationNotes");
    guidance.textContent = reservationText("divinationNotesGuidance");
    noteInput.name = `oracleNote${index + 1}`;
    noteInput.rows = 2;
    noteInput.placeholder = reservationText("divinationNotesPlaceholder");
    noteInput.value = person.note;
    noteInput.dataset.oracleNote = "";

    nameLabel.append(nameText, nameInput);
    timeLabel.append(timeText, timeInput);
    noteLabel.append(noteText, guidance, noteInput);
    card.append(heading, nameLabel, timeLabel, noteLabel);
    fragment.append(card);
  }

  divinationTimeSlots.replaceChildren(fragment);
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
  divinationTimeSlots?.querySelectorAll("[data-oracle-name], [data-oracle-time]").forEach((input) => {
    input.required = isRequested;
  });
}

reservationDate?.addEventListener("change", updateDivinationAddon);
divinationAddonToggle?.addEventListener("change", updateDivinationAddon);
divinationParticipants?.addEventListener("change", () => {
  renderDivinationTimeSlots();
  updateDivinationAddon();
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
  renderDivinationTimeSlots();
  updateDivinationAddon();
});
updateGroupBookingNotice();
updateDivinationParticipantOptions();
renderDivinationTimeSlots();
updateDivinationAddon();

reservationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (guestsSelect?.value === "group") {
    updateGroupBookingNotice();
    groupBookingNotice?.querySelector("a")?.focus();
    return;
  }

  if (divinationAddonToggle?.checked && !validateDistinctDivinationTimes(true)) {
    return;
  }

  if (!RESERVATION_ENDPOINT) {
    setReservationStatus("reservationPending");
    return;
  }

  const submitButton = reservationForm.querySelector("button[type='submit']");
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
      formData.set("oracleNames", oraclePeople.map((person) => person.name).join(", "));
      const oracleDetails = oraclePeople
        .map((person, index) => `Person ${index + 1}: ${person.name} — ${person.time}${person.note ? ` — short note: ${person.note}` : ""}`)
        .join("\n");
      formData.set(
        "notes",
        `${tableNotes}${tableNotes ? "\n\n" : ""}[Oracle session requested — ${oracleTimes.length} person(s) — 20–30 min each — 250 NOK per slot]\n${oracleDetails}`
      );
    }
    formData.set(
      "newsletterOptIn",
      reservationForm.querySelector('input[name="newsletterOptIn"]')?.checked ? "yes" : "no"
    );
    formData.set("submittedAt", new Date().toISOString());
    formData.set("source", "Maelstrom website");

    await fetch(RESERVATION_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      body: formData,
    });

    reservationForm.reset();
    updateGroupBookingNotice();
    updateDivinationParticipantOptions();
    renderDivinationTimeSlots();
    updateDivinationAddon();
    showReservationThanks();
  } catch {
    setReservationStatus("reservationError");
  } finally {
    submitButton?.removeAttribute("disabled");
  }
});
