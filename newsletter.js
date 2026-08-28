const NEWSLETTER_ENDPOINT =
  window.MAELSTROM_NEWSLETTER_ENDPOINT || window.MAELSTROM_RESERVATION_ENDPOINT || "";
const NEWSLETTER_DISMISSED_KEY = "maelstrom-newsletter-dismissed-v1";
const NEWSLETTER_SUBSCRIBED_KEY = "maelstrom-newsletter-subscribed-v1";

let newsletterPanel = null;
let newsletterShown = false;

function newsletterT(key) {
  return window.MaelstromI18n?.t(key) || key;
}

function newsletterStorageGet(key) {
  try {
    return localStorage.getItem(key);
  } catch {
    return null;
  }
}

function newsletterStorageSet(key, value) {
  try {
    localStorage.setItem(key, value);
  } catch {
    // The popup still works if storage is unavailable.
  }
}

function updateNewsletterText() {
  if (!newsletterPanel) {
    return;
  }

  newsletterPanel.querySelector("[data-newsletter-title]").textContent = newsletterT("newsletterTitle");
  newsletterPanel.querySelector("[data-newsletter-copy]").textContent = newsletterT("newsletterCopy");
  newsletterPanel.querySelector("[data-newsletter-email]").setAttribute("placeholder", newsletterT("newsletterPlaceholder"));
  newsletterPanel.querySelector("[data-newsletter-submit]").textContent = newsletterT("newsletterSubmit");
  newsletterPanel.querySelector("[data-newsletter-close]").setAttribute("aria-label", newsletterT("newsletterClose"));
  newsletterPanel.querySelector("[data-newsletter-status]").textContent = "";
}

function closeNewsletterPanel(remember = true) {
  if (!newsletterPanel) {
    return;
  }

  newsletterPanel.classList.remove("is-visible");
  newsletterPanel.setAttribute("aria-hidden", "true");

  if (remember) {
    newsletterStorageSet(NEWSLETTER_DISMISSED_KEY, "yes");
  }
}

function showNewsletterPanel() {
  if (
    newsletterShown ||
    newsletterStorageGet(NEWSLETTER_DISMISSED_KEY) ||
    newsletterStorageGet(NEWSLETTER_SUBSCRIBED_KEY)
  ) {
    return;
  }

  newsletterShown = true;
  buildNewsletterPanel();
  window.setTimeout(() => {
    newsletterPanel.classList.add("is-visible");
    newsletterPanel.setAttribute("aria-hidden", "false");
  }, 650);
}

function buildNewsletterPanel() {
  if (newsletterPanel) {
    return;
  }

  newsletterPanel = document.createElement("section");
  newsletterPanel.className = "newsletter-popover";
  newsletterPanel.setAttribute("aria-hidden", "true");
  newsletterPanel.innerHTML = `
    <button class="newsletter-close" type="button" data-newsletter-close aria-label="${newsletterT("newsletterClose")}"></button>
    <form class="newsletter-form" data-newsletter-form>
      <h2 data-newsletter-title>${newsletterT("newsletterTitle")}</h2>
      <p data-newsletter-copy>${newsletterT("newsletterCopy")}</p>
      <label>
        <span class="sr-only">${newsletterT("newsletterEmailLabel")}</span>
        <input data-newsletter-email name="email" type="email" autocomplete="email" required placeholder="${newsletterT("newsletterPlaceholder")}" />
      </label>
      <button type="submit" data-newsletter-submit>${newsletterT("newsletterSubmit")}</button>
      <p class="newsletter-status" data-newsletter-status aria-live="polite"></p>
    </form>
  `;

  document.body.appendChild(newsletterPanel);

  newsletterPanel.querySelector("[data-newsletter-close]").addEventListener("click", () => closeNewsletterPanel(true));
  newsletterPanel.querySelector("[data-newsletter-form]").addEventListener("submit", submitNewsletterForm);
}

async function submitNewsletterForm(event) {
  event.preventDefault();

  const form = event.currentTarget;
  const status = newsletterPanel.querySelector("[data-newsletter-status]");
  const submitButton = newsletterPanel.querySelector("[data-newsletter-submit]");
  const email = form.email.value.trim();

  if (!email) {
    return;
  }

  submitButton.disabled = true;
  status.textContent = newsletterT("newsletterSending");

  try {
    if (NEWSLETTER_ENDPOINT) {
      const formData = new FormData();
      formData.set("type", "newsletter");
      formData.set("email", email);
      formData.set("submittedAt", new Date().toISOString());
      formData.set("source", "Maelstrom newsletter popup");

      await fetch(NEWSLETTER_ENDPOINT, {
        method: "POST",
        mode: "no-cors",
        body: formData,
      });
    }

    newsletterStorageSet(NEWSLETTER_SUBSCRIBED_KEY, "yes");
    status.textContent = NEWSLETTER_ENDPOINT ? newsletterT("newsletterSaved") : newsletterT("newsletterSavedLocal");
    window.setTimeout(() => closeNewsletterPanel(false), 1000);
  } catch {
    status.textContent = newsletterT("newsletterError");
  } finally {
    submitButton.disabled = false;
  }
}

function setupNewsletterPrompt() {
  const path = window.location.pathname.toLowerCase();
  if (path.includes("/qr/") || document.body.classList.contains("tasting-body")) {
    return;
  }

  if (document.body.classList.contains("site-open")) {
    showNewsletterPanel();
    return;
  }

  const observer = new MutationObserver(() => {
    if (document.body.classList.contains("site-open")) {
      observer.disconnect();
      showNewsletterPanel();
    }
  });

  observer.observe(document.body, { attributes: true, attributeFilter: ["class"] });
}

document.addEventListener("DOMContentLoaded", setupNewsletterPrompt);
window.addEventListener("maelstrom:languagechange", updateNewsletterText);
