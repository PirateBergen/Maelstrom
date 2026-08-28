const RESERVATION_ENDPOINT = window.MAELSTROM_RESERVATION_ENDPOINT || "";

const reservationForm = document.querySelector("[data-reservation-form]");
const reservationStatus = document.querySelector("[data-reservation-status]");
const reservationThanks = document.querySelector("#reservationThanks");
const guestsSelect = document.querySelector("[data-guests-select]");
const groupBookingNotice = document.querySelector("[data-group-booking-notice]");
const divinationToggle = document.querySelector("[data-divination-toggle]");
const divinationInfo = document.querySelector("[data-divination-info]");

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
