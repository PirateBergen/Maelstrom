(() => {
  const configured = window.MAELSTROM_ADMIN_URL;
  if (typeof configured !== "string" || !configured) return;
  try {
    const url = new URL(configured);
    if (url.origin !== "https://script.google.com" || url.username || url.password ||
        !/^\/macros\/s\/[A-Za-z0-9_-]+\/exec$/.test(url.pathname)) return;
    url.search = "?action=admin";
    url.hash = "";
    document.getElementById("adminOpen").href = url.href;
    document.getElementById("adminOpen").hidden = false;
    document.getElementById("adminSetup").hidden = true;
  } catch (_) { /* Remain disconnected if configuration is not a valid Google deployment. */ }
})();
