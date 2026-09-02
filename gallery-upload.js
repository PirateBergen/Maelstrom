(() => {
  const CLOUD_NAME = "yfquewjr";
  const UPLOAD_PRESET = "maelstrom_gallery_upload";
  const MAX_FILE_SIZE = 10 * 1024 * 1024;
  const MAX_SOURCE_SIZE = 25 * 1024 * 1024;
  const MAX_IMAGE_EDGE = 2560;
  const DAILY_UPLOAD_KEY = "maelstrom-gallery-upload-date-v1";
  const DEVICE_ID_KEY = "maelstrom-gallery-device-v1";
  const SERVER_ENDPOINT = window.MAELSTROM_RESERVATION_ENDPOINT || "";
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
  const submissionReference = document.querySelector("#gallerySubmissionReference");
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

  const getDeviceId = () => {
    try {
      let value = localStorage.getItem(DEVICE_ID_KEY);
      if (!/^[a-f0-9]{32}$/i.test(value || "")) {
        value = Array.from(crypto.getRandomValues(new Uint8Array(16)), (byte) => byte.toString(16).padStart(2, "0")).join("");
        localStorage.setItem(DEVICE_ID_KEY, value);
      }
      return value;
    } catch {
      return "";
    }
  };

  const serverRequest = (action, device) => {
    if (!SERVER_ENDPOINT || !device) return Promise.resolve(null);
    return new Promise((resolve) => {
      const callback = `maelstromGallery${Date.now()}${Math.floor(Math.random() * 1000)}`;
      const script = document.createElement("script");
      const timer = setTimeout(() => cleanup(null), 8000);
      const cleanup = (result) => {
        clearTimeout(timer);
        delete window[callback];
        script.remove();
        resolve(result);
      };
      window[callback] = (payload) => cleanup(payload);
      script.onerror = () => cleanup(null);
      script.src = `${SERVER_ENDPOINT}?action=${encodeURIComponent(action)}&device=${encodeURIComponent(device)}&callback=${encodeURIComponent(callback)}&cache=${Date.now()}`;
      document.body.appendChild(script);
    });
  };

  const makeSubmissionId = () => {
    const random = Array.from(crypto.getRandomValues(new Uint8Array(3)), (byte) => byte.toString(16).padStart(2, "0")).join("").toUpperCase();
    return `MS-${bergenDateKey().replaceAll("-", "")}-${random}`;
  };

  const lockDailyUpload = () => {
    cameraInput.disabled = true;
    libraryInput.disabled = true;
    button.disabled = true;
    form.classList.add("is-daily-locked");
    setStatus("galleryDailyLimit", "is-success");
  };

  const validate = (file, maximumSize = MAX_FILE_SIZE) => {
    if (!file || !ALLOWED_TYPES.has(file.type)) return "galleryUploadInvalidType";
    if (file.size > maximumSize) return "galleryUploadTooLarge";
    return "";
  };

  const compressPhoto = async (file) => {
    const bitmap = await createImageBitmap(file, { imageOrientation: "from-image" });
    const scale = Math.min(1, MAX_IMAGE_EDGE / Math.max(bitmap.width, bitmap.height));
    const canvas = document.createElement("canvas");
    canvas.width = Math.max(1, Math.round(bitmap.width * scale));
    canvas.height = Math.max(1, Math.round(bitmap.height * scale));
    const context = canvas.getContext("2d", { alpha: false });
    context.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
    bitmap.close?.();
    const blob = await new Promise((resolve, reject) => {
      canvas.toBlob((result) => result ? resolve(result) : reject(new Error("Image compression failed")), "image/jpeg", 0.86);
    });
    return new File([blob], "maelstrom-photo.jpg", { type: "image/jpeg", lastModified: Date.now() });
  };

  const selectFile = async (input, otherInput) => {
    const file = input.files?.[0];
    const error = validate(file, MAX_SOURCE_SIZE);
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
    button.disabled = true;
    setStatus("galleryUploadOptimizing");
    try {
      selectedFile = await compressPhoto(file);
    } catch {
      selectedFile = file;
    }
    const compressedError = validate(selectedFile);
    if (compressedError) {
      setStatus(compressedError, "is-error");
      input.value = "";
      selectedFile = null;
      button.disabled = false;
      return;
    }
    previewUrl = URL.createObjectURL(selectedFile);
    previewImage.src = previewUrl;
    preview.hidden = false;
    status.textContent = "";
    button.disabled = false;
  };

  cameraInput.addEventListener("change", () => void selectFile(cameraInput, libraryInput));
  libraryInput.addEventListener("change", () => void selectFile(libraryInput, cameraInput));

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
    const deviceId = getDeviceId();
    const claim = await serverRequest("galleryUploadClaim", deviceId);
    if (claim && claim.allowed === false) {
      lockDailyUpload();
      return;
    }
    const submissionId = makeSubmissionId();
    const payload = new FormData();
    payload.append("file", new File([file], `maelstrom-${submissionId}.jpg`, { type: "image/jpeg", lastModified: Date.now() }));
    payload.append("upload_preset", UPLOAD_PRESET);
    payload.append("context", `submission_id=${submissionId}|submitted_on=${bergenDateKey()}`);

    try {
      const response = await fetch(endpoint, { method: "POST", body: payload });
      if (!response.ok) throw new Error(`Cloudinary upload ${response.status}`);
      markUploadedToday();
      form.reset();
      selectedFile = null;
      preview.hidden = true;
      if (thanks) {
        if (submissionReference) {
          submissionReference.textContent = `${t("galleryReferenceLabel")}: ${submissionId}`;
          submissionReference.hidden = false;
        }
        thanks.hidden = false;
        document.body.classList.add("gallery-upload-confirmed");
      } else {
        setStatus("galleryUploadSuccess", "is-success");
      }
    } catch {
      if (claim?.allowed === true) void serverRequest("galleryUploadRelease", deviceId);
      setStatus("galleryUploadError", "is-error");
      button.disabled = false;
    }
  });
})();
