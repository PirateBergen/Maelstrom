(() => {
  const CLOUD_NAME = "yfquewjr";
  const UPLOAD_PRESET = "maelstrom_gallery_upload";
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const form = document.querySelector("#galleryUploadForm");
  const input = document.querySelector("#galleryPhoto");
  const preview = document.querySelector("#galleryUploadPreview");
  const previewImage = document.querySelector("#galleryPreviewImage");
  const button = document.querySelector("#galleryUploadButton");
  const status = document.querySelector("#galleryUploadStatus");
  let previewUrl = "";

  if (!form || !input || !button || !status) return;

  const t = (key) => window.MaelstromI18n?.t(key) || key;
  const setStatus = (key, type = "") => {
    status.textContent = t(key);
    status.className = `gallery-upload-status ${type}`.trim();
  };

  const validate = (file) => {
    if (!file || !ALLOWED_TYPES.has(file.type)) return "galleryUploadInvalidType";
    if (file.size > MAX_FILE_SIZE) return "galleryUploadTooLarge";
    return "";
  };

  input.addEventListener("change", () => {
    const file = input.files?.[0];
    const error = validate(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    preview.hidden = true;

    if (error) {
      setStatus(error, "is-error");
      input.value = "";
      return;
    }

    previewUrl = URL.createObjectURL(file);
    previewImage.src = previewUrl;
    preview.hidden = false;
    status.textContent = "";
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = input.files?.[0];
    const error = validate(file);
    if (error) {
      setStatus(error, "is-error");
      return;
    }

    button.disabled = true;
    setStatus("galleryUploadSending");
    const payload = new FormData();
    payload.append("file", file);
    payload.append("upload_preset", UPLOAD_PRESET);

    try {
      const response = await fetch(endpoint, { method: "POST", body: payload });
      if (!response.ok) throw new Error(`Cloudinary upload ${response.status}`);
      form.reset();
      preview.hidden = true;
      setStatus("galleryUploadSuccess", "is-success");
    } catch {
      setStatus("galleryUploadError", "is-error");
      button.disabled = false;
    }
  });
})();
