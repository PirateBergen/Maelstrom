const OPENING_DATE = new Date("2026-09-15T19:00:00+02:00");

const gate = document.querySelector(".gate");
const relicButton = document.querySelector(".map-disc-button");
const countdown = document.querySelector(".countdown");
const fullSite = document.querySelector(".full-site");
const previewParams = new URLSearchParams(window.location.search);
const isSitePreview = previewParams.get("preview") === "site";
const sequenceTimers = [];
const photoCarousel = document.querySelector(".photo-carousel");
const photoTrack = document.querySelector(".photo-track");
const carouselPrevious = document.querySelector(".carousel-cue-left");
const carouselNext = document.querySelector(".carousel-cue-right");
const photoLightbox = document.querySelector(".photo-lightbox");
const lightboxFrame = document.querySelector(".lightbox-frame");
const lightboxClose = document.querySelector(".lightbox-close");
let carouselFrame = 0;
let carouselOffset = 0;
let carouselVelocity = 0;
let lightboxHistoryEntry = false;
let lightboxPreviousFocus = null;
const units = {
  days: document.querySelector('[data-unit="days"]'),
  hours: document.querySelector('[data-unit="hours"]'),
  minutes: document.querySelector('[data-unit="minutes"]'),
  seconds: document.querySelector('[data-unit="seconds"]'),
};

function pad(value, size = 2) {
  return String(value).padStart(size, "0");
}

function updateCountdown() {
  const now = new Date();
  const remaining = Math.max(0, OPENING_DATE.getTime() - now.getTime());

  if (remaining === 0) {
    openFullSite();
    return;
  }

  const totalSeconds = Math.floor(remaining / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  units.days.textContent = pad(days, 3);
  units.hours.textContent = pad(hours);
  units.minutes.textContent = pad(minutes);
  units.seconds.textContent = pad(seconds);

  countdown.setAttribute(
    "aria-label",
    `Countdown before opening night: ${days} days, ${hours} hours, ${minutes} minutes, and ${seconds} seconds.`
  );
}

function openFullSite() {
  gate.setAttribute("aria-hidden", "true");
  fullSite.hidden = false;
  document.body.classList.add("site-open");
}

function revealCountdown() {
  if (gate.classList.contains("flipped")) {
    return;
  }

  gate.classList.add("flipped");
  relicButton.disabled = true;
  relicButton.setAttribute("aria-expanded", "true");

  sequenceTimers.push(
    setTimeout(() => {
      gate.classList.add("spinning");
    }, 2100)
  );

  sequenceTimers.push(
    setTimeout(() => {
      gate.classList.add("revealed");
      countdown.setAttribute("aria-hidden", "false");
    }, 4300)
  );
}

function setCarouselOffset(value) {
  if (!photoTrack) {
    return;
  }

  const maxOffset = Math.max(0, photoTrack.scrollWidth - photoCarousel.clientWidth);
  carouselOffset = Math.min(Math.max(value, -maxOffset), 0);
  photoTrack.style.setProperty("--carousel-offset", `${carouselOffset}px`);
}

function movePhotoCarousel() {
  if (!photoTrack || carouselVelocity === 0) {
    carouselFrame = 0;
    photoCarousel?.classList.remove("is-gliding");
    return;
  }

  photoCarousel.classList.add("is-gliding");
  setCarouselOffset(carouselOffset + carouselVelocity);
  carouselFrame = requestAnimationFrame(movePhotoCarousel);
}

function updateCarouselVelocity(event) {
  const rect = photoCarousel.getBoundingClientRect();
  const pointer = (event.clientX - rect.left) / rect.width;
  const deadZone = 0.18;
  const maxSpeed = 7;

  if (pointer < 0.5 - deadZone) {
    carouselVelocity = (0.5 - deadZone - pointer) * maxSpeed;
  } else if (pointer > 0.5 + deadZone) {
    carouselVelocity = -((pointer - 0.5 - deadZone) * maxSpeed);
  } else {
    carouselVelocity = 0;
  }

  if (carouselVelocity !== 0 && carouselFrame === 0) {
    carouselFrame = requestAnimationFrame(movePhotoCarousel);
  }
}

function stopPhotoCarousel() {
  carouselVelocity = 0;
}

function getCarouselStep() {
  return photoCarousel.clientWidth * 0.78;
}

function jumpPhotoCarousel(direction) {
  carouselVelocity = 0;
  photoCarousel.classList.remove("is-gliding");
  setCarouselOffset(carouselOffset + direction * getCarouselStep());
}

function setLightboxContent(sourceFrame) {
  const frameClasses = Array.from(sourceFrame.classList).filter((className) =>
    className.startsWith("frame-") || className === "landscape"
  );
  const sourceImage = sourceFrame.querySelector("img");
  const sourceLabel = sourceFrame.querySelector("span")?.textContent || "Photo";
  const label = document.createElement("span");

  lightboxFrame.className = ["photo-placeholder", "lightbox-frame", ...frameClasses].join(" ");
  lightboxFrame.textContent = "";

  if (sourceImage) {
    lightboxFrame.appendChild(sourceImage.cloneNode(true));
  }

  label.textContent = sourceLabel;
  lightboxFrame.appendChild(label);
}

function hideLightbox() {
  photoLightbox.hidden = true;
  document.body.classList.remove("lightbox-open");
  lightboxHistoryEntry = false;
  lightboxPreviousFocus?.focus?.();
  lightboxPreviousFocus = null;
}

function closeLightbox(fromHistory = false) {
  if (!photoLightbox || photoLightbox.hidden) {
    return;
  }

  if (lightboxHistoryEntry && !fromHistory) {
    history.back();
    return;
  }

  hideLightbox();
}

function openLightbox(sourceFrame) {
  if (!photoLightbox || !lightboxFrame) {
    return;
  }

  stopPhotoCarousel();
  setLightboxContent(sourceFrame);
  lightboxPreviousFocus = document.activeElement;
  photoLightbox.hidden = false;
  document.body.classList.add("lightbox-open");
  lightboxClose?.focus();

  if (!lightboxHistoryEntry) {
    history.pushState({ maelstromLightbox: true }, "", window.location.href);
    lightboxHistoryEntry = true;
  }
}

if (photoCarousel && photoTrack) {
  photoCarousel.addEventListener("mousemove", updateCarouselVelocity);
  photoCarousel.addEventListener("mouseleave", stopPhotoCarousel);
  carouselPrevious?.addEventListener("click", () => jumpPhotoCarousel(1));
  carouselNext?.addEventListener("click", () => jumpPhotoCarousel(-1));
  window.addEventListener("resize", () => setCarouselOffset(carouselOffset));

  photoTrack.querySelectorAll(".photo-placeholder").forEach((frame) => {
    frame.setAttribute("role", "button");
    frame.setAttribute("tabindex", frame.hasAttribute("aria-hidden") ? "-1" : "0");
    frame.setAttribute("aria-label", `Open ${frame.querySelector("span")?.textContent || "photo"}`);
  });

  photoTrack.addEventListener("click", (event) => {
    const frame = event.target.closest(".photo-placeholder");

    if (frame) {
      openLightbox(frame);
    }
  });

  photoTrack.addEventListener("keydown", (event) => {
    const frame = event.target.closest(".photo-placeholder");

    if (!frame || (event.key !== "Enter" && event.key !== " ")) {
      return;
    }

    event.preventDefault();
    openLightbox(frame);
  });
}

lightboxClose?.addEventListener("click", () => closeLightbox());

photoLightbox?.addEventListener("click", (event) => {
  if (event.target === photoLightbox) {
    closeLightbox();
  }
});

window.addEventListener("keydown", (event) => {
  if (event.key === "Escape") {
    closeLightbox();
  }
});

window.addEventListener("popstate", () => {
  if (photoLightbox && !photoLightbox.hidden) {
    closeLightbox(true);
  }
});

if (isSitePreview || Date.now() >= OPENING_DATE.getTime()) {
  openFullSite();
} else {
  relicButton.addEventListener("click", revealCountdown);
  updateCountdown();
  setInterval(updateCountdown, 1000);
}
