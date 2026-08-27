const RESERVATION_ENDPOINT = window.MAELSTROM_RESERVATION_ENDPOINT || "";

const reservationForm = document.querySelector("[data-reservation-form]");
const reservationStatus = document.querySelector("[data-reservation-status]");

function reservationText(key) {
  return window.MaelstromI18n?.t(key) || key;
}

function setReservationStatus(key) {
  if (!reservationStatus) {
    return;
  }

  reservationStatus.textContent = reservationText(key);
}

reservationForm?.addEventListener("submit", async (event) => {
  event.preventDefault();

  if (!RESERVATION_ENDPOINT) {
    setReservationStatus("reservationPending");
    return;
  }

  const submitButton = reservationForm.querySelector("button[type='submit']");
  submitButton?.setAttribute("disabled", "true");

  try {
    const formData = new FormData(reservationForm);
    formData.set("submittedAt", new Date().toISOString());

    await fetch(RESERVATION_ENDPOINT, {
      method: "POST",
      mode: "no-cors",
      body: formData,
    });

    reservationForm.reset();
    setReservationStatus("reservationSaved");
  } catch {
    setReservationStatus("reservationError");
  } finally {
    submitButton?.removeAttribute("disabled");
  }
});
