(() => {
  const PREVIEW_ACCESS_DATE = new Date("2026-09-20T00:00:00+02:00");
  const OPENING_DATE = new Date("2026-09-23T00:00:00+02:00");

  function phase(now = new Date()) {
    const timestamp = now instanceof Date ? now.getTime() : Number(now);
    if (timestamp >= OPENING_DATE.getTime()) return "open";
    if (timestamp >= PREVIEW_ACCESS_DATE.getTime()) return "preview";
    return "closed";
  }

  window.MaelstromLaunchSchedule = { PREVIEW_ACCESS_DATE, OPENING_DATE, phase };
})();
