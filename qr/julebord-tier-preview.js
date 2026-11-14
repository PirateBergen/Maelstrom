(() => {
  const isPreview = new URLSearchParams(window.location.search).get("julebordPreview") === "1";
  const config = window.MAELSTROM_JULEBORD_TIER;
  const currentBoard = document.querySelector(".tasting-board");
  const shell = document.querySelector(".tasting-shell");
  if (!isPreview || !config || !currentBoard || !shell) return;

  currentBoard.hidden = true;
  currentBoard.id = "chapterOnePodium";

  const tiers = ["S", "A", "B", "C", "D"];
  const preview = document.createElement("section");
  preview.className = "julebord-tier-preview";
  preview.innerHTML = `
    <section class="tier-chapter-section tier-chapter-two">
      <div class="tier-chapter-heading"><span>Chapter II</span><h2>Julebord</h2><p>The new signature ranking</p></div>
      <div class="tasting-board julebord-new-ranking">
      <div class="julebord-ranking-heading"><h3>Julebord Signature Tier List</h3><span>Four new signatures</span></div>
      <div class="julebord-cocktail-pool">${config.cocktails.map((cocktail) => `<span>${cocktail.name}</span>`).join("")}</div>
      <div class="results-tier-board julebord-empty-board">${tiers.map((tier) => `<div class="tier-row results-tier-row" data-tier="${tier}"><div class="tier-label">${tier}</div><div class="tier-items"><span class="empty-tier">Awaiting your ranking</span></div></div>`).join("")}</div>
      <a class="primary-link julebord-vote-preview-link" href="tasting.html?julebordPreview=1">Preview the new voting board</a>
      </div>
    </section>
    <section class="tier-chapter-section tier-chapter-one">
      <div class="tier-chapter-heading"><span>Chapter I</span><h2>The First Voyage</h2><p>Previous signature ranking archive</p></div>
      <button class="tier-archive-button" type="button" aria-expanded="false" aria-controls="chapterOnePodium">
        <img src="../assets/up-is-down-vote.webp" alt="" />
        <span><strong>Open Chapter I Podium</strong><small>Consult the complete previous ranking</small></span>
      </button>
      <div class="tier-chapter-one-content"></div>
    </section>`;
  const title = document.querySelector(".tier-results-title");
  const intro = document.querySelector(".tasting-hero-content > p");
  if (title) title.innerHTML = "<span>Julebord Tier List</span><span>Preview</span>";
  if (intro) intro.textContent = "The previous chapter remains available as a separate podium, while four new signatures begin a fresh ranking.";
  shell.insertBefore(preview, currentBoard);
  preview.querySelector(".tier-chapter-one-content").appendChild(currentBoard);

  const button = preview.querySelector(".tier-archive-button");
  button.addEventListener("click", () => {
    const willOpen = currentBoard.hidden;
    currentBoard.hidden = !willOpen;
    button.setAttribute("aria-expanded", String(willOpen));
    if (willOpen) currentBoard.scrollIntoView({ behavior: "smooth", block: "start" });
  });
})();
