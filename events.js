function getBergenCalendarDate() {
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Europe/Oslo",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date());
}

function updatePastCalendarEvents() {
  const today = getBergenCalendarDate();

  document.querySelectorAll(".calendar-event").forEach((eventItem) => {
    const date = eventItem.querySelector("time")?.dateTime || "";
    if (!date || date >= today) return;

    eventItem.classList.add("calendar-event-past");
    eventItem.querySelectorAll("a").forEach((link) => link.remove());

    const details = eventItem.querySelector(":scope > div");
    if (!details) return;
    let state = details.querySelector(".calendar-state");
    if (!state) {
      state = document.createElement("span");
      state.className = "calendar-state";
      details.prepend(state);
    }
    state.dataset.i18n = "eventPastStatus";
    state.textContent = window.MaelstromI18n?.t("eventPastStatus") || "Ended";
  });
}

document.addEventListener("DOMContentLoaded", updatePastCalendarEvents);
window.addEventListener("maelstrom:languagechange", updatePastCalendarEvents);

function setupMasterclassDialog() {
  const dialog = document.querySelector("[data-masterclass-dialog]");
  if (!dialog) return;
  const form = dialog.querySelector("[data-masterclass-form]");
  const availability = dialog.querySelector("[data-masterclass-availability]");
  const participants = dialog.querySelector("[data-masterclass-participants]");
  const status = dialog.querySelector("[data-masterclass-status]");
  const submit = dialog.querySelector("[data-masterclass-submit]");
  const endpoint = window.MAELSTROM_RESERVATION_ENDPOINT || "";
  let remaining = 20;

  const text = (key) => window.MaelstromI18n?.t(key) || key;
  const renderAvailability = () => {
    if (!availability) return;
    availability.textContent = remaining > 0
      ? text("eventPlacesRemaining").replace("{count}", String(remaining))
      : text("eventFullyBooked");
    if (submit) submit.disabled = remaining < 1;
    if (participants) {
      const previous = Number(participants.value) || 1;
      participants.replaceChildren();
      for (let count = 1; count <= remaining; count += 1) {
        const option = document.createElement("option");
        option.value = String(count);
        option.textContent = String(count);
        participants.append(option);
      }
      if (remaining) participants.value = String(Math.min(previous, remaining));
    }
  };

  const loadAvailability = () => new Promise((resolve) => {
    if (!endpoint) return resolve();
    const callback = `maelstromEventAvailability_${Date.now()}_${Math.random().toString(36).slice(2)}`;
    const script = document.createElement("script");
    const cleanup = () => { delete window[callback]; script.remove(); };
    window[callback] = (payload) => {
      if (payload?.ok && Number.isFinite(Number(payload.remaining))) remaining = Math.max(0, Number(payload.remaining));
      cleanup();
      renderAvailability();
      resolve();
    };
    script.onerror = () => { cleanup(); renderAvailability(); resolve(); };
    script.src = `${endpoint}?action=eventAvailability&eventId=monkey-shoulder-2026&callback=${encodeURIComponent(callback)}`;
    document.head.append(script);
  });

  document.querySelectorAll("[data-masterclass-details]").forEach((button) => {
    button.addEventListener("click", () => { dialog.showModal(); loadAvailability(); });
  });
  document.querySelectorAll("[data-masterclass-book]").forEach((button) => {
    button.addEventListener("click", () => {
      dialog.showModal();
      loadAvailability().then(() => form?.querySelector("input")?.focus());
    });
  });
  dialog.querySelector("[data-masterclass-close]")?.addEventListener("click", () => dialog.close());
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) dialog.close();
  });

  form?.addEventListener("submit", async (event) => {
    event.preventDefault();
    if (!endpoint || !submit || !status) return;
    await loadAvailability();
    const requested = Number(participants?.value) || 0;
    if (!requested || requested > remaining) {
      status.textContent = text("eventNotEnoughPlaces");
      return;
    }
    submit.disabled = true;
    status.textContent = text("eventRegistrationSending");
    const data = new FormData(form);
    const bytes = crypto.getRandomValues(new Uint8Array(16));
    data.set("submissionId", [...bytes].map((byte) => byte.toString(16).padStart(2, "0")).join(""));
    try {
      await fetch(endpoint, { method: "POST", mode: "no-cors", body: data });
      form.reset();
      remaining = Math.max(0, remaining - requested);
      renderAvailability();
      status.textContent = text("eventRegistrationSaved");
    } catch {
      status.textContent = text("eventRegistrationError");
      submit.disabled = false;
    }
  });

  window.addEventListener("maelstrom:languagechange", renderAvailability);
  renderAvailability();
}

document.addEventListener("DOMContentLoaded", setupMasterclassDialog);
