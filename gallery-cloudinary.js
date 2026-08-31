(() => {
  const CLOUD_NAME = "yfquewjr";
  const GALLERY_TAG = "maelstrom-gallery";
  const listUrl = `https://res.cloudinary.com/${CLOUD_NAME}/image/list/${GALLERY_TAG}.json`;
  const gallery = document.querySelector("#cloudinaryGallery");
  const status = document.querySelector("#galleryLoadStatus");
  const lightbox = document.querySelector("#galleryLightbox");
  const lightboxImage = document.querySelector("#galleryLightboxImage");
  const lightboxClose = lightbox?.querySelector(".gallery-lightbox-close");

  if (!gallery) return;

  const t = (key) => window.MaelstromI18n?.t(key) || key;
  const encodePublicId = (publicId) => publicId.split("/").map(encodeURIComponent).join("/");
  const imageUrl = (resource) => {
    const version = resource.version ? `v${resource.version}/` : "";
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_fill,g_auto,w_1000,h_1000/${version}${encodePublicId(resource.public_id)}.${resource.format}`;
  };
  const fullImageUrl = (resource) => {
    const version = resource.version ? `v${resource.version}/` : "";
    return `https://res.cloudinary.com/${CLOUD_NAME}/image/upload/f_auto,q_auto,c_limit,w_1800/${version}${encodePublicId(resource.public_id)}.${resource.format}`;
  };

  const openLightbox = (resource) => {
    if (!lightbox || !lightboxImage) return;
    lightboxImage.src = fullImageUrl(resource);
    lightboxImage.alt = t("guestGalleryPhotoAlt");
    lightbox.showModal();
  };

  lightboxClose?.addEventListener("click", () => lightbox.close());
  lightbox?.addEventListener("click", (event) => {
    if (event.target === lightbox) lightbox.close();
  });
  lightbox?.addEventListener("close", () => {
    if (lightboxImage) lightboxImage.removeAttribute("src");
  });

  const render = (resources) => {
    if (!resources.length) {
      if (status) status.textContent = t("galleryAwaitingPhotos");
      return;
    }

    gallery.innerHTML = "";
    resources
      .slice()
      .sort((a, b) => String(b.created_at || "").localeCompare(String(a.created_at || "")))
      .forEach((resource, index) => {
        const figure = document.createElement("figure");
        figure.className = "simple-photo cloudinary-photo";
        if (index % 7 === 0) figure.classList.add("simple-photo-large");
        else if (index % 5 === 0) figure.classList.add("simple-photo-wide");
        else if (index % 4 === 0) figure.classList.add("simple-photo-tall");

        const image = document.createElement("img");
        image.src = imageUrl(resource);
        image.alt = t("guestGalleryPhotoAlt");
        image.loading = index < 3 ? "eager" : "lazy";
        image.decoding = "async";
        const zoomButton = document.createElement("button");
        zoomButton.type = "button";
        zoomButton.setAttribute("aria-label", t("expandedPhoto"));
        zoomButton.addEventListener("click", () => openLightbox(resource));
        zoomButton.append(image);
        figure.append(zoomButton);
        gallery.append(figure);
      });

    if (status) status.textContent = "";
  };

  fetch(listUrl, { mode: "cors" })
    .then((response) => {
      if (response.status === 404) return { resources: [] };
      if (!response.ok) throw new Error(`Cloudinary list ${response.status}`);
      return response.json();
    })
    .then((data) => render(Array.isArray(data.resources) ? data.resources : []))
    .catch(() => {
      if (status) status.textContent = t("galleryTemporarilyUnavailable");
    });
})();
