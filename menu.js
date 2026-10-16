(() => {
  document.querySelectorAll("[data-expires-at]").forEach((item) => {
    const expiresAt = Date.parse(item.dataset.expiresAt || "");
    if (Number.isFinite(expiresAt) && Date.now() >= expiresAt) {
      item.hidden = true;
    }
  });

  const links = document.querySelectorAll("a.logbook-entry-icon");
  const videoLinks = document.querySelectorAll(".signature-video-link");
  const menuPhotos = document.querySelectorAll("[data-menu-photo]");
  const tastingPhotoLightbox = document.querySelector(".tasting-photo-lightbox");
  const lightboxFrame = tastingPhotoLightbox?.querySelector(".lightbox-frame");
  const lightboxImage = lightboxFrame?.querySelector("img");
  const lightboxFrameOverlay = lightboxFrame?.querySelector(".lightbox-frame-overlay");
  const halloweenVideoButton = document.querySelector("[data-halloween-video-open]");
  const halloweenVideoLightbox = document.querySelector(".halloween-video-lightbox");
  const halloweenVideo = halloweenVideoLightbox?.querySelector("video");
  let previousPhotoFocus = null;
  let previousVideoFocus = null;

  const openTastingPhoto = (photo) => {
    const sourceImage = photo?.querySelector("img");
    if (!tastingPhotoLightbox || !lightboxFrame || !lightboxImage || !lightboxFrameOverlay || !sourceImage) return;
    const frameClasses = String(photo.dataset.lightboxFrame || "frame-dark-wood").split(/\s+/).filter(Boolean);
    lightboxFrame.className = ["photo-placeholder", "lightbox-frame", ...frameClasses].join(" ");
    lightboxImage.src = sourceImage.currentSrc || sourceImage.src;
    lightboxImage.alt = sourceImage.alt;
    lightboxFrameOverlay.src = photo.dataset.lightboxFrameSrc || "assets/frame-dark-wood.webp";
    previousPhotoFocus = photo;
    tastingPhotoLightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    tastingPhotoLightbox.querySelector(".lightbox-close")?.focus();
  };

  const closeTastingPhoto = () => {
    if (!tastingPhotoLightbox || tastingPhotoLightbox.hidden) return;
    tastingPhotoLightbox.hidden = true;
    document.body.classList.remove("lightbox-open");
    previousPhotoFocus?.focus();
    previousPhotoFocus = null;
  };

  const openHalloweenVideo = () => {
    if (!halloweenVideoLightbox || !halloweenVideo) return;
    previousVideoFocus = document.activeElement;
    halloweenVideoButton?.classList.add("is-opening");
    window.setTimeout(() => {
      halloweenVideoLightbox.hidden = false;
      document.body.classList.add("lightbox-open");
      halloweenVideoLightbox.querySelector(".lightbox-close")?.focus();
      halloweenVideoButton?.classList.remove("is-opening");
    }, 420);
  };

  const closeHalloweenVideo = () => {
    if (!halloweenVideoLightbox || halloweenVideoLightbox.hidden) return;
    halloweenVideo.pause();
    if (halloweenVideo.readyState > 0) halloweenVideo.currentTime = 0;
    halloweenVideoLightbox.hidden = true;
    document.body.classList.remove("lightbox-open");
    previousVideoFocus?.focus?.();
    previousVideoFocus = null;
  };

  menuPhotos.forEach((photo) => {
    photo.addEventListener("click", () => openTastingPhoto(photo));
    photo.addEventListener("keydown", (event) => {
      if (event.key === "Enter" || event.key === " ") {
        event.preventDefault();
        openTastingPhoto(photo);
      }
    });
  });

  tastingPhotoLightbox?.addEventListener("click", closeTastingPhoto);
  halloweenVideoButton?.addEventListener("click", openHalloweenVideo);
  halloweenVideoLightbox?.addEventListener("click", (event) => {
    if (event.target === halloweenVideoLightbox || event.target.closest(".lightbox-close")) {
      closeHalloweenVideo();
    }
  });
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") {
      closeTastingPhoto();
      closeHalloweenVideo();
    }
  });

  videoLinks.forEach((link) => {
    const videoUrl = String(link.dataset.videoUrl || "").trim();
    if (!videoUrl) {
      return;
    }

    try {
      const url = new URL(videoUrl, window.location.href);
      if (url.protocol !== "https:") {
        return;
      }

      link.href = url.href;
      link.hidden = false;
    } catch (_error) {
      // Keep the button hidden until a valid video URL is supplied.
    }
  });

  links.forEach((link) => {
    link.addEventListener("click", (event) => {
      if (event.defaultPrevented || event.button !== 0 || event.metaKey || event.ctrlKey || event.shiftKey || event.altKey) {
        return;
      }

      event.preventDefault();
      if (link.classList.contains("is-opening")) {
        return;
      }

      link.classList.add("is-opening");
      window.setTimeout(() => {
        window.location.assign(link.href);
      }, 560);
    });
  });
})();
