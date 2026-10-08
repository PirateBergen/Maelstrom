(function setupEventAnnouncement() {
  const config = window.MAELSTROM_EVENT_ANNOUNCEMENT || {};
  const preview = new URLSearchParams(window.location.search).get("event-preview") === "1";
  const now = Date.now();
  const startsAt = config.startsAt ? Date.parse(config.startsAt) : null;
  const endsAt = config.endsAt ? Date.parse(config.endsAt) : null;
  const isScheduled = (!startsAt || now >= startsAt) && (!endsAt || now <= endsAt);
  const storageKey = `maelstrom-event-dismissed-${config.id || "announcement"}`;

  if ((!config.enabled && !preview) || !isScheduled) return;

  try {
    if (!preview && sessionStorage.getItem(storageKey) === "yes") return;
  } catch {
    // The announcement still works when browser storage is unavailable.
  }

  const dialog = document.createElement("dialog");
  dialog.className = "event-announcement";
  dialog.setAttribute("aria-labelledby", "eventAnnouncementTitle");
  dialog.innerHTML = `
    <article class="event-announcement-card">
      <button class="event-announcement-close" type="button" data-event-close aria-label="Close event announcement"></button>
      <div class="event-announcement-glow" aria-hidden="true"></div>
      <img class="event-announcement-logo" src="assets/maelstrom-logo.webp" alt="Maelstrom" draggable="false" />
      <p class="event-announcement-eyebrow" data-event-eyebrow></p>
      <h2 id="eventAnnouncementTitle" data-event-title></h2>
      <p class="event-announcement-message" data-event-message></p>
      <img class="event-announcement-image" data-event-image alt="" loading="eager" decoding="async" hidden />
      <a class="event-announcement-link" data-event-link hidden></a>
    </article>
  `;

  const localizedContent = () => {
    const language = window.MaelstromI18n?.language || "no";
    return config.content?.[language] || config.content?.en || {};
  };

  function render() {
    const content = localizedContent();
    dialog.querySelector("[data-event-eyebrow]").textContent = content.eyebrow || "";
    dialog.querySelector("[data-event-title]").textContent = content.title || "";
    dialog.querySelector("[data-event-message]").textContent = content.message || "";
    dialog.querySelector("[data-event-close]").setAttribute("aria-label", content.closeLabel || "Close event announcement");

    const image = dialog.querySelector("[data-event-image]");
    image.hidden = !config.image;
    if (config.image) image.src = config.image;

    const link = dialog.querySelector("[data-event-link]");
    link.hidden = !config.link;
    if (config.link) {
      link.href = config.link;
      link.textContent = content.linkLabel || config.link;
    }
  }

  function closeAnnouncement() {
    dialog.close();
  }

  function rememberDismissal() {
    try {
      if (!preview) sessionStorage.setItem(storageKey, "yes");
    } catch {
      // Dismissal still works for the current page.
    }
  }

  dialog.querySelector("[data-event-close]").addEventListener("click", closeAnnouncement);
  dialog.addEventListener("close", rememberDismissal);
  dialog.addEventListener("click", (event) => {
    if (event.target === dialog) closeAnnouncement();
  });
  window.addEventListener("maelstrom:languagechange", render);
  document.body.appendChild(dialog);
  render();

  window.setTimeout(() => {
    const site = document.querySelector(".full-site");
    if (site?.hidden && !preview) return;
    if (typeof dialog.showModal === "function") dialog.showModal();
    else dialog.setAttribute("open", "");
  }, 700);
})();
