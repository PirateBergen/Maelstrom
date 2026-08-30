(() => {
  const CLOUD_NAME = "yfquewjr";
  const UPLOAD_PRESET = "maelstrom_gallery_upload";
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const DAILY_UPLOAD_KEY = "maelstrom-gallery-upload-date-v1";
  const ALLOWED_TYPES = new Set(["image/jpeg", "image/png", "image/webp"]);
  const endpoint = `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`;
  const form = document.querySelector("#galleryUploadForm");
  const cameraInput = document.querySelector("#galleryCamera");
  const libraryInput = document.querySelector("#galleryLibrary");
  const preview = document.querySelector("#galleryUploadPreview");
  const previewImage = document.querySelector("#galleryPreviewImage");
  const button = document.querySelector("#galleryUploadButton");
  const status = document.querySelector("#galleryUploadStatus");
  const thanks = document.querySelector("#galleryUploadThanks");
  let previewUrl = "";
  let selectedFile = null;

  if (!form || !cameraInput || !libraryInput || !button || !status) return;

  const t = (key) => window.MaelstromI18n?.t(key) || key;
  const setStatus = (key, type = "") => {
    status.textContent = t(key);
    status.className = `gallery-upload-status ${type}`.trim();
  };

  const bergenDateKey = () => {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Oslo",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
    }).formatToParts(new Date());
    const values = Object.fromEntries(parts.map(({ type, value }) => [type, value]));
    return `${values.year}-${values.month}-${values.day}`;
  };

  const hasUploadedToday = () => {
    try {
      return localStorage.getItem(DAILY_UPLOAD_KEY) === bergenDateKey();
    } catch {
      return false;
    }
  };

  const markUploadedToday = () => {
    try {
      localStorage.setItem(DAILY_UPLOAD_KEY, bergenDateKey());
    } catch {
      // The upload remains valid if storage is unavailable.
    }
  };

  const lockDailyUpload = () => {
    cameraInput.disabled = true;
    libraryInput.disabled = true;
    button.disabled = true;
    form.classList.add("is-daily-locked");
    setStatus("galleryDailyLimit", "is-success");
  };

  const validate = (file) => {
    if (!file || !ALLOWED_TYPES.has(file.type)) return "galleryUploadInvalidType";
    if (file.size > MAX_FILE_SIZE) return "galleryUploadTooLarge";
    return "";
  };

  const selectFile = (input, otherInput) => {
    const file = input.files?.[0];
    const error = validate(file);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    previewUrl = "";
    preview.hidden = true;

    if (error) {
      setStatus(error, "is-error");
      input.value = "";
      selectedFile = null;
      return;
    }

    otherInput.value = "";
    selectedFile = file;
    previewUrl = URL.createObjectURL(file);
    previewImage.src = previewUrl;
    preview.hidden = false;
    status.textContent = "";
  };

  cameraInput.addEventListener("change", () => selectFile(cameraInput, libraryInput));
  libraryInput.addEventListener("change", () => selectFile(libraryInput, cameraInput));

  if (hasUploadedToday()) {
    lockDailyUpload();
  }

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    const file = selectedFile;
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
      markUploadedToday();
      form.reset();
      selectedFile = null;
      preview.hidden = true;
      if (thanks) {
        thanks.hidden = false;
        document.body.classList.add("gallery-upload-confirmed");
      } else {
        setStatus("galleryUploadSuccess", "is-success");
      }
    } catch {
      setStatus("galleryUploadError", "is-error");
      button.disabled = false;
    }
  });
})();
