(() => {
  const links = document.querySelectorAll(".logbook-entry-icon");
  const videoLinks = document.querySelectorAll(".signature-video-link");
  const tastingPhoto = document.querySelector(".signature-tasting-photo");
  const tastingPhotoLightbox = document.querySelector(".tasting-photo-lightbox");

  const openTastingPhoto = () => {
    if (!tastingPhotoLightbox) return;
    tastingPhotoLightbox.hidden = false;
    document.body.classList.add("lightbox-open");
    tastingPhotoLightbox.querySelector(".lightbox-close")?.focus();
  };

  const closeTastingPhoto = () => {
    if (!tastingPhotoLightbox || tastingPhotoLightbox.hidden) return;
    tastingPhotoLightbox.hidden = true;
    document.body.classList.remove("lightbox-open");
    tastingPhoto?.focus();
  };

  tastingPhoto?.addEventListener("click", openTastingPhoto);
  tastingPhoto?.addEventListener("keydown", (event) => {
    if (event.key === "Enter" || event.key === " ") {
      event.preventDefault();
      openTastingPhoto();
    }
  });

  tastingPhotoLightbox?.addEventListener("click", closeTastingPhoto);
  document.addEventListener("keydown", (event) => {
    if (event.key === "Escape") closeTastingPhoto();
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
