const logbookButton = document.querySelector("[data-logbook-next]");
const logbookStatus = document.querySelector("[data-logbook-status]");
const logbookSheet = document.querySelector("[data-logbook-sheet]");
const LOGBOOK_PAGE_COUNT = 6;
const LOGBOOK_PAGE_POSITIONS = [
  ["50%", "50%"],
  ["48%", "47%"],
  ["52%", "51%"],
  ["46%", "54%"],
  ["54%", "49%"],
  ["50%", "56%"],
];
let logbookPage = 1;

function updateLogbookStatus() {
  if (logbookStatus) {
    logbookStatus.textContent = `Page ${logbookPage}`;
  }

  if (logbookSheet) {
    const [x, y] = LOGBOOK_PAGE_POSITIONS[logbookPage - 1] || LOGBOOK_PAGE_POSITIONS[0];
    logbookSheet.style.setProperty("--logbook-page-x", x);
    logbookSheet.style.setProperty("--logbook-page-y", y);
  }
}

logbookButton?.addEventListener("click", () => {
  logbookPage = logbookPage >= LOGBOOK_PAGE_COUNT ? 1 : logbookPage + 1;
  updateLogbookStatus();
});

updateLogbookStatus();
