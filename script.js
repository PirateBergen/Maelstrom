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
let carouselFrame = 0;
let carouselOffset = 0;
let carouselVelocity = 0;
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
    return;
  }

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

if (photoCarousel && photoTrack) {
  photoCarousel.addEventListener("mousemove", updateCarouselVelocity);
  photoCarousel.addEventListener("mouseleave", stopPhotoCarousel);
  window.addEventListener("resize", () => setCarouselOffset(carouselOffset));
}

if (isSitePreview || Date.now() >= OPENING_DATE.getTime()) {
  openFullSite();
} else {
  relicButton.addEventListener("click", revealCountdown);
  updateCountdown();
  setInterval(updateCountdown, 1000);
}
