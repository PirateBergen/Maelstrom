function privacyT(key) {
  return window.MaelstromI18n?.t(key) || key;
}

let privacyDialog = null;

function buildPrivacyDialog() {
  if (privacyDialog) return privacyDialog;
  privacyDialog = document.createElement("dialog");
  privacyDialog.className = "privacy-dialog";
  privacyDialog.setAttribute("aria-labelledby", "privacyDialogTitle");
  privacyDialog.innerHTML = `
    <article class="privacy-dialog-card">
      <button class="privacy-dialog-close" type="button" data-privacy-close aria-label="${privacyT("privacyClose")}">×</button>
      <p class="site-kicker">Maelstrom Bergen</p>
      <h2 id="privacyDialogTitle" data-privacy-key="privacyTitle">${privacyT("privacyTitle")}</h2>
      <p class="privacy-updated" data-privacy-key="privacyUpdated">${privacyT("privacyUpdated")}</p>
      <section><h3 data-privacy-key="privacyControllerTitle">${privacyT("privacyControllerTitle")}</h3><p data-privacy-key="privacyControllerText">${privacyT("privacyControllerText")}</p></section>
      <section><h3 data-privacy-key="privacyCollectedTitle">${privacyT("privacyCollectedTitle")}</h3><p data-privacy-key="privacyReservationsText">${privacyT("privacyReservationsText")}</p><p data-privacy-key="privacyContactText">${privacyT("privacyContactText")}</p><p data-privacy-key="privacyNewsletterText">${privacyT("privacyNewsletterText")}</p><p data-privacy-key="privacyPhotosText">${privacyT("privacyPhotosText")}</p></section>
      <section><h3 data-privacy-key="privacyStorageTitle">${privacyT("privacyStorageTitle")}</h3><p data-privacy-key="privacyStorageText">${privacyT("privacyStorageText")}</p><p data-privacy-key="privacyProvidersText">${privacyT("privacyProvidersText")}</p></section>
      <section><h3 data-privacy-key="privacyDeviceTitle">${privacyT("privacyDeviceTitle")}</h3><p data-privacy-key="privacyDeviceText">${privacyT("privacyDeviceText")}</p></section>
      <section><h3 data-privacy-key="privacyRightsTitle">${privacyT("privacyRightsTitle")}</h3><p data-privacy-key="privacyRightsText">${privacyT("privacyRightsText")}</p></section>
      <a class="privacy-dialog-email" href="mailto:contact@maelstrombergen.com" data-privacy-key="privacyContactButton">${privacyT("privacyContactButton")}</a>
    </article>`;
  privacyDialog.querySelector("[data-privacy-close]").addEventListener("click", () => privacyDialog.close());
  privacyDialog.addEventListener("click", (event) => {
    if (event.target === privacyDialog) privacyDialog.close();
  });
  document.body.appendChild(privacyDialog);
  return privacyDialog;
}

function updatePrivacyDialog() {
  if (!privacyDialog) return;
  privacyDialog.querySelectorAll("[data-privacy-key]").forEach((element) => {
    element.textContent = privacyT(element.dataset.privacyKey);
  });
  privacyDialog.querySelector("[data-privacy-close]").setAttribute("aria-label", privacyT("privacyClose"));
}

document.addEventListener("click", (event) => {
  const trigger = event.target.closest("[data-privacy-open]");
  if (!trigger) return;
  event.preventDefault();
  buildPrivacyDialog().showModal();
});

window.addEventListener("maelstrom:languagechange", updatePrivacyDialog);
