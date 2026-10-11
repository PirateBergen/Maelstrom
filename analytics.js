(() => {
  const endpoint = window.MAELSTROM_RESERVATION_ENDPOINT;
  if (!endpoint || /[?&]admin(?:=|&|$)/i.test(window.location.search)) return;

  const path = window.location.pathname.replace(/\/+$/, "") || "/";
  const sessionKey = `maelstrom-audience:${path}`;
  try {
    if (sessionStorage.getItem(sessionKey)) return;
    sessionStorage.setItem(sessionKey, "1");
  } catch {
    // A blocked storage API should not prevent an anonymous page count.
  }

  const hostname = document.referrer ? new URL(document.referrer).hostname : "";
  const referrer = !hostname
    ? "direct"
    : hostname === window.location.hostname
      ? "internal"
      : /google|bing|duckduckgo|yahoo/i.test(hostname)
        ? "search"
        : /instagram|facebook|tiktok/i.test(hostname)
          ? "social"
          : "external";

  const data = new FormData();
  data.append("type", "analytics");
  data.append("path", path === "" ? "/" : path);
  data.append("language", document.documentElement.lang || "no");
  data.append("device", window.innerWidth < 721 ? "mobile" : window.innerWidth < 1101 ? "tablet" : "desktop");
  data.append("referrer", referrer);

  if (navigator.sendBeacon) {
    navigator.sendBeacon(endpoint, data);
  } else {
    fetch(endpoint, { method: "POST", body: data, mode: "no-cors", keepalive: true }).catch(() => {});
  }
})();
