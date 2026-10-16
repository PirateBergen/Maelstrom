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
