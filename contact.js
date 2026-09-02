const CONTACT_ENDPOINT = window.MAELSTROM_RESERVATION_ENDPOINT || "";
const contactDialog = document.querySelector("[data-contact-dialog]");
const contactForm = document.querySelector("[data-contact-form]");
const contactStatus = document.querySelector("[data-contact-status]");
const contactSubmit = document.querySelector("[data-contact-submit]");
const contactPrivateNote = document.querySelector("[data-contact-private-note]");

function contactText(key) {
  return window.MaelstromI18n?.t(key) || key;
}

function openContactDialog(requestType = "") {
  if (!contactDialog) return;
  const subject = contactForm?.elements.namedItem("subject");
  if (requestType === "group" && subject && !subject.value) {
    subject.value = contactText("contactFormGroupSubject");
  }
  if (requestType === "private" && subject && !subject.value) {
    subject.value = contactText("contactFormPrivateSubject");
  }
  if (contactPrivateNote) contactPrivateNote.hidden = requestType !== "private";
  contactDialog.showModal();
  contactForm?.elements.namedItem("name")?.focus();
}

function closeContactDialog() {
  contactDialog?.close();
}

document.querySelectorAll("[data-contact-open]").forEach((button) => {
  button.addEventListener("click", () => openContactDialog());
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
const contactRequestType = contactParams.get("contact");
if (contactRequestType === "group" || contactRequestType === "private") {
  window.addEventListener("DOMContentLoaded", () => openContactDialog(contactRequestType), { once: true });
}
