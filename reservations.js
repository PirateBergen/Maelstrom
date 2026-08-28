const RESERVATION_ENDPOINT = window.MAELSTROM_RESERVATION_ENDPOINT || "";

const reservationForm = document.querySelector("[data-reservation-form]");
const reservationStatus = document.querySelector("[data-reservation-status]");
const reservationThanks = document.querySelector("#reservationThanks");
const guestsSelect = document.querySelector("[data-guests-select]");
const groupBookingNotice = document.querySelector("[data-group-booking-notice]");
const divinationToggle = document.querySelector("[data-divination-toggle]");
const divinationInfo = document.querySelector("[data-divination-info]");
const divinationForm = document.querySelector("[data-divination-form]");
const divinationDate = document.querySelector("[data-divination-date]");
const divinationStatus = document.querySelector("[data-divination-status]");

function reservationText(key) {
  return window.MaelstromI18n?.t(key) || key;
}

function toggleDivinationInfo() {
  if (!divinationToggle || !divinationInfo) {
    return;
  }

  const willOpen = divinationInfo.hidden;
  divinationInfo.hidden = !willOpen;
  divinationToggle.setAttribute("aria-expanded", String(willOpen));

  if (willOpen) {
    divinationInfo.scrollIntoView({ behavior: "smooth", block: "nearest" });
  }
}

divinationToggle?.addEventListener("click", toggleDivinationInfo);

function setDivinationStatus(key) {
  if (divinationStatus) {
    divinationStatus.textContent = key ? reservationText(key) : "";
  }
}

function isWednesday(dateValue) {
  if (!dateValue) {
    return false;
  }

  const date = new Date(`${dateValue}T12:00:00`);
  return !Number.isNaN(date.getTime()) && date.getDay() === 3;
}

function validateDivinationDate(report = false) {
  if (!divinationDate) {
    return true;
  }

  const isValid = !divinationDate.value || isWednesday(divinationDate.value);
  divinationDate.setCustomValidity(isValid ? "" : reservationText("divinationWednesdayOnly"));

  if (!isValid) {
    setDivinationStatus("divinationWednesdayOnly");
    if (report) {
      divinationDate.reportValidity();
    }
  } else {
    setDivinationStatus("");
  }

  return isValid;
}

if (divinationDate) {
  const today = new Date();
  const year = today.getFullYear();
  const month = String(today.getMonth() + 1).padStart(2, "0");
  const day = String(today.getDate()).padStart(2, "0");
  divinationDate.min = `${year}-${month}-${day}`;
  divinationDate.addEventListener("change", () => validateDivinationDate(true));
}

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
  validateDivinationDate(false);
});
updateGroupBookingNotice();

reservationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (guestsSelect?.value === "group") {
    updateGroupBookingNotice();
    groupBookingNotice?.querySelector("a")?.focus();
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
    formData.set("type", "reservation");
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
    showReservationThanks();
  } catch {
    setReservationStatus("reservationError");
  } finally {
    submitButton?.removeAttribute("disabled");
  }
});

divinationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!validateDivinationDate(true) || !divinationForm.reportValidity()) {
    return;
  }

  if (!RESERVATION_ENDPOINT) {
    setDivinationStatus("divinationPending");
    return;
  }

  const submitButton = divinationForm.querySelector("button[type='submit']");
  submitButton?.setAttribute("disabled", "true");

  try {
    const formData = new FormData(divinationForm);
    const guestNote = String(formData.get("notes") || "").trim();
    formData.set("type", "divination");
    formData.set("guests", "1");
    formData.set("duration", "20–30 minutes");
    formData.set("price", "250 NOK");
    formData.set("notes", `[Oracle session — 20–30 min — 250 NOK]${guestNote ? `\n${guestNote}` : ""}`);
    formData.set("submittedAt", new Date().toISOString());
    formData.set("source", "Maelstrom website — oracle session");

    await fetch(RESERVATION_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      body: formData,
    });

    divinationForm.reset();
    setDivinationStatus("");
    showReservationThanks();
  } catch {
    setDivinationStatus("reservationError");
  } finally {
    submitButton?.removeAttribute("disabled");
  }
});
