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
  return [...(divinationTimeSlots?.querySelectorAll("input[type='time']") || [])];
}

function renderDivinationTimeSlots() {
  if (!divinationTimeSlots) {
    return;
  }

  const previousValues = getDivinationTimeInputs().map((input) => input.value);
  const count = Math.min(6, Math.max(1, Number(divinationParticipants?.value) || 1));
  const fragment = document.createDocumentFragment();

  for (let index = 0; index < count; index += 1) {
    const label = document.createElement("label");
    const text = document.createElement("span");
    const input = document.createElement("input");
    text.textContent = `${reservationText("oraclePersonSlot")} ${index + 1}`;
    input.type = "time";
    input.name = `oracleTime${index + 1}`;
    input.value = previousValues[index] || "";
    label.append(text, input);
    fragment.append(label);
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
  getDivinationTimeInputs().forEach((input) => {
    input.required = isRequested;
    if (!isRequested) input.value = "";
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

guestsSelect?.addEventListener("change", updateGroupBookingNotice);
window.addEventListener("maelstrom:languagechange", () => {
  if (guestsSelect?.value === "group") {
    setReservationStatus("groupBookingStatus");
  }
  renderDivinationTimeSlots();
  updateDivinationAddon();
});
updateGroupBookingNotice();
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
    const oracleNotes = String(formData.get("oracleNotes") || "").trim();
    const oracleTimes = getDivinationTimeInputs().map((input) => input.value);
    formData.set("type", "reservation");
    formData.set("oracleRequested", oracleRequested ? "yes" : "no");
    if (oracleRequested) {
      formData.set("oracleDuration", "20–30 minutes");
      formData.set("oraclePrice", "250 NOK");
      formData.set("oracleParticipants", String(oracleTimes.length));
      formData.set("oracleTimes", oracleTimes.join(", "));
      formData.set(
        "notes",
        `${tableNotes}${tableNotes ? "\n\n" : ""}[Oracle session requested — ${oracleTimes.length} person(s) — slots: ${oracleTimes.join(", ")} — 20–30 min each — 250 NOK per slot]${oracleNotes ? `\nOracle note: ${oracleNotes}` : ""}`
      );
    }
    formData.delete("oracleNotes");
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
    renderDivinationTimeSlots();
    updateDivinationAddon();
    showReservationThanks();
  } catch {
    setReservationStatus("reservationError");
  } finally {
    submitButton?.removeAttribute("disabled");
  }
});
