const CONTACT_ENDPOINT = window.MAELSTROM_RESERVATION_ENDPOINT || "";
const contactDialog = document.querySelector("[data-contact-dialog]");
const contactForm = document.querySelector("[data-contact-form]");
const contactStatus = document.querySelector("[data-contact-status]");
const contactSubmit = document.querySelector("[data-contact-submit]");

function contactText(key) {
  return window.MaelstromI18n?.t(key) || key;
}

function openContactDialog(groupRequest = false) {
  if (!contactDialog) return;
  if (groupRequest) {
    const subject = contactForm?.elements.namedItem("subject");
    if (subject && !subject.value) subject.value = contactText("contactFormGroupSubject");
  }
  contactDialog.showModal();
  contactForm?.elements.namedItem("name")?.focus();
}

function closeContactDialog() {
  contactDialog?.close();
}

document.querySelectorAll("[data-contact-open]").forEach((button) => {
  button.addEventListener("click", () => openContactDialog(false));
});
document.querySelectorAll("[data-contact-close]").forEach((button) => {
  button.addEventListener("click", closeContactDialog);
});
contactDialog?.addEventListener("click", (event) => {
  if (event.target === contactDialog) closeContactDialog();
});

contactForm?.addEventListener("submit", async (event) => {
  event.preventDefault();
  if (!CONTACT_ENDPOINT) {
    contactStatus.textContent = contactText("contactFormError");
    return;
  }

  contactSubmit.disabled = true;
  contactStatus.textContent = contactText("contactFormSending");

  try {
    const formData = new FormData(contactForm);
    formData.set("type", "contact");
    formData.set("submittedAt", new Date().toISOString());
    formData.set("source", "Maelstrom website contact form");
    await fetch(CONTACT_ENDPOINT, { method: "POST", mode: "no-cors", body: formData });
    contactForm.reset();
    contactStatus.textContent = contactText("contactFormSaved");
  } catch {
    contactStatus.textContent = contactText("contactFormError");
  } finally {
    contactSubmit.disabled = false;
  }
});

window.addEventListener("maelstrom:languagechange", () => {
  if (contactStatus) contactStatus.textContent = "";
});

const contactParams = new URLSearchParams(window.location.search);
if (contactParams.get("contact") === "group") {
  window.addEventListener("DOMContentLoaded", () => openContactDialog(true), { once: true });
}
