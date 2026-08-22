const logbookButton = document.querySelector("[data-logbook-next]");
const logbookTurnPage = document.querySelector("[data-logbook-turn-page]");
const logbookStatus = document.querySelector("[data-logbook-status]");
const LOGBOOK_PAGE_COUNT = 6;
let logbookPage = 1;

function updateLogbookStatus() {
  if (logbookStatus) {
    logbookStatus.textContent = `Page ${logbookPage}`;
  }
}

logbookButton?.addEventListener("click", () => {
  if (!logbookTurnPage || logbookTurnPage.classList.contains("is-turning")) {
    return;
  }

  logbookTurnPage.classList.add("is-turning");
  logbookButton.disabled = true;

  window.setTimeout(() => {
    logbookPage = logbookPage >= LOGBOOK_PAGE_COUNT ? 1 : logbookPage + 1;
    updateLogbookStatus();
  }, 360);

  window.setTimeout(() => {
    logbookTurnPage.classList.remove("is-turning");
    logbookButton.disabled = false;
  }, 760);
});

updateLogbookStatus();
